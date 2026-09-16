import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  buildOfficialFileUrl,
  extractFileKeyFromUrl,
  generateSignedUploadthingUrl,
  getUploadthingAppId,
  isLegacyUtfsUrl,
  type ImageUrlResolveBody,
} from './uploadthing-url';

const TICKET_TTL_MS = 6 * 60 * 60 * 1000;

type TicketPayload = {
  fileKey: string;
  uid: string;
  exp: number;
};

function ticketSecret(): string {
  const token = process.env.UPLOADTHING_TOKEN;
  if (!token) throw new Error('UPLOADTHING_TOKEN is not configured');
  return token;
}

function b64urlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function b64urlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function createImageTicket(uid: string, fileKey: string): string {
  const payload: TicketPayload = {
    fileKey,
    uid,
    exp: Date.now() + TICKET_TTL_MS,
  };
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = createHmac('sha256', ticketSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyImageTicket(ticket: string): TicketPayload {
  const [body, sig] = ticket.split('.');
  if (!body || !sig) throw new Error('Invalid ticket');

  const expected = createHmac('sha256', ticketSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid ticket');
  }

  const payload = JSON.parse(b64urlDecode(body)) as TicketPayload;
  if (!payload?.fileKey || !payload?.uid || !payload?.exp) {
    throw new Error('Invalid ticket');
  }
  if (Date.now() > payload.exp) {
    throw new Error('Ticket expired');
  }
  return payload;
}

export type ResolvedImageAccess = {
  /**
   * Signed CDN URL (browser → UploadThing).
   * Client should use this as srcAlt; many networks cannot reach `*.ufs.sh`.
   */
  url: string;
  /** Same-origin proxy path — preferred primary display src for <img>/Konva. */
  contentPath: string;
  fileKey: string;
};

function resolveFileKey(body: ImageUrlResolveBody): string {
  const { fileKey: inputFileKey, url, key } = body;

  let fileKey = inputFileKey;
  if (!fileKey && url) {
    fileKey = extractFileKeyFromUrl(url) ?? undefined;
  }
  if (!fileKey && key) {
    fileKey = key;
  }
  if (!fileKey) {
    throw new Error('fileKey or url is required');
  }
  return fileKey;
}

/** Issue a same-origin content ticket + signed CDN URL. */
export async function resolveUploadthingImageAccess(
  uid: string,
  body: ImageUrlResolveBody
): Promise<ResolvedImageAccess> {
  const fileKey = resolveFileKey(body);
  const official = buildOfficialFileUrl(fileKey, getUploadthingAppId());

  let signedUrl = official;
  try {
    signedUrl = await generateSignedUploadthingUrl(
      fileKey,
      body.key && fileKey === body.key ? { keyType: 'customId' } : { keyType: 'fileKey' }
    );
    if (isLegacyUtfsUrl(signedUrl)) {
      signedUrl = official;
    }
  } catch (error) {
    console.warn('[image-access] sign failed, using official URL:', error);
  }

  const ticket = createImageTicket(uid, fileKey);
  return {
    url: signedUrl,
    contentPath: `/api/images/content?t=${encodeURIComponent(ticket)}`,
    fileKey,
  };
}
