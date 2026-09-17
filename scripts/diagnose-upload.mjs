/**
 * Diagnostic: exercise the full /api/uploadthing upload handshake with a real
 * Firebase ID token, the same way the browser client does.
 *
 * Usage: node scripts/diagnose-upload.mjs [http://localhost:8080] [.env]
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

const serviceAccount = env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? JSON.parse(fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'))
  : JSON.parse(Buffer.from(env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'));
initializeApp({ credential: cert(serviceAccount) });

const uid = (await getFirestore().collection('users').limit(1).get()).docs[0]?.id;
if (!uid) {
  console.log('no user found in Firestore');
  process.exit(1);
}

const customToken = await getAuth().createCustomToken(uid);
const exchange = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.VITE_FIREBASE_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  }
);
const idToken = (await exchange.json()).idToken;
if (!idToken) {
  console.log('token exchange failed');
  process.exit(1);
}
console.log(`uid=${uid.slice(0, 8)}… token minted OK\n`);

// A 1x1 PNG, enough to exercise the whole presign + upload + callback chain.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

console.log('1. POST /api/uploadthing?actionType=upload&slug=plannerImage');
const presignRes = await fetch(`${origin}/api/uploadthing?actionType=upload&slug=plannerImage`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-uploadthing-package': 'diagnostic',
    'x-uploadthing-version': '7.7.4',
  },
  body: JSON.stringify({
    files: [{ name: 'probe.png', size: png.byteLength, type: 'image/png', lastModified: Date.now() }],
    input: { pageId: `diagnostic-${Date.now()}`, idToken },
  }),
});

const raw = await presignRes.text();
console.log(`   -> ${presignRes.status} ${presignRes.headers.get('content-type')}`);
if (!presignRes.ok) {
  console.log('   body:', raw.slice(0, 1200));
  process.exit(1);
}

const presign = JSON.parse(raw);
const slot = Array.isArray(presign) ? presign[0] : presign.data?.[0];
console.log(`   presigned url host: ${slot?.url ? new URL(slot.url).host : '(none)'}`);
console.log(`   fileKey: ${slot?.key ?? '(none)'}`);

console.log('\n2. PUT the bytes to the presigned URL');
const form = new FormData();
for (const [k, v] of Object.entries(slot.fields ?? {})) form.append(k, v);
form.append('file', new Blob([png], { type: 'image/png' }), 'probe.png');
const putRes = await fetch(slot.url, { method: 'PUT', body: form });
console.log(`   -> ${putRes.status}`);
const putBody = await putRes.text();
if (!putRes.ok) {
  console.log('   body:', putBody.slice(0, 600));
  process.exit(1);
}
console.log(`   body: ${putBody.slice(0, 300)}`);
console.log('\nupload chain OK');
