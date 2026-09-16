import dns from 'node:dns';
import {
  generateSignedUploadthingUrl,
  buildOfficialFileUrl,
  getUploadthingAppId,
  isLegacyUtfsUrl,
} from './uploadthing-url';
import { verifyImageTicket } from './image-access';

// Prefer IPv4 — Node often hangs on broken IPv6 routes to CDNs.
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Older Node versions may not support this.
}

const UPSTREAM_TIMEOUT_MS = 8_000;

async function fetchUpstreamImage(downloadUrl: string): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch(downloadUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': 'planner-maker-spa/image-proxy',
      },
    });
    if (!upstream.ok) {
      throw new Error(`Upstream image fetch failed (${upstream.status})`);
    }
    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.byteLength === 0) {
      throw new Error('Upstream image fetch returned empty body');
    }
    return { buffer, contentType };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Upstream image fetch timed out');
    }
    if (error instanceof Error && error.message === 'fetch failed') {
      const cause = (error as Error & { cause?: { code?: string; message?: string } }).cause;
      const detail = cause?.code || cause?.message;
      throw new Error(detail ? `Upstream fetch failed (${detail})` : 'Upstream fetch failed');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve ticket → image bytes. Always streams through this server (no 302 to CDN),
 * because browser redirects to ufs.sh were hanging / leaving thumbs blank.
 */
export async function loadImageBytesForTicket(ticket: string): Promise<{
  buffer: Buffer;
  contentType: string;
  fileKey: string;
}> {
  const { fileKey } = verifyImageTicket(ticket);

  const candidates: string[] = [];
  try {
    const signed = await generateSignedUploadthingUrl(fileKey);
    if (!isLegacyUtfsUrl(signed)) candidates.push(signed);
  } catch (error) {
    console.warn('[image-content] sign failed:', error);
  }
  candidates.push(buildOfficialFileUrl(fileKey, getUploadthingAppId()));

  const errors: string[] = [];
  for (const candidate of candidates) {
    try {
      const loaded = await fetchUpstreamImage(candidate);
      return { ...loaded, fileKey };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upstream fetch failed';
      errors.push(message);
      console.warn('[image-content] upstream failed:', message);
    }
  }

  throw new Error(errors[0] ?? 'Failed to load image content');
}

export function statusForImageContentError(message: string): number {
  if (message === 'Invalid ticket' || message === 'Ticket expired') return 403;
  if (message === 'ticket is required') return 400;
  if (
    message.startsWith('Upstream image fetch failed') ||
    message.startsWith('Upstream fetch failed') ||
    message === 'Upstream image fetch timed out' ||
    message === 'Upstream image fetch returned empty body' ||
    message === 'Failed to load image content'
  ) {
    return 502;
  }
  return 500;
}
