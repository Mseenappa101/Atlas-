// Retry script — re-scrapes firms that failed with invalid_json errors.
// Appends results to scripts/output/firms.json without overwriting existing records.
// Usage: node scripts/retry.js

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const FIRMS_PATH = join(OUTPUT_DIR, 'firms.json');
const ERRORS_PATH = join(OUTPUT_DIR, 'errors.json');

const client = new Anthropic({ apiKey: process.env.VITE_ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a data extraction assistant. Return ONLY a raw JSON object. Do NOT use markdown code fences. Do NOT wrap the response in backticks. Start your response with { and end with }. No text before or after the JSON.`;

function getUserPrompt(pageText) {
  return `Extract the following from this law firm careers page and return as JSON with exactly these keys: has_1l_program (boolean, true if any 1L summer associate or 1L summer program exists), has_fellowship (boolean, true if any named 1L diversity fellowship exists), fellowship_name (string or null), office_locations (array of city strings where they are hiring), app_window (string or null), app_window_start (string or null in ISO date format), app_window_end (string or null in ISO date format), apply_url (string or null), practice_areas (array of strings), firm_size (string or null), notes (string or null). Page text: ${pageText}`;
}

function loadExisting(path) {
  if (existsSync(path)) {
    try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return []; }
  }
  return [];
}

function saveJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

// Build RETRY_FIRMS from the main FIRMS_TO_SCRAPE array, matching against error names
async function main() {
  const errors = loadExisting(ERRORS_PATH);
  const failedNames = new Set(errors.map(e => e.firm));

  // Dynamically import the full firms list from scraper.js is complex,
  // so we'll read the scraper file and extract the array via a different approach:
  // Match failed firm names against the full scraper list by reading and eval-ing just the array.
  // Instead, let's just read the scraper source and extract firms.
  const scraperSrc = readFileSync(join(__dirname, 'scraper.js'), 'utf-8');
  const arrayMatch = scraperSrc.match(/const FIRMS_TO_SCRAPE = \[([\s\S]*?)\];/);
  if (!arrayMatch) {
    console.error('Could not extract FIRMS_TO_SCRAPE from scraper.js');
    process.exit(1);
  }
  // Evaluate the array content safely
  const allFirms = eval(`[${arrayMatch[1]}]`);
  const RETRY_FIRMS = allFirms.filter(f => failedNames.has(f.name));

  console.log(`\nRetrying ${RETRY_FIRMS.length} firms (from ${errors.length} errors)...\n`);

  const browser = await chromium.launch({ headless: true });
  const results = loadExisting(FIRMS_PATH);
  const newErrors = [];
  let succeeded = 0;
  let failed = 0;

  for (const firm of RETRY_FIRMS) {
    const page = await browser.newPage();
    try {
      await page.goto(firm.careers_url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const pageText = await page.evaluate(() => document.body.innerText);

      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: getUserPrompt(pageText) }],
      });

      const rawText = response.content[0].text;
      const cleaned = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      results.push({
        name: firm.name,
        state: firm.state,
        city: firm.city,
        careers_url: firm.careers_url,
        scraped_at: new Date().toISOString(),
        ...parsed,
      });
      succeeded++;
      console.log(`  \u2713 ${firm.name}`);
    } catch (error) {
      const reason =
        error.name === 'TimeoutError' ? 'timeout' :
        error instanceof SyntaxError ? 'invalid_json' :
        error.message?.includes('net::') ? 'navigation_failed' :
        error.message || 'unknown';
      failed++;
      console.log(`  \u2717 ${firm.name} — ${reason}`);
      newErrors.push({ firm: firm.name, reason, timestamp: new Date().toISOString() });
    } finally {
      await page.close();
    }

    saveJson(FIRMS_PATH, results);
    await new Promise(r => setTimeout(r, 2000));
  }

  await browser.close();

  // Overwrite errors.json with only the new failures
  saveJson(ERRORS_PATH, newErrors);

  console.log(`\n--- Retry Summary ---`);
  console.log(`${succeeded} succeeded, ${failed} failed`);
  console.log(`Total records in firms.json: ${results.length}\n`);
}

main();
