import type { VercelRequest, VercelResponse } from '@vercel/node';
import { UTApi } from 'uploadthing/server';
import { assertKeyBelongsToUser, verifyFirebaseToken, tryPreloadFirebaseAdmin } from '../../server/firebase-admin.js';
import { statusForAuthError } from '../../server/uploadthing-url.js';

type DeleteBody = {
  fileKey?: string;
  key?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const configError = tryPreloadFirebaseAdmin();
  if (configError) {
    console.error('[api/images/delete] configuration error:', configError);
    res.status(500).json({ error: configError, kind: 'configuration' });
    return;
  }

  try {
    const uid = await verifyFirebaseToken(req.headers.authorization);
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as DeleteBody;
    const { fileKey, key } = body ?? {};

    if (!fileKey && !key) {
      res.status(400).json({ error: 'fileKey or key is required' });
      return;
    }

    if (key) {
      assertKeyBelongsToUser(key, uid);
    }

    const utapi = new UTApi();

    if (fileKey) {
      await utapi.deleteFiles(fileKey);
    }

    if (key) {
      await utapi.deleteFiles(key, { keyType: 'customId' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    res.status(statusForAuthError(message) ?? 500).json({ error: message });
  }
}
