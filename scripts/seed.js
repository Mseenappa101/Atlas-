// Usage:
//   node scripts/seed.js --dry-run   (preview without writing to database)
//   node scripts/seed.js             (upsert all firms into Supabase)

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIRMS_PATH = join(__dirname, 'output', 'firms.json');

const dryRun = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function mapFirmToRow(firm) {
  return {
    name: firm.name,
    state: firm.state,
    city: firm.city || (firm.office_locations?.[0] ?? null),
    careers_url: firm.careers_url ?? null,
    has_1l_program: firm.has_1l_program ?? false,
    has_fellowship: firm.has_fellowship ?? false,
    fellowship_name: firm.fellowship_name ?? null,
    app_window_start: firm.app_window_start ?? null,
    app_window_end: firm.app_window_end ?? null,
    apply_url: firm.apply_url ?? null,
    practice_areas: firm.practice_areas ?? [],
    size: firm.firm_size ?? null,
    notes: firm.notes ?? null,
    last_scraped_at: firm.scraped_at ?? null,
  };
}

async function main() {
  let firms;
  try {
    firms = JSON.parse(readFileSync(FIRMS_PATH, 'utf-8'));
  } catch (error) {
    console.error(`Failed to read ${FIRMS_PATH}: ${error.message}`);
    process.exit(1);
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Seeding ${firms.length} firms...\n`);

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const firm of firms) {
    const row = mapFirmToRow(firm);

    if (dryRun) {
      console.log(`  \u2713 ${row.name} (${row.city}, ${row.state}) — would upsert`);
      inserted++;
      continue;
    }

    try {
      // Check if the firm already exists
      const { data: existing } = await supabase
        .from('firms')
        .select('id')
        .eq('name', row.name)
        .eq('city', row.city)
        .maybeSingle();

      const isUpdate = !!existing;

      if (isUpdate) {
        const { error } = await supabase
          .from('firms')
          .update(row)
          .eq('id', existing.id);
        if (error) throw error;
        updated++;
        console.log(`  \u2713 ${row.name} — updated`);
      } else {
        const { error } = await supabase
          .from('firms')
          .insert(row);
        if (error) throw error;
        inserted++;
        console.log(`  \u2713 ${row.name} — inserted`);
      }
    } catch (error) {
      failed++;
      console.log(`  \u2717 ${row.name} — ${error.message}`);
    }
  }

  console.log(`\nSeeding complete. ${inserted} inserted, ${updated} updated, ${failed} failed.\n`);
}

main();
