import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assertKeyBelongsToUser, verifyFirebaseToken, preloadFirebaseAdminFromEnv } from '../../server/firebase-admin';
import { resolveUploadthingImageAccess } from '../../server/image-access';
import { statusForImageUrlError, type ImageUrlResolveBody } from '../../server/uploadthing-url';

preloadFirebaseAdminFromEnv();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const uid = await verifyFirebaseToken(req.headers.authorization);
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as ImageUrlResolveBody;
    const { fileKey, url, key } = body ?? {};

    if (!fileKey && !url && !key) {
      res.status(400).json({ error: 'fileKey or url is required' });
      return;
    }

    if (key) {
      assertKeyBelongsToUser(key, uid);
    }

    const access = await resolveUploadthingImageAccess(uid, { fileKey, url, key });
    res.status(200).json({
      url: access.url,
      contentUrl: access.contentPath,
      fileKey: access.fileKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'URL resolve failed';
    res.status(statusForImageUrlError(message)).json({ error: message });
  }
}
