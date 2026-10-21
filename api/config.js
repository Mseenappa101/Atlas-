import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Local dev reads .env.local; in production the platform sets env vars (existing ones win).
try { process.loadEnvFile(join(ROOT, '.env.local')); } catch { /* no file */ }

const num = (v, d) => (v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);
const list = (v, d) => (v || d).split(',').map((s) => s.trim()).filter(Boolean);

export const config = {
  port: num(process.env.PORT ?? process.env.API_PORT, 8787), // PORT is set by hosts like Railway
  allowedOrigins: list(process.env.API_ALLOWED_ORIGINS, 'http://localhost:5173'),
  dailyCap: num(process.env.DAILY_GENERATION_CAP, 30),
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  bodyLimit: 8 * 1024 * 1024,
  fileLimit: 5 * 1024 * 1024,
  // Free accounts get one AI cover letter as a sample; Pro (and coaching plans) get a monthly cap.
  freeLetterLimit: 1,
  proMonthlyCap: num(process.env.PRO_MONTHLY_CAP, 100),
  appUrl: (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
  stripeKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  // Looked up by key so test and live mode don't need different price ids.
  proPriceLookupKey: 'atlas_pro_monthly',
  bucket: 'resume-uploads',

  // On-site Sprint course (/sprint/course). Access is proved by a paid Stripe Checkout Session, not an
  // account. Video URLs are gated: served only after /api/sprint/unlock verifies the session, so they
  // never ship in the public bundle. Fill these in the environment (unlisted Vimeo/YouTube embed URLs).
  // sprintPriceId is optional — set it to restrict unlock to the Sprint product rather than any paid session.
  sprintPriceId: process.env.STRIPE_SPRINT_PRICE_ID || null,
  sprintCourseVideos: {
    'build-list': process.env.SPRINT_VIDEO_BUILD_LIST || 'PLACEHOLDER_SPRINT_VIDEO_BUILD_LIST',
    'fix-resume': process.env.SPRINT_VIDEO_FIX_RESUME || 'PLACEHOLDER_SPRINT_VIDEO_FIX_RESUME',
    'write-email': process.env.SPRINT_VIDEO_WRITE_EMAIL || 'PLACEHOLDER_SPRINT_VIDEO_WRITE_EMAIL',
    'send-day': process.env.SPRINT_VIDEO_SEND_DAY || 'PLACEHOLDER_SPRINT_VIDEO_SEND_DAY',
    'live-call': process.env.SPRINT_VIDEO_LIVE_CALL || 'PLACEHOLDER_SPRINT_VIDEO_LIVE_CALL',
  },

  // Sending applications. OAuth redirect URIs are APP_URL + /api/connect/{gmail|outlook}/callback.
  tokenKey: process.env.TOKEN_ENCRYPTION_KEY,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  microsoftClientId: process.env.MICROSOFT_CLIENT_ID,
  microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  resendKey: process.env.RESEND_API_KEY,
  sendFromAddress: process.env.SEND_FROM_ADDRESS || 'applications@firmward.org',
  dailySendCap: num(process.env.DAILY_SEND_CAP, 25),
  // Email list: every signup becomes a Resend contact in this segment ("Firmward List"); created if unset.
  resendSegmentId: process.env.RESEND_AUDIENCE_ID || process.env.RESEND_SEGMENT_ID || null,
  resendSegmentName: 'Firmward List',

  // Marketing forms (/api/subscribe, /api/workshop, /api/placement-apply).
  emailFrom: process.env.EMAIL_FROM_ADDRESS || 'Michael at Firmward <michael@firmward.org>',
  michaelEmail: process.env.MICHAEL_EMAIL || null, // receives Placement applications; also the reply-to
  workshopZoomUrl: process.env.WORKSHOP_ZOOM_URL || null,
};

// User's choice of model; pricing per million tokens (output includes thinking).
export const MODEL = 'claude-sonnet-5';
export const PRICE = { input: 2, output: 10 };
