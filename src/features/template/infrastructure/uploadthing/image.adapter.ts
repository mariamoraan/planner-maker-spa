import { getFirebaseIdToken } from '@/features/auth/infrastructure/firebase/get-id-token';
import type { ImageAssetPort, ImageRef } from '@/features/template/domain/ports/image-asset.port';
import { pageIdFromImageRefKey } from '@/features/template/domain/ports/image-asset.port';
import {
  extractFileKeyFromUploadthingUrl,
  resolveCloudImageUrl,
  resolveImageDeleteUrl,
  uploadFiles,
} from '@/features/template/infrastructure/uploadthing/client';

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

function extensionForMime(mime: string): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  return 'png';
}

const sessionSrcCache = new Map<string, { src: string; expiresAt: number }>();
const SESSION_SRC_TTL_MS = 5 * 60 * 60 * 1000;

function sessionCacheKey(ref: ImageRef): string {
  return ref.fileKey || ref.url || ref.key;
}

export class UploadthingImageAdapter implements ImageAssetPort {
  async save(ref: ImageRef, data: string): Promise<void> {
    const token = await getFirebaseIdToken(true);
    if (!token) {
      throw new Error('You must be signed in to upload images to the cloud');
    }

    const pageId = pageIdFromImageRefKey(ref.key);
    const mime = data.match(/^data:(.*?);/)?.[1] ?? 'image/png';
    const file = dataUrlToFile(data, `${pageId}.${extensionForMime(mime)}`);
    const previousFileKey = ref.fileKey;

    const uploaded = await uploadFiles('plannerImage', {
      files: [file],
      input: { pageId, idToken: token, previousFileKey },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = uploaded[0];
    if (!result) {
      throw new Error('Upload failed');
    }

    const serverData = result.serverData as { url?: string; key?: string; fileKey?: string } | null;
    const fileKey = serverData?.fileKey ?? result.key;
    // Prefer SDK ufsUrl (appId.ufs.sh). Never trust legacy utfs.io as canonical.
    const candidates = [result.ufsUrl, serverData?.url, result.url].filter(
      (value): value is string => typeof value === 'string' && value.length > 0
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
      throw new Error('Upload completed without a file URL');
    }

    ref.provider = 'uploadthing';
    ref.fileKey = fileKey;
    ref.url = official ?? candidates[0];
    sessionSrcCache.delete(sessionCacheKey(ref));
  }

  async load(ref: ImageRef): Promise<string | null> {
    const fileKey = ref.fileKey ?? (ref.url ? extractFileKeyFromUploadthingUrl(ref.url) : null);
    if (!fileKey && !ref.url) return null;

    const cacheKey = sessionCacheKey(ref);
    const cached = sessionSrcCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.src;
    }

    // Signed CDN URL for <img> — browser talks to UploadThing directly.
    const src = await resolveCloudImageUrl({
      fileKey: fileKey ?? undefined,
      url: ref.url,
    });
    if (src) {
      sessionSrcCache.set(cacheKey, {
        src,
        expiresAt: Date.now() + SESSION_SRC_TTL_MS,
      });
      return src;
    }

    return null;
  }

  async delete(ref: ImageRef): Promise<void> {
    if (!ref.fileKey && !ref.key) return;

    const token = await getFirebaseIdToken();
    if (!token) {
      throw new Error('You must be signed in to delete cloud images');
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
      throw new Error(payload?.error ?? 'Failed to delete cloud image');
    }
  }

  async exists(ref: ImageRef): Promise<boolean> {
    return Boolean(ref.fileKey || ref.url);
  }
}
