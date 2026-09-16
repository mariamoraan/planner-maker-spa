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

/** Resolve signed CDN + same-origin content URLs for a cloud image. */
export async function resolveCloudImageAccess(
  input: CloudImageResolveInput
): Promise<CloudImageAccess | null> {
  if (!input.url && !input.fileKey && !input.key) return null;

  try {
    const token = await getFirebaseIdToken();
    if (!token) return null;

    const response = await fetch(resolveImageUrlApi(), {
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

    if (!response.ok) return null;
    const payload = (await response.json()) as {
      url?: string;
      contentUrl?: string;
      fileKey?: string;
    };

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
  } catch {
    return null;
  }
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
