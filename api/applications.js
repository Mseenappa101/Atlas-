import { config } from './config.js';
import { HttpError, bad } from './http.js';
import { getDb, q, getProfile, uploadFile, signedFileUrl } from './db.js';
import { encrypt, decrypt, signState, verifyState } from './crypto.js';
import { PROVIDERS, firmwardConfigured, sendViaFirmward } from './mail.js';
import { letterPdf, resumePdf } from './pdf.js';
import { MIME, decodeBase64, detectFileType, sanitizeFileName } from './files.js';
import { hasContent, sanitizeResume } from './resume.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const isEmail = (s) => typeof s === 'string' && s.length <= 254 && EMAIL.test(s);
const db = () => getDb();
const now = () => new Date().toISOString();

const notFound = (what) => new HttpError(404, 'not_found', `We couldn’t find that ${what}.`);
const redirectUri = (provider) => `${config.appUrl}/api/connect/${provider}/callback`;

// ─── CONNECTED INBOXES ──────────────────────────────────────────────────────

export async function listConnections(user) {
  const rows = await q(db().from('email_connections').select('provider, email, created_at').eq('user_id', user.id));
  return {
    connections: rows,
    available: { gmail: PROVIDERS.gmail.configured(), outlook: PROVIDERS.outlook.configured(), firmward: firmwardConfigured() },
    account_email: user.email,
  };
}

/** Where to go after connecting: a path inside the app only (never another site). */
const safeReturn = (p) => (typeof p === 'string' && /^\/(?!\/)[\w\-./?=&%]*$/.test(p) ? p : '/account');

export async function startConnect(user, body) {
  const provider = PROVIDERS[body.provider];
  if (!provider) throw bad('Choose Gmail or Outlook.');
  if (!provider.configured()) throw new HttpError(503, 'email_connect_unavailable', `Connecting ${provider.label} isn’t available yet. You can still send from Firmward.`);
  const state = signState({ u: user.id, p: body.provider, r: safeReturn(body.return_to) });
  return { url: provider.authUrl(state, redirectUri(body.provider), user.email) };
}

/** GET /api/connect/{provider}/callback. Not signed in: the signed state says whose inbox this is. */
export async function connectCallback(url, providerName) {
  const back = (path, result) => `${config.appUrl}${path}${path.includes('?') ? '&' : '?'}email=${result}`;
  const state = verifyState(url.searchParams.get('state'));
  if (!state || state.p !== providerName) return back('/account', 'expired');
  if (url.searchParams.get('error')) return back(state.r, 'canceled');
  const provider = PROVIDERS[providerName];
  try {
    const got = await provider.exchange(url.searchParams.get('code'), redirectUri(providerName));
    if (got.missingScope) return back(state.r, 'permission');
    if (!got.refreshToken || !got.email) return back(state.r, 'failed');
    await q(db().from('email_connections').upsert({
      user_id: state.u, provider: providerName, email: got.email.toLowerCase(), refresh_token_enc: encrypt(got.refreshToken), updated_at: now(),
    }, { onConflict: 'user_id,provider' }));
    return back(state.r, `connected-${providerName}`);
  } catch (e) {
    console.error(`connect ${providerName}:`, e.message);
    return back(state.r, 'failed');
  }
}

export async function disconnect(user, body) {
  if (!PROVIDERS[body.provider]) throw bad('Choose Gmail or Outlook.');
  const row = await q(db().from('email_connections').select('refresh_token_enc').eq('user_id', user.id).eq('provider', body.provider).maybeSingle());
  if (row && body.provider === 'gmail') {
    // Also withdraw the permission at Google, so it disappears from their Google account too.
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decrypt(row.refresh_token_enc))}`, { method: 'POST' });
    } catch { /* removing it here is what matters */ }
  }
  await q(db().from('email_connections').delete().eq('user_id', user.id).eq('provider', body.provider));
  return { ok: true };
}

// ─── FILES: transcripts and writing samples ────────────────────────────────

const FILE_KINDS = new Set(['transcript', 'writing-sample', 'other']);
const MAX_FILES = 20;

export async function uploadApplicationFile(user, body) {
  const kind = FILE_KINDS.has(body.kind) ? body.kind : 'other';
  const buf = decodeBase64(body.file_base64);
  if (!buf) throw bad('Attach a file.');
  if (buf.length > config.fileLimit) throw new HttpError(413, 'file_too_large', 'That file is over 5 MB. Upload a smaller PDF or Word file.');
  const type = detectFileType(buf);
  if (!type) throw new HttpError(415, 'unsupported_file', 'Upload a PDF or a Word (.docx) file.');
  const { count } = await db().from('user_files').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  if (count >= MAX_FILES) throw new HttpError(409, 'too_many_files', `You can keep up to ${MAX_FILES} files. Delete one you no longer need first.`);
  const name = sanitizeFileName(body.file_name || kind, type);
  const path = `${user.id}/files/${Date.now()}-${name}`;
  await uploadFile(path, buf, MIME[type]);
  const file = await q(db().from('user_files').insert({ user_id: user.id, kind, name, path, mime: MIME[type], size: buf.length })
    .select('id, kind, name, size, created_at').single());
  return { file };
}

export async function deleteApplicationFile(user, body) {
  if (!UUID.test(body.id ?? '')) throw bad('That file id is not valid.');
  const row = await q(db().from('user_files').select('path').eq('id', body.id).eq('user_id', user.id).maybeSingle());
  if (!row) throw notFound('file');
  await db().storage.from(config.bucket).remove([row.path]);
  await q(db().from('user_files').delete().eq('id', body.id).eq('user_id', user.id));
  return { ok: true };
}

export async function applicationFileUrl(user, body) {
  if (!UUID.test(body.id ?? '')) throw bad('That file id is not valid.');
  const row = await q(db().from('user_files').select('path').eq('id', body.id).eq('user_id', user.id).maybeSingle());
  if (!row) throw notFound('file');
  return { url: await signedFileUrl(row.path) };
}

// ─── ATTACHMENTS ────────────────────────────────────────────────────────────

async function download(path) {
  const { data, error } = await db().storage.from(config.bucket).download(path);
  if (error) throw new Error(`storage: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

