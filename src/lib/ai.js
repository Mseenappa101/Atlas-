const API_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude(systemPrompt, userMessage, useWebSearch = false) {
  try {
    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    };

    if (useWebSearch) {
      body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Never ship an API key to the browser: VITE_ vars are inlined into the public bundle.
        // Route this through a server endpoint before turning flags.aiDocs back on.
        'x-api-key': '',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('[AI] API error:', err);
      throw new Error(err.error?.message || 'API request failed');
    }

    const result = await response.json();
    console.log('[AI] stop_reason:', result.stop_reason, '| usage:', result.usage);
    const textBlock = result.content.find((block) => block.type === 'text');
    if (!textBlock) {
      console.warn('[AI] No text block in response:', result.content);
    }
    const text = textBlock?.text || null;
    console.log('[AI] Response length:', text?.length, '| First 500 chars:', text?.substring(0, 500));
    return { content: text, error: null };
  } catch (error) {
    console.error('[AI] callClaude error:', error);
    return { content: null, error: error.message };
  }
}

// ─── AI DOCUMENT GENERATORS ────────────────────────────────────────────────
// Placeholder system prompts — full prompts will be added in Phase VI

export async function generateFirmBrief(firm) {
  const details = [
    `Firm: ${firm.name}`,
    `City: ${firm.city}`,
    `State: ${firm.state}`,
    firm.size ? `Size: ${firm.size}` : null,
    firm.practice_areas?.length ? `Practice Areas: ${firm.practice_areas.join(', ')}` : null,
    firm.has_1l_program ? 'Has 1L Summer Program: Yes' : null,
    firm.has_fellowship ? `Has Diversity Fellowship: Yes` : null,
    firm.fellowship_name ? `Fellowship Name: ${firm.fellowship_name}` : null,
    firm.careers_url ? `Careers URL: ${firm.careers_url}` : null,
    firm.website ? `Website: ${firm.website}` : null,
    firm.notes ? `Notes: ${firm.notes}` : null,
  ].filter(Boolean).join('\n');

  return callClaude(
    `You are an elite legal market intelligence analyst. Based on your knowledge of this law firm, write a comprehensive 5-paragraph intelligence brief for a 1L law student. Use everything you know about this firm from your training data. Be specific and detailed.

Paragraph 1: Firm overview — size, number of offices, Am Law ranking and revenue if you know it, overall market reputation and prestige level.

Paragraph 2: Strongest practice areas — which departments are considered elite, notable clients, recent significant matters you are aware of.

Paragraph 3: Culture and associate experience — work environment, hours, what types of candidates succeed, associate satisfaction, firm personality.

Paragraph 4: 1L recruiting — what you know about their summer program, typical timeline, what they look for, GPA expectations, which schools they recruit heavily from.

Paragraph 5: How to apply — direct application process, any recruiting contacts you are aware of, advice for a strong application to this specific firm.

Write 4-6 sentences per paragraph. Be specific to this firm. Do not be generic.`,
    `Write a comprehensive intelligence brief for:\n${details}`
  );
}

export async function generateCoverLetter(userProfile, firm) {
  return callClaude(
    `You are an expert legal writing coach with deep knowledge of law firm culture and what BigLaw and regional firm recruiters value in 1L candidates. Write a cover letter for a specific student applying to a specific firm. Rules without exception: (1) The letter must sound like this specific student — use their actual background and personal narrative. (2) Reference something specific and genuine about this firm. (3) Exactly three paragraphs: why this firm, what this student offers, a confident close. (4) Under 400 words. (5) No placeholder text — all fields resolved from data provided. (6) No markdown — plain text professional document. (7) Do not open with any variation of I am writing to express my interest. (8) Professional but genuine. (9) If the profile is incomplete, produce the strongest letter from available data.`,
    JSON.stringify({ userProfile, firm, aiBrief: firm.ai_brief })
  );
}

export async function generateColdOutreach(userProfile, firm) {
  return callClaude(
    'Write a cold outreach email from a 1L law student to this firm. Under 150 words. Reference a specific practice area or recent firm achievement. Request a brief informational conversation. Direct and professional. No markdown.',
    JSON.stringify({ userProfile, firm })
  );
}

export async function generateFollowUp(userProfile, firm) {
  return callClaude(
    'Write a follow-up email. Student applied 2-3 weeks ago, no response. Under 100 words. Polite, not apologetic. Reiterates interest. Requests status. No markdown.',
    JSON.stringify({ userProfile, firm })
  );
}

export async function generateThankYou(userProfile, firm) {
  return callClaude(
    'Write a post-interview thank-you note. Under 150 words. Warm but professional. References genuine interest in the firm. No markdown.',
    JSON.stringify({ userProfile, firm })
  );
}

export async function generateInterviewPrep(userProfile, firm) {
  return callClaude(
    `You are a law firm interview coach. Write a structured interview prep sheet for a 1L student preparing for a callback at this firm. Return exactly these five sections as plain text with the section label followed by a colon then the content on the same line or next paragraph: WHY THIS FIRM: two to three sentences specific to this student and this firm. LIKELY QUESTIONS: five questions this firm typically asks 1L candidates. SMART QUESTIONS TO ASK: three questions showing genuine firm knowledge. RECENT NEWS: two to three notable matters or developments to reference. WATCH OUTS: one to two things this firm values or penalises in 1L candidates.`,
    JSON.stringify({ userProfile, firm, aiBrief: firm.ai_brief })
  );
}
