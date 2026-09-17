import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { tryPreloadFirebaseAdmin } from '../../server/firebase-admin.js';
import { openImageStreamForTicket, statusForImageContentError } from '../../server/image-content.js';

/**
 * Same-origin image bytes for <img src>.
 * Auth is the short-lived HMAC ticket in ?t= (img tags cannot send Bearer headers).
 * Always proxied — never 302 to CDN (browser CDN loads were hanging).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const configError = tryPreloadFirebaseAdmin();
  if (configError) {
    console.error('[api/images/content] configuration error:', configError);
    res.status(500).json({ error: configError, kind: 'configuration' });
    return;
  }

  try {
    const ticket = typeof req.query.t === 'string' ? req.query.t : null;
    if (!ticket) {
      res.status(400).json({ error: 'ticket is required' });
      return;
    }

    const { body, contentType, contentLength } = await openImageStreamForTicket(ticket);

    res.status(200);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    if (req.method === 'HEAD') {
      await body.cancel().catch(() => undefined);
      res.end();
      return;
    }

    // Streaming keeps large artwork under Vercel's 4.5 MB buffered-response cap.
    await pipeline(Readable.fromWeb(body), res);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Content resolve failed';
    console.error('[api/images/content]', message);
    if (res.headersSent) {
      res.end();
      return;
    }
    res.status(statusForImageContentError(message)).json({ error: message });
  }
}
