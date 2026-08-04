import { cert, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { applyServerSecrets, loadServerSecrets, validateServerSecrets } from './load-env';

let adminApp: App | null = null;
let secretsLoaded = false;

function ensureSecretsLoaded(): void {
  if (secretsLoaded) return;
  const secrets = loadServerSecrets();
  validateServerSecrets(secrets);
  applyServerSecrets(secrets);
  secretsLoaded = true;
}

function normalizeServiceAccount(raw: ServiceAccount): ServiceAccount {
  if (typeof raw.private_key === 'string') {
    raw.private_key = raw.private_key.replace(/\\n/g, '\n');
  }
  return raw;
}

function parseServiceAccount(): ServiceAccount {
  ensureSecretsLoaded();

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured');
  }

  try {
    const decoded = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    return normalizeServiceAccount(JSON.parse(decoded) as ServiceAccount);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT must be valid JSON or base64-encoded JSON');
  }
}

function ensureAdminApp(): App {
  if (adminApp) return adminApp;

  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  adminApp = initializeApp({
    credential: cert(parseServiceAccount()),
  });
  return adminApp;
}

function extractBearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<string> {
  const token = idToken.trim();
  if (!token) {
    throw new Error('Missing Firebase ID token');
  }

  ensureAdminApp();
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid;
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'auth/unknown';
    throw new Error(`Firebase token verification failed (${code})`);
  }
}

export async function verifyFirebaseToken(authHeader: string | null | undefined): Promise<string> {
  const token = extractBearerToken(authHeader);
  if (!token) {
    throw new Error('Missing or invalid Authorization header');
  }
  return verifyFirebaseIdToken(token);
}

export function assertKeyBelongsToUser(key: string, uid: string): void {
  const prefix = `${uid}/`;
  if (!key.startsWith(prefix) || key.length <= prefix.length) {
    throw new Error('Forbidden');
  }
}

export function preloadFirebaseAdminFromEnv(cwd = process.cwd()): void {
  if (secretsLoaded) return;
  const secrets = loadServerSecrets(cwd);
  validateServerSecrets(secrets);
  applyServerSecrets(secrets);
  secretsLoaded = true;
}
