/**
 * Invoke an api/ handler the way Vercel does: ESM, cwd without any .env files,
 * secrets only in process.env. Reproduces module-load crashes locally.
 *
 * Usage: node scripts/simulate-vercel-fn.mjs [.env.prod]
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const repo = path.resolve(import.meta.dirname, '..');
const envFile = path.join(repo, process.argv[2] ?? '.env.prod');

const env = {};
for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.slice(0, i)] = v;
}

// Exactly what Vercel holds: token + inline base64 service account, no _PATH.
process.env.UPLOADTHING_TOKEN = env.UPLOADTHING_TOKEN;
process.env.FIREBASE_SERVICE_ACCOUNT = fs
  .readFileSync(path.join(repo, env.FIREBASE_SERVICE_ACCOUNT_PATH))
  .toString('base64');
delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

// No .env files on disk, like /var/task.
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'vercel-sim-'));
process.chdir(sandbox);
console.log(`cwd=${sandbox} (no .env files)`);
console.log(`UPLOADTHING_TOKEN len=${process.env.UPLOADTHING_TOKEN?.length}`);
console.log(`FIREBASE_SERVICE_ACCOUNT len=${process.env.FIREBASE_SERVICE_ACCOUNT?.length}\n`);

function fakeRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; return this; },
    json(payload) { this.body = payload; return this; },
    send(payload) { this.body = payload; return this; },
    end(payload) { if (payload !== undefined) this.body = payload; return this; },
    get headersSent() { return false; },
  };
  return res;
}

const routes = [
  ['api/images/url.ts', { method: 'POST', headers: {}, query: {}, body: {} }],
  ['api/images/content.ts', { method: 'GET', headers: {}, query: {}, body: undefined }],
  ['api/uploadthing.ts', { method: 'POST', headers: { host: 'x.test' }, query: {}, body: {}, url: '/api/uploadthing' }],
  ['api/images/delete.ts', { method: 'POST', headers: {}, query: {}, body: {} }],
];

for (const [route, req] of routes) {
  console.log(`=== ${route} ===`);
  let mod;
  try {
    mod = await import(path.join(repo, route));
  } catch (error) {
    console.log('  IMPORT FAILED (this is what causes FUNCTION_INVOCATION_FAILED)');
    console.log('  ', error?.message);
    console.log('  ', String(error?.stack).split('\n').slice(1, 4).join('\n   '));
    continue;
  }

  const res = fakeRes();
  try {
    await mod.default(req, res);
    const body = typeof res.body === 'object' ? JSON.stringify(res.body) : String(res.body).slice(0, 160);
    console.log(`  handler ok -> ${res.statusCode} ${body}`);
  } catch (error) {
    console.log('  HANDLER THREW:', error?.message);
  }
}
