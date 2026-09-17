import { generateReactHelpers } from '@uploadthing/react';
import type { OurFileRouter } from '../../../../../server/uploadthing/core';
import { getFirebaseIdToken } from '@/features/auth/infrastructure/firebase/get-id-token';

function resolveUploadthingUrl(): string {
  const configured = import.meta.env.VITE_UPLOADTHING_URL;
  if (configured) return configured;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/uploadthing`;
  }
  return '/api/uploadthing';
}

export const { uploadFiles } = generateReactHelpers<OurFileRouter>({
  url: resolveUploadthingUrl(),
});

export function resolveImageDeleteUrl(): string {
  const configured = import.meta.env.VITE_IMAGE_DELETE_URL;
  if (configured) return configured;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/images/delete`;
  }
  return '/api/images/delete';
}

export function resolveImageUrlApi(): string {
  const configured = import.meta.env.VITE_IMAGE_URL_API;
  if (configured) return configured;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/images/url`;
  }
  return '/api/images/url';
}

export type CloudImageResolveInput = {
  url?: string;
  fileKey?: string;
  key?: string;
};

export type CloudImageAccess = {
  /**
   * Signed CDN URL (browser → UploadThing).
   * Prefer as srcAlt only — many networks cannot reach `*.ufs.sh`.
   */
  url: string;
  /**
   * Same-origin content proxy (server streams bytes).
   * Prefer as primary display src for img/Konva.
   */
  contentUrl: string;
  fileKey?: string;
};

function toAbsoluteContentUrl(contentPath: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${contentPath}`;
  }
  return contentPath;
}

type ResolvePayload = {
  url?: string;
  contentUrl?: string;
  fileKey?: string;
};

function toAccess(payload: ResolvePayload | null): CloudImageAccess | null {
  if (!payload) return null;

  const signed =
    typeof payload.url === 'string' &&
    /^https?:\/\//i.test(payload.url) &&
    !/utfs\.io/i.test(payload.url)
      ? payload.url
      : null;
  const contentPath =
    typeof payload.contentUrl === 'string' && payload.contentUrl.startsWith('/')
      ? payload.contentUrl
      : null;

  if (!signed && !contentPath) return null;

  return {
    url: signed ?? (contentPath ? toAbsoluteContentUrl(contentPath) : ''),
    contentUrl: contentPath ? toAbsoluteContentUrl(contentPath) : signed ?? '',
    fileKey: payload.fileKey,
  };
}

const RESOLVE_ATTEMPTS = 3;
const RESOLVE_BACKOFF_MS = [400, 1200];

function isRetryableStatus(status: number): boolean {
  // 401/403 can mean a stale ID token, which the next attempt force-refreshes.
  return status === 401 || status === 403 || status === 429 || status >= 500;
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Resolve signed CDN + same-origin content URLs for a cloud image.
 *
 * Retries transient failures: swallowing them leaves the page marked as a
 * missing asset, and nothing re-requests it until a full reload.
 */
export async function resolveCloudImageAccess(
  input: CloudImageResolveInput
): Promise<CloudImageAccess | null> {
  if (!input.url && !input.fileKey && !input.key) return null;

  let lastError = 'unknown error';

  for (let attempt = 0; attempt < RESOLVE_ATTEMPTS; attempt += 1) {
    const token = await getFirebaseIdToken(attempt > 0);
    if (!token) {
      lastError = 'no Firebase ID token (not signed in)';
      break;
    }

    let response: Response;
    try {
      response = await fetch(resolveImageUrlApi(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: input.url,
          fileKey: input.fileKey,
          key: input.key,
        }),
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'network error';
      if (attempt < RESOLVE_ATTEMPTS - 1) await wait(RESOLVE_BACKOFF_MS[attempt] ?? 1200);
      continue;
    }

    if (response.ok) {
      const payload = (await response.json().catch(() => null)) as ResolvePayload | null;
      const access = toAccess(payload);
      if (access) return access;
      lastError = 'response missing a usable URL';
      break;
    }

    lastError = `HTTP ${response.status}`;
    if (!isRetryableStatus(response.status)) break;
    if (attempt < RESOLVE_ATTEMPTS - 1) await wait(RESOLVE_BACKOFF_MS[attempt] ?? 1200);
  }

  console.warn('[image-access] failed to resolve cloud image:', lastError, {
    fileKey: input.fileKey,
    key: input.key,
  });
  return null;
}

/**
 * Display URL for <img>/Konva: prefer same-origin content proxy.
 * Signed CDN is only a fallback when the proxy path is unavailable.
 */
export async function resolveCloudImageUrl(
  input: CloudImageResolveInput
): Promise<string | null> {
  const access = await resolveCloudImageAccess(input);
  if (!access) return null;
  return access.contentUrl || access.url || null;
}

export function extractFileKeyFromUploadthingUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const allowed =
      host === 'ufs.sh' ||
      host === 'utfs.io' ||
      host.endsWith('.ufs.sh') ||
      host.endsWith('.utfs.io');
    if (!allowed) return null;
    const match = parsed.pathname.match(/\/f\/(.+)$/);
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}
