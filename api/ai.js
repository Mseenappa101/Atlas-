import { bad } from './http.js';
import { generateText, assertUnderDailyCap } from './claude.js';

// AI document generators (firm briefs + application docs). These moved off the client: the system
// prompts and the Anthropic API key stay server-side. The client posts { kind, firm, profile } and
// gets back { content } — see src/lib/ai.js. Gated in the UI by flags.aiDocs / Pro; auth is enforced
// by the router, and every call is counted against the per-user daily cap.

const firmDetails = (firm) => [
  `Firm: ${firm.name}`,
  `City: ${firm.city}`,
  `State: ${firm.state}`,
  firm.size ? `Size: ${firm.size}` : null,
  firm.practice_areas?.length ? `Practice Areas: ${firm.practice_areas.join(', ')}` : null,
  firm.has_1l_program ? 'Has 1L Summer Program: Yes' : null,
  firm.has_fellowship ? 'Has Diversity Fellowship: Yes' : null,
  firm.fellowship_name ? `Fellowship Name: ${firm.fellowship_name}` : null,
  firm.careers_url ? `Careers URL: ${firm.careers_url}` : null,
  firm.website ? `Website: ${firm.website}` : null,
  firm.notes ? `Notes: ${firm.notes}` : null,
].filter(Boolean).join('\n');

// kind -> { system, content(body), maxTokens? }
const DOCS = {
  firm_brief: {
    maxTokens: 8000,
    system: `You are an elite legal market intelligence analyst. Based on your knowledge of this law firm, write a comprehensive 5-paragraph intelligence brief for a 1L law student. Use everything you know about this firm from your training data. Be specific and detailed.

Paragraph 1: Firm overview — size, number of offices, Am Law ranking and revenue if you know it, overall market reputation and prestige level.

Paragraph 2: Strongest practice areas — which departments are considered elite, notable clients, recent significant matters you are aware of.

Paragraph 3: Culture and associate experience — work environment, hours, what types of candidates succeed, associate satisfaction, firm personality.

Paragraph 4: 1L recruiting — what you know about their summer program, typical timeline, what they look for, GPA expectations, which schools they recruit heavily from.

Paragraph 5: How to apply — direct application process, any recruiting contacts you are aware of, advice for a strong application to this specific firm.

Write 4-6 sentences per paragraph. Be specific to this firm. Do not be generic.`,
    content: ({ firm }) => `Write a comprehensive intelligence brief for:\n${firmDetails(firm)}`,
  },

  cover_letter: {
    system: 'You are an expert legal writing coach with deep knowledge of law firm culture and what BigLaw and regional firm recruiters value in 1L candidates. Write a cover letter for a specific student applying to a specific firm. Rules without exception: (1) The letter must sound like this specific student — use their actual background and personal narrative. (2) Reference something specific and genuine about this firm. (3) Exactly three paragraphs: why this firm, what this student offers, a confident close. (4) Under 400 words. (5) No placeholder text — all fields resolved from data provided. (6) No markdown — plain text professional document. (7) Do not open with any variation of I am writing to express my interest. (8) Professional but genuine. (9) If the profile is incomplete, produce the strongest letter from available data.',
    content: ({ profile, firm }) => JSON.stringify({ userProfile: profile, firm, aiBrief: firm?.ai_brief }),
  },

  cold_outreach: {
    system: 'Write a cold outreach email from a 1L law student to this firm. Under 150 words. Reference a specific practice area or recent firm achievement. Request a brief informational conversation. Direct and professional. No markdown.',
    content: ({ profile, firm }) => JSON.stringify({ userProfile: profile, firm }),
  },

  follow_up: {
    system: 'Write a follow-up email. Student applied 2-3 weeks ago, no response. Under 100 words. Polite, not apologetic. Reiterates interest. Requests status. No markdown.',
    content: ({ profile, firm }) => JSON.stringify({ userProfile: profile, firm }),
  },

  thank_you: {
    system: 'Write a post-interview thank-you note. Under 150 words. Warm but professional. References genuine interest in the firm. No markdown.',
    content: ({ profile, firm }) => JSON.stringify({ userProfile: profile, firm }),
  },

  interview_prep: {
    system: 'You are a law firm interview coach. Write a structured interview prep sheet for a 1L student preparing for a callback at this firm. Return exactly these five sections as plain text with the section label followed by a colon then the content on the same line or next paragraph: WHY THIS FIRM: two to three sentences specific to this student and this firm. LIKELY QUESTIONS: five questions this firm typically asks 1L candidates. SMART QUESTIONS TO ASK: three questions showing genuine firm knowledge. RECENT NEWS: two to three notable matters or developments to reference. WATCH OUTS: one to two things this firm values or penalises in 1L candidates.',
    content: ({ profile, firm }) => JSON.stringify({ userProfile: profile, firm, aiBrief: firm?.ai_brief }),
  },
};

export async function generateDocument(user, body) {
  const kind = body?.kind;
  const spec = DOCS[kind];
  if (!spec) throw bad('Unknown document type.');
  if (!body.firm || typeof body.firm !== 'object') throw bad('Pick a firm for this document.');

  await assertUnderDailyCap(user.id);
  const { text } = await generateText({
    userId: user.id,
    kind,
    system: spec.system,
    content: spec.content(body),
    maxTokens: spec.maxTokens,
  });
  return { content: text };
}
