import { describe, expect, it } from 'vitest';
import { resolveUploadthingFileKey } from '@/features/template/infrastructure/uploadthing/client';

describe('resolveUploadthingFileKey', () => {
  it('prefers an explicit fileKey', () => {
    expect(
      resolveUploadthingFileKey({
        fileKey: 'abc123',
        url: 'https://app.ufs.sh/f/other',
      }),
    ).toBe('abc123');
  });

  it('extracts fileKey from a CDN URL when missing', () => {
    expect(
      resolveUploadthingFileKey({
        url: 'https://abc.ufs.sh/f/my%2Ffile-key',
      }),
    ).toBe('my/file-key');
  });

  it('returns null when neither fileKey nor a usable URL is present', () => {
    expect(resolveUploadthingFileKey({})).toBeNull();
    expect(resolveUploadthingFileKey({ url: 'https://example.com/f/nope' })).toBeNull();
  });
});
