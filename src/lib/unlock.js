// The map-unlock token from /api/subscribe, kept in this browser so returning visitors stay unlocked.
// Storage can be missing (private mode, blocked site data), so every access is wrapped.

const KEY = 'firmward.unlock';

export function readToken() {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

export function saveToken(token) {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    // still unlocked for this visit
  }
}

/** The welcome email links to /explore?unlock=…; take the token from the URL once, then tidy the URL. */
export function captureTokenFromUrl() {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const token = url.searchParams.get('unlock');
  if (!token) return null;
  saveToken(token);
  url.searchParams.delete('unlock');
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  return token;
}
