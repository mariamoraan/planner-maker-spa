import type { VercelRequest, VercelResponse } from '@vercel/node';
import { preloadFirebaseAdminFromEnv } from '../../server/firebase-admin';
import { loadImageBytesForTicket, statusForImageContentError } from '../../server/image-content';

preloadFirebaseAdminFromEnv();

/**
 * Same-origin image bytes for <img src>.
 * Auth is the short-lived HMAC ticket in ?t= (img tags cannot send Bearer headers).
 * Always streams bytes — never 302 to CDN (browser CDN loads were hanging).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const ticket = typeof req.query.t === 'string' ? req.query.t : null;
    if (!ticket) {
      res.status(400).json({ error: 'ticket is required' });
      return;
    }

    const { buffer, contentType } = await loadImageBytesForTicket(ticket);

    res.status(200);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('Content-Length', String(buffer.byteLength));
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Content resolve failed';
    console.error('[api/images/content]', message);
    res.status(statusForImageContentError(message)).json({ error: message });
  }
}
