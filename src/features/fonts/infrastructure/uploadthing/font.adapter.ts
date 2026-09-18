import { getFirebaseIdToken } from '@/features/auth/infrastructure/firebase/get-id-token';
import type { FontAssetPort, FontAssetRef } from '@/features/fonts/domain/ports/font-asset.port';
import { parseFontAssetKey } from '@/features/fonts/domain/ports/font-asset.port';
import {
  extractFileKeyFromUploadthingUrl,
  resolveCloudImageAccess,
  resolveImageDeleteUrl,
  uploadFiles,
} from '@/features/template/infrastructure/uploadthing/client';

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
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
    const extension = mime.includes('woff2')
      ? 'woff2'
      : mime.includes('woff')
        ? 'woff'
        : mime.includes('otf')
          ? 'otf'
          : 'ttf';
    const file = dataUrlToFile(data, `${parsed.faceKey}.${extension}`);
    const previousFileKey = ref.fileKey;

    const uploaded = await uploadFiles('plannerFont', {
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
    const fileKey = ref.fileKey ?? (ref.url ? extractFileKeyFromUploadthingUrl(ref.url) : null);
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
    if (!ref.fileKey && !ref.key) return;

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
      body: JSON.stringify({
        fileKey: ref.fileKey,
        key: ref.key,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? 'Failed to delete cloud font');
    }
  }

  async exists(ref: FontAssetRef): Promise<boolean> {
    return Boolean(ref.fileKey || ref.url);
  }
}
