const CONTENT_PATH = '/api/images/content';

/** Treat a ticket as stale slightly before it expires so in-flight loads still finish. */
const EXPIRY_SKEW_MS = 60_000;

export function isContentProxyUrl(src: string): boolean {
  return src.includes(CONTENT_PATH);
}

function base64UrlDecode(value: string): string | null {
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/');
    return atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='));
  } catch {
    return null;
  }
}

/**
 * Expiry embedded in a `/api/images/content` ticket.
 *
 * The ticket is HMAC-signed server-side; reading it here is only used to decide
 * when to re-resolve, never to authorize anything.
 */
export function contentTicketExpiresAt(src: string): number | null {
  if (!isContentProxyUrl(src)) return null;

  const ticket = new URLSearchParams(src.slice(src.indexOf('?') + 1)).get('t');
  if (!ticket) return null;

  const body = ticket.split('.')[0];
  if (!body) return null;

  const json = base64UrlDecode(body);
  if (!json) return null;

  try {
    const payload = JSON.parse(json) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/** Expiry of a signed UploadThing CDN URL, taken from its `expires` param. */
function signedUrlExpiresAt(src: string): number | null {
  const queryStart = src.indexOf('?');
  if (queryStart < 0) return null;

  const expires = new URLSearchParams(src.slice(queryStart + 1)).get('expires');
  if (!expires) return null;

  const value = Number(expires);
  if (!Number.isFinite(value)) return null;
  // UploadThing emits milliseconds; tolerate seconds in case that changes.
  return value > 1e12 ? value : value * 1000;
}

/**
 * True when `src` is safe to render. Data URLs and unsigned links never expire;
 * content-proxy tickets and signed CDN URLs do.
 */
export function isDisplaySrcFresh(src: string, now = Date.now()): boolean {
  if (!src) return false;
  const expiresAt = contentTicketExpiresAt(src) ?? signedUrlExpiresAt(src);
  if (expiresAt === null) return true;
  return expiresAt - EXPIRY_SKEW_MS > now;
}
