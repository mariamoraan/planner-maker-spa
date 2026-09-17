import { UTApi } from 'uploadthing/server';

const ALLOWED_HOST_SUFFIXES = ['.ufs.sh', '.utfs.io'] as const;
const ALLOWED_HOSTS = new Set(['ufs.sh', 'utfs.io', 'uploadthing.com', 'www.uploadthing.com']);

export const SIGNED_URL_EXPIRES_IN = '6h' as const;

export type ImageUrlResolveBody = {
  fileKey?: string;
  url?: string;
  key?: string;
};

export function isAllowedUploadthingHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (ALLOWED_HOSTS.has(host)) return true;
  return ALLOWED_HOST_SUFFIXES.some(suffix => host.endsWith(suffix));
}

/**
 * Decode and validate the UploadThing token.
 *
 * The UploadThing SDK parses this value with a strict base64 decoder, while
 * `Buffer.from(token, 'base64')` silently ignores malformed input. Validating
 * strictly here keeps a bad token from reading as usable — otherwise `appId`
 * resolves fine, `/api/images/url` returns 200, and only signing fails, which
 * degrades reads to unsigned URLs instead of reporting a misconfiguration.
 */
function decodeUploadthingToken(): { apiKey: string; appId: string; regions: string[] } {
  const token = process.env.UPLOADTHING_TOKEN;
  if (!token) {
    throw new Error('UPLOADTHING_TOKEN is not configured');
  }

  if (token.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(token)) {
    throw new Error(
      'UPLOADTHING_TOKEN is invalid: not strict base64. Check the env value for stray quotes, whitespace or truncation.'
    );
  }

  let parsed: { apiKey?: unknown; appId?: unknown; regions?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
  } catch {
    throw new Error('UPLOADTHING_TOKEN is invalid: does not decode to JSON');
  }

  if (typeof parsed.appId !== 'string' || !parsed.appId) {
    throw new Error('UPLOADTHING_TOKEN missing appId');
  }
  if (typeof parsed.apiKey !== 'string' || !parsed.apiKey) {
    throw new Error('UPLOADTHING_TOKEN missing apiKey');
  }
  if (!Array.isArray(parsed.regions) || parsed.regions.length === 0) {
    throw new Error('UPLOADTHING_TOKEN missing regions');
  }

  return { apiKey: parsed.apiKey, appId: parsed.appId, regions: parsed.regions as string[] };
}

export function getUploadthingAppId(): string {
  return decodeUploadthingToken().appId;
}

/** Throw early (at boot) when the token cannot be used to sign URLs. */
export function assertUploadthingTokenUsable(): void {
  decodeUploadthingToken();
}

export function buildOfficialFileUrl(fileKey: string, appId = getUploadthingAppId()): string {
  // File keys are opaque ids; customIds may contain "/" and must be encoded.
  const encoded = fileKey.includes('/') ? encodeURIComponent(fileKey) : fileKey;
  return `https://${appId}.ufs.sh/f/${encoded}`;
}

/** True when URL is the deprecated utfs.io CDN (often blocked / failing). */
export function isLegacyUtfsUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'utfs.io' || host.endsWith('.utfs.io');
  } catch {
    return false;
  }
}

export function extractFileKeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!isAllowedUploadthingHost(parsed.hostname)) return null;
    const match = parsed.pathname.match(/\/(?:f|a\/[^/]+)\/(.+)$/);
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * Sign the official `https://<appId>.ufs.sh/f/<fileKey>` URL.
 * Do NOT use getSignedURL's returned `url` — it often points at deprecated utfs.io.
 */
export async function generateSignedUploadthingUrl(
  fileKey: string,
  opts?: { keyType?: 'fileKey' | 'customId' }
): Promise<string> {
  const utapi = new UTApi();
  const keyType = opts?.keyType ?? 'fileKey';

  const local = await utapi.generateSignedURL(fileKey, {
    expiresIn: SIGNED_URL_EXPIRES_IN,
    keyType,
  });
  if (!local.ufsUrl) {
    throw new Error('Failed to generate signed URL');
  }

  // Guarantee official host even if the SDK returns a legacy hostname.
  if (isLegacyUtfsUrl(local.ufsUrl)) {
    console.warn('[uploadthing-url] generateSignedURL returned utfs.io — using official host');
    return buildOfficialFileUrl(fileKey);
  }

  return local.ufsUrl;
}

/** Auth failures must not read as server errors — that hides the real cause. */
export function statusForAuthError(message: string): number | null {
  if (message === 'Forbidden') return 403;
  if (
    message.includes('Unauthorized') ||
    message.includes('Authorization header') ||
    message.includes('Firebase ID token') ||
    message.startsWith('Firebase token verification failed')
  ) {
    return 401;
  }
  return null;
}

export function statusForImageUrlError(message: string): number {
  const authStatus = statusForAuthError(message);
  if (authStatus) return authStatus;
  // Token problems are server misconfiguration, not bad client input.
  if (message.startsWith('UPLOADTHING_TOKEN')) return 500;
  if (message === 'fileKey or url is required' || message === 'Invalid image URL') {
    return 400;
  }
  if (message === 'Failed to generate signed URL') return 502;
  return 500;
}
