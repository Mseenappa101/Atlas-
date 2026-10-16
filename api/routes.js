import { config } from './config.js';
import { HttpError, bad } from './http.js';
import {
  getPlan, hasPro, countLetters, countAiSince, getProfile, saveProfile, getFirm, getListing, insertDocument, uploadFile, signedFileUrl,
} from './db.js';
import { generateJson, assertUnderDailyCap } from './claude.js';
import {
  RESUME_SCHEMA, PARSE_SCHEMA, PARSE_SYSTEM, BUILD_SYSTEM, sanitizeResume, resumeShapeError, hasContent,
  cleanAnswers, answersForPrompt, enforceBuilderFacts,
} from './resume.js';
import { MIME, decodeBase64, detectFileType, sanitizeFileName, docxText } from './files.js';
import {
  LETTER_SCHEMA, LETTER_SYSTEM, letterPrompt, cleanParagraphs, assembleLetter, letterDate, letterTitle, letterIssues,
} from './letters.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const now = () => new Date().toISOString();

const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
};

async function usageFor(userId) {
  const [plan, letters, month] = await Promise.all([getPlan(userId), countLetters(userId), countAiSince(userId, monthStart())]);
  const pro = hasPro(plan);
  return {
    plan,
    pro,
    letters_used: letters,
    letters_limit: pro ? null : config.freeLetterLimit, // free: one sample AI letter, ever
    ai_used_month: month,
    ai_limit_month: pro ? config.proMonthlyCap : null,
  };
}

const proRequired = () => new HttpError(403, 'pro_required',
  'Reading and rewriting your resume with AI is part of Pro ($4.99/month). You can still upload your file and fill in the resume form for free.');

async function assertAiAllowed(userId, { letter = false } = {}) {
  const usage = await usageFor(userId);
  if (!usage.pro && !letter) throw proRequired();
  if (!usage.pro && usage.letters_used >= config.freeLetterLimit) {
    throw new HttpError(402, 'limit_reached',
      'You’ve used your free AI cover letter. Pro ($4.99/month) writes one for every firm. Template letters stay free.',
      { used: usage.letters_used, limit: config.freeLetterLimit });
  }
  if (usage.pro && usage.ai_used_month >= config.proMonthlyCap) {
    throw new HttpError(429, 'monthly_cap',
      `You’ve reached this month’s ${config.proMonthlyCap} AI documents. The count resets on the 1st.`);
  }
  return usage;
}

function readUpload(body) {
  const buf = decodeBase64(body.file_base64);
  if (!buf) throw bad('Attach your resume file.');
  if (buf.length > config.fileLimit) throw new HttpError(413, 'file_too_large', 'That file is over 5 MB. Upload a smaller PDF or Word file.');
  const type = detectFileType(buf);
  if (!type) throw new HttpError(415, 'unsupported_file', 'Upload your resume as a PDF or a Word (.docx) file.');
  return { buf, type };
}

const notAResume = () => new HttpError(422, 'not_a_resume',
  "That file doesn't look like a resume. Upload the PDF or Word file of your resume, or use the resume builder.");

// ─── HANDLERS: (user, body) => response body ───────────────────────────────

export const getUsage = (user) => usageFor(user.id);

// Free: keep the student's own file on hand. No AI.
export async function storeResumeFile(user, body) {
  const { buf, type } = readUpload(body);
  const name = sanitizeFileName(body.file_name, type);
  const path = `${user.id}/${Date.now()}-${name}`;
  await uploadFile(path, buf, MIME[type]);
  await saveProfile(user, { resume_file_path: path, resume_updated_at: now() });
  return { file_name: name, path };
}

export async function resumeFileUrl(user) {
  const profile = await getProfile(user.id);
  if (!profile?.resume_file_path) throw new HttpError(404, 'not_found', 'You haven’t uploaded a resume file yet.');
  return { url: await signedFileUrl(profile.resume_file_path) };
}

