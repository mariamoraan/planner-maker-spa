import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createRouteHandler } from 'uploadthing/server';
import { UTApi } from 'uploadthing/server';
import { assertKeyBelongsToUser, verifyFirebaseToken, preloadFirebaseAdminFromEnv } from './firebase-admin.js';
import {
  statusForAuthError,
  statusForImageUrlError,
  type ImageUrlResolveBody,
} from './uploadthing-url.js';
import { resolveUploadthingImageAccess } from './image-access.js';
import { openImageStreamForTicket, statusForImageContentError } from './image-content.js';
import { uploadRouter } from './uploadthing/core.js';

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

  const body = req.method === 'POST' ? await readRequestBody(req) : undefined;
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

    if (!fileKey && !key) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'fileKey or key is required' }));
      return;
    }

    if (key) {
      assertKeyBelongsToUser(key, uid);
    }

    const utapi = new UTApi();

    if (fileKey) {
      await utapi.deleteFiles(fileKey);
    } else if (key) {
      await utapi.deleteFiles(key, { keyType: 'customId' });
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    res.statusCode = statusForAuthError(message) ?? 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: message }));
  }
}

export async function handleImageUrlApi(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const rawBody = await readRequestBody(req);
    const body = JSON.parse(rawBody.toString('utf8') || '{}') as ImageUrlResolveBody;
    const uid = await verifyFirebaseToken(req.headers.authorization);
    const { fileKey, url, key } = body ?? {};

    if (!fileKey && !url && !key) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'fileKey or url is required' }));
      return;
    }

    if (key) {
      assertKeyBelongsToUser(key, uid);
    }

    const access = await resolveUploadthingImageAccess(uid, { fileKey, url, key });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        url: access.url,
        contentUrl: access.contentPath,
        fileKey: access.fileKey,
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'URL resolve failed';
    res.statusCode = statusForImageUrlError(message);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: message }));
  }
}

export async function handleImageContentApi(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const ticket = url.searchParams.get('t');
    if (!ticket) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'ticket is required' }));
      return;
    }

    const { body, contentType, contentLength } = await openImageStreamForTicket(ticket);

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    if (req.method === 'HEAD') {
      await body.cancel().catch(() => undefined);
      res.end();
      return;
    }

    await pipeline(Readable.fromWeb(body), res);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Content resolve failed';
    console.error('[dev-api/images/content]', message);
    if (res.headersSent) {
      res.end();
      return;
    }
    res.statusCode = statusForImageContentError(message);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: message }));
  }
}

export function isDevApiPath(pathname: string): boolean {
  return (
    pathname === '/api/uploadthing' ||
    pathname === '/api/images/delete' ||
    pathname === '/api/images/url' ||
    pathname === '/api/images/content'
  );
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

  if (url.pathname === '/api/images/url') {
    await handleImageUrlApi(req, res);
    return true;
  }

  if (url.pathname === '/api/images/content') {
    await handleImageContentApi(req, res, url);
    return true;
  }

  return false;
}
