import { afterEach, describe, expect, it } from 'vitest';
import { assertUploadthingTokenUsable, getUploadthingAppId } from './uploadthing-url';

const original = process.env.UPLOADTHING_TOKEN;

function tokenFor(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

const VALID = { apiKey: 'sk_live_abc', appId: 'app123', regions: ['sea1'] };

afterEach(() => {
  if (original === undefined) delete process.env.UPLOADTHING_TOKEN;
  else process.env.UPLOADTHING_TOKEN = original;
});

describe('UPLOADTHING_TOKEN validation', () => {
  it('reads the appId from a well-formed token', () => {
    process.env.UPLOADTHING_TOKEN = tokenFor(VALID);
    expect(getUploadthingAppId()).toBe('app123');
    expect(() => assertUploadthingTokenUsable()).not.toThrow();
  });

  it('reports a missing token', () => {
    delete process.env.UPLOADTHING_TOKEN;
    expect(() => getUploadthingAppId()).toThrow(/not configured/);
  });

  // Regression: an env value like UPLOADTHING_TOKEN='<token>'= left the quotes
  // attached. Buffer's lenient base64 still yielded an appId, so the token read
  // as valid while the UploadThing SDK rejected it and signing silently failed.
  it('rejects a token carrying stray characters instead of decoding leniently', () => {
    process.env.UPLOADTHING_TOKEN = `'${tokenFor(VALID)}'=`;
    expect(() => getUploadthingAppId()).toThrow(/not strict base64/);
  });

  it('rejects a truncated token', () => {
    process.env.UPLOADTHING_TOKEN = tokenFor(VALID).slice(0, -3);
    expect(() => getUploadthingAppId()).toThrow(/UPLOADTHING_TOKEN is invalid/);
  });

  it('rejects a token missing required fields', () => {
    process.env.UPLOADTHING_TOKEN = tokenFor({ appId: 'app123', regions: ['sea1'] });
    expect(() => getUploadthingAppId()).toThrow(/missing apiKey/);

    process.env.UPLOADTHING_TOKEN = tokenFor({ apiKey: 'sk', regions: ['sea1'] });
    expect(() => getUploadthingAppId()).toThrow(/missing appId/);

    process.env.UPLOADTHING_TOKEN = tokenFor({ apiKey: 'sk', appId: 'app123', regions: [] });
    expect(() => getUploadthingAppId()).toThrow(/missing regions/);
  });
});
