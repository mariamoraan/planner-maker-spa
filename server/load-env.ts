import fs from 'node:fs';
import path from 'node:path';

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readEnvFileValue(key: string, cwd = process.cwd()): string | undefined {
  for (const file of ['.env.local', '.env']) {
    const filePath = path.join(cwd, file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (!trimmed.startsWith(`${key}=`)) continue;
      return stripQuotes(trimmed.slice(key.length + 1));
    }
  }

  return undefined;
}

export type ServerSecrets = {
  uploadthingToken?: string;
  firebaseServiceAccount?: string;
};

export function loadServerSecrets(cwd = process.cwd()): ServerSecrets {
  const uploadthingToken =
    readEnvFileValue('UPLOADTHING_TOKEN', cwd) ?? process.env.UPLOADTHING_TOKEN;
  const accountPath =
    readEnvFileValue('FIREBASE_SERVICE_ACCOUNT_PATH', cwd) ??
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  let firebaseServiceAccount =
    readEnvFileValue('FIREBASE_SERVICE_ACCOUNT', cwd) ??
    process.env.FIREBASE_SERVICE_ACCOUNT;

  if (accountPath) {
    const resolved = path.resolve(cwd, accountPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH not found: ${resolved}`);
    }
    firebaseServiceAccount = fs.readFileSync(resolved, 'utf8');
  }

  return {
    uploadthingToken: uploadthingToken?.trim() || undefined,
    firebaseServiceAccount: firebaseServiceAccount?.trim() || undefined,
  };
}

export function applyServerSecrets(secrets: ServerSecrets): void {
  if (secrets.uploadthingToken) {
    process.env.UPLOADTHING_TOKEN = secrets.uploadthingToken;
  }
  if (secrets.firebaseServiceAccount) {
    process.env.FIREBASE_SERVICE_ACCOUNT = secrets.firebaseServiceAccount;
  }
}

export function validateServerSecrets(secrets: ServerSecrets): void {
  if (!secrets.uploadthingToken) {
    throw new Error('UPLOADTHING_TOKEN is not configured');
  }

  if (!secrets.firebaseServiceAccount) {
    throw new Error(
      'Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH in .env'
    );
  }

  try {
    const raw = secrets.firebaseServiceAccount.trim();
    const decoded = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    JSON.parse(decoded);
  } catch {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT is invalid. Use single-quoted JSON on one line or FIREBASE_SERVICE_ACCOUNT_PATH'
    );
  }
}
