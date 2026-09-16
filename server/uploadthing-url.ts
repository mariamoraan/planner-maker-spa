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

export function getUploadthingAppId(): string {
  const token = process.env.UPLOADTHING_TOKEN;
  if (!token) {
    throw new Error('UPLOADTHING_TOKEN is not configured');
  }
  try {
    const parsed = JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as {
      appId?: string;
    };
    if (typeof parsed.appId !== 'string' || !parsed.appId) {
      throw new Error('UPLOADTHING_TOKEN missing appId');
    }
    return parsed.appId;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('UPLOADTHING_TOKEN')) {
      throw error;
    }
    throw new Error('UPLOADTHING_TOKEN is invalid');
  }
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

export function statusForImageUrlError(message: string): number {
  if (message === 'Forbidden' || message.includes('Unauthorized')) return 403;
  if (
    message === 'fileKey or url is required' ||
    message === 'Invalid image URL' ||
    message === 'UPLOADTHING_TOKEN is not configured' ||
    message === 'UPLOADTHING_TOKEN is invalid' ||
    message === 'UPLOADTHING_TOKEN missing appId'
  ) {
    return 400;
  }
  if (message === 'Failed to generate signed URL') return 502;
  return 500;
}
