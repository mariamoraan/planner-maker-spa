import { describe, expect, it } from 'vitest';
import {
  contentTicketExpiresAt,
  isContentProxyUrl,
  isDisplaySrcFresh,
} from './content-ticket';

const HOUR_MS = 60 * 60 * 1000;

function contentUrl(exp: number): string {
  const body = btoa(JSON.stringify({ fileKey: 'abc', uid: 'u1', exp }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `https://app.test/api/images/content?t=${encodeURIComponent(`${body}.signature`)}`;
}

describe('isContentProxyUrl', () => {
  it('recognizes the same-origin content proxy', () => {
    expect(isContentProxyUrl('/api/images/content?t=abc')).toBe(true);
    expect(isContentProxyUrl('https://app.test/api/images/content?t=abc')).toBe(true);
  });

  it('rejects unrelated URLs', () => {
    expect(isContentProxyUrl('https://app.ufs.sh/f/key')).toBe(false);
    expect(isContentProxyUrl('data:image/png;base64,AAAA')).toBe(false);
  });
});

describe('contentTicketExpiresAt', () => {
  it('reads the expiry embedded in the ticket', () => {
    const exp = Date.now() + 3 * HOUR_MS;
    expect(contentTicketExpiresAt(contentUrl(exp))).toBe(exp);
  });

  it('returns null for non-proxy URLs and unreadable tickets', () => {
    expect(contentTicketExpiresAt('data:image/png;base64,AAAA')).toBeNull();
    expect(contentTicketExpiresAt('/api/images/content')).toBeNull();
    expect(contentTicketExpiresAt('/api/images/content?t=not-base64.sig')).toBeNull();
  });
});

describe('isDisplaySrcFresh', () => {
  it('treats data URLs and unsigned links as never expiring', () => {
    expect(isDisplaySrcFresh('data:image/png;base64,AAAA')).toBe(true);
    expect(isDisplaySrcFresh('https://app.ufs.sh/f/key')).toBe(true);
  });

  it('treats an empty src as not renderable', () => {
    expect(isDisplaySrcFresh('')).toBe(false);
  });

  it('accepts a content ticket that is still valid', () => {
    expect(isDisplaySrcFresh(contentUrl(Date.now() + 3 * HOUR_MS))).toBe(true);
  });

  it('rejects a content ticket that has lapsed', () => {
    expect(isDisplaySrcFresh(contentUrl(Date.now() - HOUR_MS))).toBe(false);
  });

  it('rejects a ticket inside the expiry skew so loads are not started too late', () => {
    expect(isDisplaySrcFresh(contentUrl(Date.now() + 10_000))).toBe(false);
  });

  it('honours the expires param on signed CDN URLs', () => {
    const base = 'https://app.ufs.sh/f/key?signature=hmac-sha256%3Dabc&expires=';
    expect(isDisplaySrcFresh(`${base}${Date.now() + 3 * HOUR_MS}`)).toBe(true);
    expect(isDisplaySrcFresh(`${base}${Date.now() - HOUR_MS}`)).toBe(false);
  });

  it('accepts signed CDN expiries expressed in seconds', () => {
    const seconds = Math.floor((Date.now() + 3 * HOUR_MS) / 1000);
    expect(isDisplaySrcFresh(`https://app.ufs.sh/f/key?expires=${seconds}`)).toBe(true);
  });
});
