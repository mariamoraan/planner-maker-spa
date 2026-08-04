import type { VercelRequest, VercelResponse } from '@vercel/node';
import { UTApi } from 'uploadthing/server';
import { assertKeyBelongsToUser, verifyFirebaseToken, preloadFirebaseAdminFromEnv } from '../../server/firebase-admin';

preloadFirebaseAdminFromEnv();

type DeleteBody = {
  fileKey?: string;
  key?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const uid = await verifyFirebaseToken(req.headers.authorization);
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as DeleteBody;
    const { fileKey, key } = body ?? {};

    if (!fileKey) {
      res.status(400).json({ error: 'fileKey is required' });
      return;
    }

    if (key) {
      assertKeyBelongsToUser(key, uid);
    }

    const utapi = new UTApi();
    await utapi.deleteFiles(fileKey);

    res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    const status = message === 'Forbidden' || message.includes('Unauthorized') ? 403 : 500;
    res.status(status).json({ error: message });
  }
}