export async function parseResume(user, body) {
  const { buf, type } = readUpload(body);
  await assertAiAllowed(user.id);
  await assertUnderDailyCap(user.id);
  let doc;
  if (type === 'pdf') {
    doc = { type: 'document', source: { type: 'base64', media_type: MIME.pdf, data: buf.toString('base64') } };
  } else {
    const text = await docxText(buf).catch(() => '');
    if (text.length < 40) throw notAResume();
    doc = { type: 'document', source: { type: 'text', media_type: 'text/plain', data: text } };
  }
  const { data } = await generateJson({
    userId: user.id, kind: 'resume_parse', system: PARSE_SYSTEM, schema: PARSE_SCHEMA, effort: 'low',
    content: [doc, { type: 'text', text: 'Extract this resume into the JSON format.' }],
  });
  const resume = sanitizeResume(data);
  if (!data.is_resume || !hasContent(resume)) throw notAResume();

  const path = `${user.id}/${Date.now()}-${sanitizeFileName(body.file_name, type)}`;
  await uploadFile(path, buf, MIME[type]);
  await saveProfile(user, {
    resume_data: resume, resume_source: 'upload', resume_file_path: path, resume_updated_at: now(),
  });
  return { resume };
}

export async function buildResume(user, body) {
  const { answers, error } = cleanAnswers(body.answers);
  if (error) throw bad(error);
  await assertAiAllowed(user.id);
  await assertUnderDailyCap(user.id);
  const { data } = await generateJson({
    userId: user.id, kind: 'resume_write', system: BUILD_SYSTEM, schema: RESUME_SCHEMA, effort: 'medium',
    content: `<answers>\n${answersForPrompt(answers)}\n</answers>\n\nBuild the resume JSON from these answers.`,
  });
  const resume = enforceBuilderFacts(sanitizeResume(data), answers);
  await saveProfile(user, { resume_data: resume, resume_source: 'builder', resume_updated_at: now() });
  return { resume };
}

export async function saveResume(user, body) {
  const problem = resumeShapeError(body.resume);
  if (problem) throw new HttpError(400, 'invalid_resume', problem);
  const resume = sanitizeResume(body.resume);
  await saveProfile(user, { resume_data: resume, resume_updated_at: now() });
  return { resume };
}

export async function createLetter(user, body) {
  const { firm_id: firmIdIn, listing_id: listingId } = body;
  const notes = body.notes == null ? '' : body.notes;
  if (!firmIdIn && !listingId) throw bad('Pick a firm or a posting for this letter.');
  if ((firmIdIn && !UUID.test(firmIdIn)) || (listingId && !UUID.test(listingId))) throw bad('That firm or posting id is not valid.');
  if (typeof notes !== 'string') throw bad('Notes must be text.');
  if (notes.length > 1000) throw bad('Keep your notes under 1,000 characters.');

  const profile = await getProfile(user.id);
  if (!profile?.resume_data) {
    throw new HttpError(409, 'no_resume', 'Add your resume first. Upload it or use the resume builder, then come back to write a letter.');
  }
  const usage = await assertAiAllowed(user.id, { letter: true });

  const listing = listingId ? await getListing(listingId) : null;
  if (listingId && !listing) throw new HttpError(404, 'not_found', "We couldn't find that posting.");
  const firmId = firmIdIn || listing.firm_id;
  if (!firmId) throw new HttpError(422, 'no_firm', "That posting isn't linked to a firm yet, so we can't write a letter for it.");
  if (firmIdIn && listing?.firm_id && listing.firm_id !== firmIdIn) throw bad("That posting belongs to a different firm.");
  const firm = await getFirm(firmId);
  if (!firm) throw new HttpError(404, 'not_found', "We couldn't find that firm.");

  await assertUnderDailyCap(user.id);
  const resume = sanitizeResume(profile.resume_data);
  const { data } = await generateJson({
    userId: user.id, kind: 'cover_letter', system: LETTER_SYSTEM, schema: LETTER_SCHEMA, effort: 'medium',
    content: letterPrompt({ profile, resume, firm, listing, notes: notes.trim() }),
  });
  const paragraphs = cleanParagraphs(data.paragraphs);
  if (paragraphs.length < 2) throw new HttpError(502, 'ai_failed', "We couldn't generate that just now. Please try again in a minute.");
  const issues = letterIssues(paragraphs);
  if (issues.length) console.warn(`letter style: ${issues.join(', ')}`);

  const content = assembleLetter({ date: letterDate(), firm, paragraphs, name: resume.name || profile.full_name || '' });
  const document = await insertDocument({
    user_id: user.id, firm_id: firm.id, listing_id: listing?.id || null, type: 'cover_letter',
    title: letterTitle(firm, listing), content,
  });
  return {
    document,
    usage: { ...usage, letters_used: usage.letters_used + 1, ai_used_month: usage.ai_used_month + 1 },
  };
}