const fileSafe = (s) => String(s ?? '').replace(/[\\/:*?"<>|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);

async function resumeAttachment(user, profile, choice) {
  const who = fileSafe(profile?.full_name || 'Resume');
  if (choice === 'file') {
    if (!profile?.resume_file_path) throw new HttpError(409, 'no_resume', 'You haven’t uploaded a resume file. Upload one on My resume, or attach your built resume.');
    const ext = profile.resume_file_path.endsWith('.docx') ? 'docx' : 'pdf';
    return { filename: `${who} - Resume.${ext}`, mime: MIME[ext], content: await download(profile.resume_file_path) };
  }
  const resume = profile?.resume_data && sanitizeResume(profile.resume_data);
  if (!resume || !hasContent(resume)) throw new HttpError(409, 'no_resume', 'Your built resume is empty. Fill it in on My resume first.');
  return { filename: `${who} - Resume.pdf`, mime: MIME.pdf, content: await resumePdf(resume) };
}

async function letterAttachment(user, profile, documentId) {
  if (!UUID.test(documentId ?? '')) throw bad('That cover letter id is not valid.');
  const doc = await q(db().from('documents').select('id, title, content, firm_id').eq('id', documentId).eq('user_id', user.id).maybeSingle());
  if (!doc) throw notFound('cover letter');
  const firm = doc.firm_id ? await q(db().from('firms').select('name').eq('id', doc.firm_id).maybeSingle()) : null;
  const name = [fileSafe(profile?.full_name), 'Cover Letter', firm && fileSafe(firm.name)].filter(Boolean).join(' - ');
  return { filename: `${name}.pdf`, mime: MIME.pdf, content: await letterPdf(doc.content, doc.title) };
}

async function gatherAttachments(user, profile, spec = {}) {
  const out = [];
  if (spec.resume === 'file' || spec.resume === 'builder') out.push(await resumeAttachment(user, profile, spec.resume));
  if (spec.letter_id) out.push(await letterAttachment(user, profile, spec.letter_id));
  const ids = Array.isArray(spec.file_ids) ? [...new Set(spec.file_ids)].slice(0, 6) : [];
  if (ids.some((id) => !UUID.test(id))) throw bad('One of those file ids is not valid.');
  if (ids.length) {
    const rows = await q(db().from('user_files').select('id, name, path, mime').eq('user_id', user.id).in('id', ids));
    if (rows.length !== ids.length) throw notFound('file');
    for (const r of rows) out.push({ filename: r.name, mime: r.mime, content: await download(r.path) });
  }
  return out;
}

/** POST /api/documents/pdf: a letter (document_id) or the built resume (resume: true), for download. */
export async function documentPdf(user, body) {
  const profile = await getProfile(user.id);
  const a = body.resume ? await resumeAttachment(user, profile, 'builder') : await letterAttachment(user, profile, body.document_id);
  return { file_name: a.filename, file_base64: a.content.toString('base64') };
}

// ─── SENDING ────────────────────────────────────────────────────────────────

const escHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const toHtml = (text) => `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#14181F">${
  text.split(/\n{2,}/).map((p) => `<p style="margin:0 0 12px">${escHtml(p).replace(/\n/g, '<br>')}</p>`).join('')}</div>`;

function parseCc(cc) {
  const list = (Array.isArray(cc) ? cc : String(cc ?? '').split(/[,;\s]+/)).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (list.length > 2) throw bad('You can copy at most two people.');
  const badOne = list.find((s) => !isEmail(s));
  if (badOne) throw bad(`“${badOne}” isn’t an email address.`);
  return list;
}

async function mailbox(user, via) {
  const row = await q(db().from('email_connections').select('email, refresh_token_enc').eq('user_id', user.id).eq('provider', via).maybeSingle());
  if (!row) throw new HttpError(409, 'not_connected', `Connect ${PROVIDERS[via].label} first, or send from Firmward.`);
  let tokens;
  try {
    tokens = await PROVIDERS[via].accessToken(decrypt(row.refresh_token_enc));
  } catch (e) {
    if (e instanceof HttpError && e.code === 'reconnect') {
      await q(db().from('email_connections').delete().eq('user_id', user.id).eq('provider', via));
    }
    throw e;
  }
  if (tokens.refreshToken) {
    await q(db().from('email_connections').update({ refresh_token_enc: encrypt(tokens.refreshToken), updated_at: now() })
      .eq('user_id', user.id).eq('provider', via));
  }
  return { email: row.email, accessToken: tokens.accessToken };
}

export async function sendApplication(user, body) {
  const via = body.via;
  if (!['gmail', 'outlook', 'firmward'].includes(via)) throw bad('Choose which address to send from.');
  if (!UUID.test(body.user_firm_id ?? '')) throw bad('Open this application from My List and try again.');
  const to = String(body.to ?? '').trim().toLowerCase();
  if (!isEmail(to)) throw bad('Enter the firm’s email address.');
  const cc = parseCc(body.cc);
  const subject = String(body.subject ?? '').replace(/[\r\n]+/g, ' ').trim();
  const text = String(body.body ?? '').replace(/\r\n/g, '\n').trim();
  if (!subject) throw bad('Add a subject line.');
  if (subject.length > 200) throw bad('Keep the subject under 200 characters.');
  if (!text) throw bad('Write a short message to go with your application.');
  if (text.length > 10_000) throw bad('Keep the message under 10,000 characters.');

  const app = await q(db().from('user_firms').select('id, firm_id, status, applied_at').eq('id', body.user_firm_id).eq('user_id', user.id).maybeSingle());
  if (!app) throw notFound('application');

  // Protects students' reputations and our sending domain from runaway or repeated sends.
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const recent = await q(db().from('sent_messages').select('to_email, firm_id, created_at').eq('user_id', user.id).eq('status', 'sent').gte('created_at', dayAgo));
  if (recent.length >= config.dailySendCap) {
    throw new HttpError(429, 'send_cap', `You’ve sent ${config.dailySendCap} applications in the last 24 hours, the daily limit. Try again tomorrow.`);
  }
  if (!body.confirm_resend && recent.some((m) => m.to_email === to && m.firm_id === app.firm_id && Date.now() - Date.parse(m.created_at) < 10 * 60_000)) {
    throw new HttpError(409, 'just_sent', `You sent this firm an email a few minutes ago. Send again anyway?`);
  }

  const profile = await getProfile(user.id);
  const attachments = await gatherAttachments(user, profile, body.attachments);
  const total = attachments.reduce((n, a) => n + a.content.length, 0);
  const limit = via === 'outlook' ? 3 * 1024 * 1024 : 15 * 1024 * 1024;
  if (total > limit) {
    throw new HttpError(413, 'attachments_too_large', via === 'outlook'
      ? 'Outlook sending allows 3 MB of attachments in total. Remove a file or send from Firmward.'
      : 'Attachments are over 15 MB in total. Remove a file and try again.');
  }

  const fromName = profile?.full_name?.trim() || user.email.split('@')[0];
  const msg = { fromName, to, cc, subject, text, html: toHtml(text), attachments };
  let fromEmail;
  let providerId;
  const log = (status, extra) => q(db().from('sent_messages').insert({
    user_id: user.id, user_firm_id: app.id, firm_id: app.firm_id, via, from_email: fromEmail ?? user.email, to_email: to,
    cc: cc.join(', ') || null, subject, body: text, attachments: attachments.map((a) => ({ name: a.filename, size: a.content.length })),
    status, ...extra,
  }).select('id, via, from_email, to_email, cc, subject, attachments, status, created_at').single());

  try {
    if (via === 'firmward') {
      fromEmail = config.sendFromAddress;
      // Replies go to the student, and they get a copy of what was sent.
      msg.replyTo = user.email;
      if (!cc.includes(user.email.toLowerCase())) msg.cc = [...cc, user.email.toLowerCase()];
      providerId = await sendViaFirmward(msg);
    } else {
      const box = await mailbox(user, via);
      fromEmail = box.email;
      providerId = await PROVIDERS[via].send(box.accessToken, { ...msg, fromEmail });
    }
  } catch (e) {
    await log('failed', { error: String(e.message).slice(0, 500) }).catch(() => {});
    throw e;
  }

  const message = await log('sent', { provider_message_id: providerId ?? null });
  await q(db().from('application_events').insert({
    user_id: user.id, user_firm_id: app.id, kind: 'sent', detail: { message_id: message.id, to, via },
  }));
  const patch = { contact_email: to, method: 'email', updated_at: now() };
  if (['saved', 'researching'].includes(app.status)) patch.status = 'applied';
  if (!app.applied_at) patch.applied_at = now();
  const userFirm = await q(db().from('user_firms').update(patch).eq('id', app.id)
    .select('id, firm_id, status, applied_at, contact_email, method, updated_at').single());
  return { message, user_firm: userFirm };
}
