const API_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude(systemPrompt, userMessage, useWebSearch = false) {
  try {
    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
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
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'API request failed');
    }

    const result = await response.json();
    const textBlock = result.content.find((block) => block.type === 'text');
    return { content: textBlock?.text || null, error: null };
  } catch (error) {
    return { content: null, error: error.message };
  }
}

// ─── AI DOCUMENT GENERATORS ────────────────────────────────────────────────
// Placeholder system prompts — full prompts will be added in Phase VI

export async function generateFirmBrief(firm) {
  return callClaude(
    'You are a legal industry research assistant. Provide a concise brief about this law firm.',
    JSON.stringify(firm),
    true
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
