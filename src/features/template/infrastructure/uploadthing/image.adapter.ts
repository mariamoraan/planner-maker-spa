import { getFirebaseIdToken } from '@/features/auth/infrastructure/firebase/get-id-token';
import { isDataUrl } from '@/core/functions/image-data-url';
import type {
  ImageAssetPort,
  ImageRef,
  ImageSaveOptions,
} from '@/features/template/domain/ports/image-asset.port';
import { pageIdFromImageRefKey } from '@/features/template/domain/ports/image-asset.port';
import {
  resolveCloudImageAccess,
  resolveImageDeleteUrl,
  resolveUploadthingFileKey,
  uploadFiles,
  type CloudImageAccess,
} from '@/features/template/infrastructure/uploadthing/client';
import { isDisplaySrcFresh } from '@/features/template/infrastructure/uploadthing/content-ticket';

export { resolveUploadthingFileKey } from '@/features/template/infrastructure/uploadthing/client';

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

const sessionSrcCache = new Map<string, { src: string; srcAlt?: string }>();

/** Last resolved access per cache key — used to populate TemplateImage.srcAlt. */
const lastAccessByKey = new Map<string, CloudImageAccess>();

function sessionCacheKey(ref: ImageRef): string {
  return ref.fileKey || ref.url || ref.key;
}

export function getCloudSrcAlt(ref: ImageRef | undefined): string | undefined {
  if (!ref) return undefined;
  const key = sessionCacheKey(ref);
  const cached = sessionSrcCache.get(key);
  if (cached?.srcAlt && isDisplaySrcFresh(cached.srcAlt)) return cached.srcAlt;
  const access = lastAccessByKey.get(key);
  if (!access) return undefined;
  // Primary display is contentUrl; CDN signed URL is the fallback alt.
  if (access.url && access.url !== access.contentUrl && isDisplaySrcFresh(access.url)) {
    return access.url;
  }
  return undefined;
}

export class UploadthingImageAdapter implements ImageAssetPort {
  async save(ref: ImageRef, data: string, options?: ImageSaveOptions): Promise<void> {
    const token = await getFirebaseIdToken(true);
    if (!token) {
      throw new Error('You must be signed in to upload images to the cloud');
    }

    const templateId = options?.templateId;
    if (!templateId) {
      throw new Error('templateId is required to upload images to the cloud');
    }

    const pageId = pageIdFromImageRefKey(ref.key);
    const mime = data.match(/^data:(.*?);/)?.[1] ?? 'image/png';
    const file = dataUrlToFile(data, `${pageId}.${extensionForMime(mime)}`);
    const previousFileKey = resolveUploadthingFileKey(ref) ?? undefined;

    // UploadThing drops `input` from opts types when strictNullChecks is off.
    const uploaded = await uploadFiles('plannerImage', {
      files: [file],
      input: { pageId, templateId, idToken: token, previousFileKey },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    } as Parameters<typeof uploadFiles>[1]);

    const result = uploaded[0];
    if (!result) {
      throw new Error('Upload failed');
    }

    const serverData = result.serverData as { url?: string; key?: string; fileKey?: string } | null;
    const fileKey = serverData?.fileKey ?? result.key;
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
    lastAccessByKey.delete(sessionCacheKey(ref));
  }

  async load(ref: ImageRef): Promise<string | null> {
    const fileKey = resolveUploadthingFileKey(ref);
    if (!fileKey && !ref.url) return null;

    const cacheKey = sessionCacheKey(ref);
    const cached = sessionSrcCache.get(cacheKey);
    // Reuse only while the entry is still renderable: content-proxy tickets and
    // signed CDN URLs both lapse, and a lapsed src renders as a broken image.
    if (cached && isDisplaySrcFresh(cached.src)) {
      if (
        isDataUrl(cached.src) ||
        /^https?:\/\//i.test(cached.src) ||
        cached.src.startsWith('/')
      ) {
        return cached.src;
      }
    }
    if (cached) sessionSrcCache.delete(cacheKey);

    const access = await resolveCloudImageAccess({
      fileKey: fileKey ?? undefined,
      url: ref.url,
    });
    if (!access) return null;

    lastAccessByKey.set(cacheKey, access);

    // Prefer same-origin content proxy: browser often cannot reach `*.ufs.sh`.
    // Signed CDN remains srcAlt for environments where the proxy fails.
    const src = access.contentUrl || access.url;
    if (!src) return null;

    const srcAlt = access.url && access.url !== src ? access.url : undefined;

    sessionSrcCache.set(cacheKey, { src, srcAlt });
    return src;
  }

  async delete(ref: ImageRef): Promise<void> {
    const fileKey = resolveUploadthingFileKey(ref);
    if (!fileKey) {
      if (ref.provider === 'uploadthing') {
        console.warn('[uploadthing] image delete skipped: missing fileKey', ref.key);
      }
      return;
    }

    const token = await getFirebaseIdToken();
    if (!token) {
      throw new Error('You must be signed in to delete cloud images');
    }

    sessionSrcCache.delete(sessionCacheKey(ref));
    lastAccessByKey.delete(sessionCacheKey(ref));

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
      throw new Error(payload?.error ?? 'Failed to delete cloud image');
    }
  }

  async exists(ref: ImageRef): Promise<boolean> {
    return Boolean(resolveUploadthingFileKey(ref) || ref.url);
  }
}
