import { api, ApiError } from './api';

// All AI generation runs on the server (api/ai.js). The Anthropic API key and the system prompts
// live there, never in this bundle. Each helper posts { kind, profile, firm } and returns
// { content, error } so callers (DocumentGenerator, FirmDetail) don't need to change.
async function generateDocument(kind, userProfile, firm) {
  try {
    const { content } = await api('/ai/document', {
      method: 'POST',
      body: { kind, profile: userProfile, firm },
    });
    return { content: content || null, error: null };
  } catch (error) {
    const message = error instanceof ApiError ? error.message : (error?.message || 'Request failed');
    return { content: null, error: message };
  }
}

export const generateFirmBrief = (firm) => generateDocument('firm_brief', null, firm);
export const generateCoverLetter = (userProfile, firm) => generateDocument('cover_letter', userProfile, firm);
export const generateColdOutreach = (userProfile, firm) => generateDocument('cold_outreach', userProfile, firm);
export const generateFollowUp = (userProfile, firm) => generateDocument('follow_up', userProfile, firm);
export const generateThankYou = (userProfile, firm) => generateDocument('thank_you', userProfile, firm);
export const generateInterviewPrep = (userProfile, firm) => generateDocument('interview_prep', userProfile, firm);
