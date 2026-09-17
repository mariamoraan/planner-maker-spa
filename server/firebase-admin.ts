import { cert, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { applyServerSecrets, loadServerSecrets, validateServerSecrets } from './load-env.js';

let adminApp: App | null = null;
let secretsLoaded = false;

function ensureSecretsLoaded(): void {
  if (secretsLoaded) return;
  const secrets = loadServerSecrets();
  validateServerSecrets(secrets);
  applyServerSecrets(secrets);
  secretsLoaded = true;
}

/** Google emits snake_case keys; `cert()` accepts them alongside the camelCase type. */
type ServiceAccountJson = ServiceAccount & { private_key?: string };

function normalizeServiceAccount(raw: ServiceAccountJson): ServiceAccountJson {
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
    return normalizeServiceAccount(JSON.parse(decoded) as ServiceAccountJson);
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

/**
 * Load server secrets, returning the failure reason instead of throwing.
 *
 * Handlers call this per request rather than at module scope: a throw while the
 * module is evaluating surfaces on Vercel as an opaque FUNCTION_INVOCATION_FAILED
 * with no message anywhere, which makes a simple missing env var undiagnosable.
 * The messages name configuration keys only, never their values.
 */
export function tryPreloadFirebaseAdmin(cwd = process.cwd()): string | null {
  try {
    preloadFirebaseAdminFromEnv(cwd);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Server is misconfigured';
  }
}
