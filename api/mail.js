import { randomBytes } from 'node:crypto';
import { config } from './config.js';
import { HttpError } from './http.js';

// Three ways an application email goes out:
//   gmail / outlook: from the student's own mailbox, with send-only permission (no inbox reading).
//   firmward:        from our domain through Resend, as "Name via Firmward", replies to the student.
// A message: { fromName, fromEmail, to, cc: [], replyTo, subject, text, html, attachments: [{ filename, mime, content: Buffer }] }

export const reconnect = (label) => new HttpError(409, 'reconnect', `Your ${label} connection has expired. Reconnect it, then send again.`);
const sendFailed = (detail) => new HttpError(502, 'send_failed', `The email wasn’t sent: ${detail}`);

async function postForm(url, params) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

// ─── GMAIL ─────────────────────────────────────────────────────────────────

const GMAIL_SEND = 'https://www.googleapis.com/auth/gmail.send';

const gmail = {
  label: 'Gmail',
  configured: () => Boolean(config.googleClientId && config.googleClientSecret),
  authUrl: (state, redirectUri, hint) => `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: `openid email ${GMAIL_SEND}`,
    access_type: 'offline',
    prompt: 'consent', // always returns a refresh token
    include_granted_scopes: 'true',
    state,
    ...(hint ? { login_hint: hint } : {}),
  })}`,
  async exchange(code, redirectUri) {
    const { ok, json } = await postForm('https://oauth2.googleapis.com/token', {
      code, client_id: config.googleClientId, client_secret: config.googleClientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code',
    });
    if (!ok) throw new Error(`google token: ${json.error_description || json.error || 'failed'}`);
    // Google's consent screen lets people untick individual permissions.
    if (!String(json.scope).split(' ').includes(GMAIL_SEND)) return { missingScope: true };
    const me = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${json.access_token}` } }).then((r) => r.json());
    return { email: me.email, refreshToken: json.refresh_token };
  },
  async accessToken(refreshToken) {
    const { ok, json } = await postForm('https://oauth2.googleapis.com/token', {
      refresh_token: refreshToken, client_id: config.googleClientId, client_secret: config.googleClientSecret, grant_type: 'refresh_token',
    });
    if (!ok) throw json.error === 'invalid_grant' ? reconnect('Gmail') : new Error(`google refresh: ${json.error}`);
    return { accessToken: json.access_token };
  },
  async send(accessToken, msg) {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: Buffer.from(buildMime(msg)).toString('base64url') }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) throw reconnect('Gmail');
    if (!res.ok) throw sendFailed(json.error?.message || `Gmail returned ${res.status}`);
    return json.id;
  },
};

// ─── OUTLOOK / MICROSOFT 365 ───────────────────────────────────────────────

const MS = 'https://login.microsoftonline.com/common/oauth2/v2.0';
const MS_SCOPES = 'openid email offline_access User.Read Mail.Send';

const outlook = {
  label: 'Outlook',
  configured: () => Boolean(config.microsoftClientId && config.microsoftClientSecret),
  authUrl: (state, redirectUri, hint) => `${MS}/authorize?${new URLSearchParams({
    client_id: config.microsoftClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    response_mode: 'query',
    scope: MS_SCOPES,
    prompt: 'select_account',
    state,
    ...(hint ? { login_hint: hint } : {}),
  })}`,
  async exchange(code, redirectUri) {
    const { ok, json } = await postForm(`${MS}/token`, {
      code, client_id: config.microsoftClientId, client_secret: config.microsoftClientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code', scope: MS_SCOPES,
    });
    if (!ok) throw new Error(`microsoft token: ${json.error_description || json.error || 'failed'}`);
    if (!/\bMail\.Send\b/i.test(json.scope)) return { missingScope: true };
    const me = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', { headers: { Authorization: `Bearer ${json.access_token}` } }).then((r) => r.json());
    return { email: me.mail || me.userPrincipalName, refreshToken: json.refresh_token };
  },
  async accessToken(refreshToken) {
    const { ok, json } = await postForm(`${MS}/token`, {
      refresh_token: refreshToken, client_id: config.microsoftClientId, client_secret: config.microsoftClientSecret, grant_type: 'refresh_token', scope: MS_SCOPES,
    });
    if (!ok) throw json.error === 'invalid_grant' ? reconnect('Outlook') : new Error(`microsoft refresh: ${json.error}`);
    // Microsoft rotates refresh tokens; the caller stores the new one.
    return { accessToken: json.access_token, refreshToken: json.refresh_token };
  },
  async send(accessToken, msg) {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject: msg.subject,
          body: { contentType: 'HTML', content: msg.html },
          toRecipients: [{ emailAddress: { address: msg.to } }],
          ccRecipients: msg.cc.map((address) => ({ emailAddress: { address } })),
          attachments: msg.attachments.map((a) => ({
            '@odata.type': '#microsoft.graph.fileAttachment', name: a.filename, contentType: a.mime, contentBytes: a.content.toString('base64'),
          })),
        },
        saveToSentItems: true,
      }),
    });
    if (res.status === 401) throw reconnect('Outlook');
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw sendFailed(json.error?.message || `Outlook returned ${res.status}`);
    }
    return res.headers.get('request-id');
  },
};

export const PROVIDERS = { gmail, outlook };

// ─── FIRMWARD (Resend) ─────────────────────────────────────────────────────

export const firmwardConfigured = () => Boolean(config.resendKey);

export async function sendViaFirmward(msg) {
  if (!config.resendKey) throw new HttpError(503, 'sending_unavailable', 'Sending from Firmward isn’t set up yet. Connect Gmail or Outlook to send from your own address.');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${displayName(`${msg.fromName} via Firmward`)} <${config.sendFromAddress}>`,
      to: [msg.to],
      cc: msg.cc,
      reply_to: msg.replyTo,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      attachments: msg.attachments.map((a) => ({ filename: a.filename, content: a.content.toString('base64'), content_type: a.mime })),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw sendFailed(json.message || `Resend returned ${res.status}`);
  return json.id;
}

// ─── MIME (for Gmail, which takes a raw RFC 5322 message) ──────────────────

const ascii = (s) => /^[\x20-\x7e]*$/.test(s);
const encodeWord = (s) => (ascii(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString('base64')}?=`);
// Quotes are needed for names with commas or periods ("Doe, Jane"); headers can't contain line breaks.
function displayName(name) {
  const clean = String(name).replace(/[\r\n"]+/g, ' ').trim();
  return ascii(clean) ? `"${clean}"` : encodeWord(clean);
}
const wrap = (b64) => b64.replace(/.{1,76}/g, '$&\r\n');
const boundary = () => `fw_${randomBytes(12).toString('hex')}`;

export function buildMime(msg) {
  const mixed = boundary();
  const alt = boundary();
  const headers = [
    `From: ${displayName(msg.fromName)} <${msg.fromEmail}>`,
    `To: ${msg.to}`,
    msg.cc.length ? `Cc: ${msg.cc.join(', ')}` : null,
    msg.replyTo ? `Reply-To: ${msg.replyTo}` : null,
    `Subject: ${encodeWord(msg.subject.replace(/[\r\n]+/g, ' '))}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
  ].filter(Boolean);
  const parts = [
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    '',
    `--${alt}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrap(Buffer.from(msg.text).toString('base64')),
    `--${alt}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrap(Buffer.from(msg.html).toString('base64')),
    `--${alt}--`,
  ];
  for (const a of msg.attachments) {
    const name = encodeWord(a.filename.replace(/["\r\n]+/g, ''));
    parts.push(
      `--${mixed}`,
      `Content-Type: ${a.mime}; name="${name}"`,
      `Content-Disposition: attachment; filename="${name}"`,
      'Content-Transfer-Encoding: base64',
      '',
      wrap(a.content.toString('base64')),
    );
  }
  parts.push(`--${mixed}--`, '');
  return `${headers.join('\r\n')}\r\n\r\n${parts.join('\r\n')}`;
}
