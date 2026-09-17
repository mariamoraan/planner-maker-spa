/**
 * Diagnostic: exercise /api/images/url + /api/images/content against a running dev server.
 * Usage: node scripts/diagnose-endpoints.mjs [http://localhost:8080] [.env]
 */
import fs from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const origin = process.argv[2] ?? 'http://localhost:8080';
const envFile = process.argv[3] ?? '.env';

const env = {};
for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.slice(0, i)] = v;
}

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'))) });
const db = getFirestore();

// Find a real page imageRef to test with.
let target = null;
outer: for (const u of (await db.collection('users').get()).docs) {
  for (const t of (await u.ref.collection('templates').get()).docs) {
    for (const p of (await t.ref.collection('pages').get()).docs) {
      const ref = p.get('imageRef');
      if (ref?.fileKey) { target = { uid: u.id, ref }; break outer; }
    }
  }
}
if (!target) { console.log('no page with a fileKey found'); process.exit(0); }
console.log(`target uid=${target.uid.slice(0, 8)}… fileKey=${target.ref.fileKey.slice(0, 16)}…`);
console.log(`imageRef keys present: ${Object.keys(target.ref).join(', ')}\n`);

// Mint a real Firebase ID token for that uid.
const customToken = await getAuth().createCustomToken(target.uid);
const exchange = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.VITE_FIREBASE_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  }
);
const idToken = (await exchange.json()).idToken;
if (!idToken) { console.log('token exchange failed'); process.exit(1); }
console.log('minted Firebase ID token OK\n');

// 1. POST /api/images/url
const urlRes = await fetch(`${origin}/api/images/url`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileKey: target.ref.fileKey, url: target.ref.url }),
});
console.log(`POST /api/images/url -> ${urlRes.status}`);
const payload = await urlRes.json();
if (!urlRes.ok) { console.log('  body:', payload); process.exit(1); }
console.log('  signed url host :', new URL(payload.url).host);
console.log('  signed?         :', payload.url.includes('signature=') ? 'YES' : 'NO (unsigned official URL)');
console.log('  contentUrl      :', payload.contentUrl.slice(0, 48) + '…');

// 2. GET /api/images/content (the ticket path the <img> tag uses)
const contentRes = await fetch(`${origin}${payload.contentUrl}`);
console.log(`\nGET /api/images/content -> ${contentRes.status} ${contentRes.headers.get('content-type')}`);
if (contentRes.ok) {
  console.log(`  bytes: ${(await contentRes.arrayBuffer()).byteLength}`);
} else {
  console.log('  body:', await contentRes.text());
}

// 3. Browser-side fallback: the signed CDN URL (srcAlt)
const cdnRes = await fetch(payload.url);
console.log(`\nGET signed CDN (srcAlt) -> ${cdnRes.status} ${cdnRes.headers.get('content-type')}`);

// 4. What happens once the 6h ticket expires (the suspected real bug).
const expired = payload.contentUrl.replace(/t=([^&]+)/, (_m, t) => {
  const [body] = decodeURIComponent(t).split('.');
  const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  console.log(`\nticket expires at: ${new Date(p.exp).toISOString()} (in ${((p.exp - Date.now()) / 3600000).toFixed(1)}h)`);
  return `t=${t}`;
});
void expired;
