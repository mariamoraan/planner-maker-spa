import { getFirebaseIdToken } from '@/features/auth/infrastructure/firebase/get-id-token';
import type { FontAssetPort, FontAssetRef } from '@/features/fonts/domain/ports/font-asset.port';
import { parseFontAssetKey } from '@/features/fonts/domain/ports/font-asset.port';
import {
  resolveCloudImageAccess,
  resolveImageDeleteUrl,
  resolveUploadthingFileKey,
  uploadFiles,
} from '@/features/template/infrastructure/uploadthing/client';

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64 = ''] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  // UploadThing blob route accepts any type; empty MIME from some browsers breaks uploads.
  const safeMime = mime && mime !== 'null' ? mime : 'application/octet-stream';
  return new File([bytes], filename, { type: safeMime });
}

function extensionFromFileName(fileName: string | undefined, mime: string): string {
  const fromName = fileName?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (fromName === 'ttf' || fromName === 'otf' || fromName === 'woff' || fromName === 'woff2') {
    return fromName;
  }
  if (mime.includes('woff2')) return 'woff2';
  if (mime.includes('woff')) return 'woff';
  if (mime.includes('otf')) return 'otf';
  return 'ttf';
}

const sessionSrcCache = new Map<string, string>();

function sessionCacheKey(ref: FontAssetRef): string {
  return ref.fileKey || ref.url || ref.key;
}

export class UploadthingFontAdapter implements FontAssetPort {
  async save(ref: FontAssetRef, data: string): Promise<void> {
    const token = await getFirebaseIdToken(true);
    if (!token) {
      throw new Error('You must be signed in to upload fonts to the cloud');
    }

    const parsed = parseFontAssetKey(ref.key);
    if (!parsed) {
      throw new Error('Invalid font asset key');
    }

    const mime = data.match(/^data:(.*?);/)?.[1] ?? 'application/octet-stream';
    const extension = extensionFromFileName(undefined, mime);
    const file = dataUrlToFile(data, `${parsed.faceKey}.${extension}`);
    const previousFileKey = resolveUploadthingFileKey(ref) ?? undefined;

    let uploaded;
    try {
      uploaded = await uploadFiles('plannerFont', {
        files: [file],
        input: {
          fontId: parsed.fontId,
          faceKey: parsed.faceKey,
          idToken: token,
          previousFileKey,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      } as Parameters<typeof uploadFiles>[1]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UploadThing error';
      throw new Error(`UploadThing plannerFont failed: ${message}`);
    }
    const result = uploaded[0];
    if (!result) {
      throw new Error('Font upload failed');
    }

    const serverData = result.serverData as { url?: string; key?: string; fileKey?: string } | null;
    const fileKey = serverData?.fileKey ?? result.key;
    const candidates = [result.ufsUrl, serverData?.url, result.url].filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );
    const official = candidates.find(value => {
      try {
        const host = new URL(value).hostname.toLowerCase();
        return host.endsWith('.ufs.sh') || host === 'ufs.sh';
      } catch {
        return false;
      }
    });

    if (!fileKey && !official) {
      throw new Error('Font upload completed without a file URL');
    }

    ref.provider = 'uploadthing';
    ref.fileKey = fileKey;
    ref.url = official ?? candidates[0];
    sessionSrcCache.delete(sessionCacheKey(ref));
  }

  async load(ref: FontAssetRef): Promise<string | null> {
    const fileKey = resolveUploadthingFileKey(ref);
    if (!fileKey && !ref.url) return null;

    const cacheKey = sessionCacheKey(ref);
    const cached = sessionSrcCache.get(cacheKey);
    if (cached) return cached;

    const access = await resolveCloudImageAccess({
      fileKey: fileKey ?? undefined,
      url: ref.url,
      key: ref.key,
    });
    if (!access) return null;

    const src = access.contentUrl || access.url;
    if (!src) return null;

    sessionSrcCache.set(cacheKey, src);
    return src;
  }

  async delete(ref: FontAssetRef): Promise<void> {
    const fileKey = resolveUploadthingFileKey(ref);
    if (!fileKey) {
      if (ref.provider === 'uploadthing') {
        console.warn('[uploadthing] font delete skipped: missing fileKey', ref.key);
      }
      return;
    }

    const token = await getFirebaseIdToken();
    if (!token) {
      throw new Error('You must be signed in to delete cloud fonts');
    }

    sessionSrcCache.delete(sessionCacheKey(ref));

    const response = await fetch(resolveImageDeleteUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileKey }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? 'Failed to delete cloud font');
    }
  }

  async exists(ref: FontAssetRef): Promise<boolean> {
    return Boolean(resolveUploadthingFileKey(ref) || ref.url);
  }
}
