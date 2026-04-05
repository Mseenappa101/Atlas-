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
        'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
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
    'You are a legal career advisor. Write a professional cover letter.',
    JSON.stringify({ userProfile, firm })
  );
}

export async function generateColdOutreach(userProfile, firm) {
  return callClaude(
    'You are a legal career advisor. Write a professional cold outreach email.',
    JSON.stringify({ userProfile, firm })
  );
}

export async function generateFollowUp(userProfile, firm) {
  return callClaude(
    'You are a legal career advisor. Write a professional follow-up email.',
    JSON.stringify({ userProfile, firm })
  );
}

export async function generateThankYou(userProfile, firm) {
  return callClaude(
    'You are a legal career advisor. Write a professional thank-you note.',
    JSON.stringify({ userProfile, firm })
  );
}

export async function generateInterviewPrep(userProfile, firm) {
  return callClaude(
    'You are a legal career advisor. Prepare interview notes and practice questions.',
    JSON.stringify({ userProfile, firm }),
    true
  );
}
