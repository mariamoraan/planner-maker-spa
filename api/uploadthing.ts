import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRouteHandler } from 'uploadthing/server';
import { preloadFirebaseAdminFromEnv } from '../server/firebase-admin';
import { uploadRouter } from '../server/uploadthing/core';

preloadFirebaseAdminFromEnv();
const routeHandler = createRouteHandler({ router: uploadRouter });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const protocol = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https';
  const host = req.headers.host ?? 'localhost';
  const url = `${protocol}://${host}${req.url ?? '/api/uploadthing'}`;

  let body: BodyInit | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (typeof req.body === 'string') {
      body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      body = req.body;
    } else if (req.body != null) {
      body = JSON.stringify(req.body);
    }
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      value.forEach(entry => headers.append(key, entry));
    } else {
      headers.set(key, value);
    }
  }

  const request = new Request(url, {
    method: req.method,
    headers,
    body,
  });

  const response = await routeHandler(request);

  res.status(response.status);
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  res.send(buffer);
}
