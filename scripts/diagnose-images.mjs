/**
 * Diagnostic: cross-check Firestore page imageRefs against the UploadThing app.
 * Usage: node scripts/diagnose-images.mjs [.env|.env.prod]
 */
import fs from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { UTApi } from 'uploadthing/server';

const envFile = process.argv[2] ?? '.env';
const env = {};
for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.slice(0, i)] = v;
}
process.env.UPLOADTHING_TOKEN = env.UPLOADTHING_TOKEN;

const appId = JSON.parse(Buffer.from(env.UPLOADTHING_TOKEN, 'base64').toString('utf8')).appId;
console.log(`env=${envFile}  firebase=${env.VITE_FIREBASE_PROJECT_ID}  utAppId=${appId}\n`);

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'))) });
const db = getFirestore();
const utapi = new UTApi();

// Inventory every file in the UploadThing app.
const utFiles = new Map();
let cursor = 0;
for (;;) {
  const page = await utapi.listFiles({ limit: 500, offset: cursor });
  for (const f of page.files) utFiles.set(f.key, f);
  if (!page.hasMore || page.files.length === 0) break;
  cursor += page.files.length;
}
console.log(`UploadThing files in app: ${utFiles.size}\n`);

const stats = { total: 0, noRef: 0, localRef: 0, noFileKey: 0, fileKeyMissingInUT: 0, ok: 0 };
const problems = [];

for (const u of (await db.collection('users').get()).docs) {
  for (const t of (await u.ref.collection('templates').get()).docs) {
    for (const p of (await t.ref.collection('pages').get()).docs) {
      stats.total += 1;
      const ref = p.get('imageRef');
      const label = `${u.id.slice(0, 6)}…/${t.get('name')}/${p.id.slice(0, 8)}…`;

      if (!ref) { stats.noRef += 1; problems.push(`NO imageRef          ${label}`); continue; }
      if (ref.provider !== 'uploadthing') { stats.localRef += 1; problems.push(`provider=${ref.provider}  ${label}`); continue; }
      if (!ref.fileKey) {
        stats.noFileKey += 1;
        problems.push(`NO fileKey (url=${ref.url ? 'yes' : 'no'})  ${label}`);
        continue;
      }
      if (!utFiles.has(ref.fileKey)) {
        stats.fileKeyMissingInUT += 1;
        problems.push(`fileKey NOT in UT app  ${label}  ${ref.fileKey}`);
        continue;
      }
      stats.ok += 1;
    }
  }
}

console.log('--- per-page results ---');
for (const line of problems) console.log('  ' + line);
console.log('\n--- totals ---');
console.log(stats);

// Verify one healthy fileKey still fetches end-to-end.
const healthy = [...utFiles.values()][0];
if (healthy) {
  const signed = await utapi.generateSignedURL(healthy.key, { expiresIn: '6h' });
  const r = await fetch(signed.ufsUrl);
  console.log(`\nsigned fetch sample: ${r.status} ${r.headers.get('content-type')} ${r.headers.get('content-length')}B`);
}
