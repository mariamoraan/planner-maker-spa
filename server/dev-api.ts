import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRouteHandler } from 'uploadthing/server';
import { UTApi } from 'uploadthing/server';
import { assertKeyBelongsToUser, verifyFirebaseToken, preloadFirebaseAdminFromEnv } from './firebase-admin';
import { uploadRouter } from './uploadthing/core';

let uploadthingHandler: ReturnType<typeof createRouteHandler> | null = null;

function getUploadthingHandler() {
  if (!uploadthingHandler) {
    preloadFirebaseAdminFromEnv();
    uploadthingHandler = createRouteHandler({ router: uploadRouter });
  }
  return uploadthingHandler;
}

async function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function toWebRequest(req: IncomingMessage, url: URL, body?: Buffer): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      value.forEach(entry => headers.append(key, entry));
    } else {
      headers.set(key, value);
    }
  }

  return new Request(`${url.protocol}//${url.host}${url.pathname}${url.search}`, {
    method: req.method,
    headers,
    body: body?.length ? body : undefined,
  });
}

async function sendWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
}

export function loadServerEnv(env: Record<string, string>): void {
  preloadFirebaseAdminFromEnv();
  if (env.UPLOADTHING_TOKEN) {
    process.env.UPLOADTHING_TOKEN = env.UPLOADTHING_TOKEN.replace(/^['"]|['"]$/g, '');
  }
}

export async function handleUploadthingApi(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const body =
    req.method !== 'GET' && req.method !== 'HEAD' ? await readRequestBody(req) : undefined;
  const request = toWebRequest(req, url, body);
  const response = await getUploadthingHandler()(request);
  await sendWebResponse(res, response);
}

type DeleteBody = {
  fileKey?: string;
  key?: string;
};

export async function handleImageDeleteApi(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const rawBody = await readRequestBody(req);
    const body = JSON.parse(rawBody.toString('utf8') || '{}') as DeleteBody;
    const uid = await verifyFirebaseToken(req.headers.authorization);
    const { fileKey, key } = body ?? {};

    if (!fileKey) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'fileKey is required' }));
      return;
    }

    if (key) {
      assertKeyBelongsToUser(key, uid);
    }

    const utapi = new UTApi();
    await utapi.deleteFiles(fileKey);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    const status = message === 'Forbidden' || message.includes('Unauthorized') ? 403 : 500;
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: message }));
  }
}

export function isDevApiPath(pathname: string): boolean {
  return pathname === '/api/uploadthing' || pathname === '/api/images/delete';
}

export async function handleDevApi(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
): Promise<boolean> {
  if (url.pathname === '/api/uploadthing') {
    await handleUploadthingApi(req, res, url);
    return true;
  }

  if (url.pathname === '/api/images/delete') {
    await handleImageDeleteApi(req, res);
    return true;
  }

  return false;
}
