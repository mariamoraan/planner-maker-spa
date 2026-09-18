import type {
  ImageAssetPort,
  ImageRef,
  ImageSaveOptions,
} from '@/features/template/domain/ports/image-asset.port';
import { fetchAsDataUrl, isDataUrl, isHttpUrl } from '@/core/functions/image-data-url';

function isSameOriginContentUrl(src: string): boolean {
  return src.includes('/api/images/content');
}

export class CachingImageAdapter implements ImageAssetPort {
  constructor(
    private readonly primary: ImageAssetPort,
    private readonly cache: ImageAssetPort
  ) {}

  async save(ref: ImageRef, data: string, options?: ImageSaveOptions): Promise<void> {
    await this.cache.delete(ref).catch(() => undefined);
    await this.primary.save(ref, data, options);
    // Persist original upload bytes locally for instant reload / offline.
    if (isDataUrl(data)) {
      await this.cache.save(ref, data);
    }
  }

  async load(ref: ImageRef): Promise<string | null> {
    const cached = await this.cache.load(ref);
    // Only trust durable data URLs. Stale HTTP CDN entries cause broken <img>.
    if (cached && isDataUrl(cached)) {
      return cached;
    }

    const remote = await this.primary.load(ref);
    if (!remote) return null;

    if (isDataUrl(remote)) {
      await this.cache.save(ref, remote).catch(() => undefined);
      return remote;
    }

    // Hydrate IndexedDB from the same-origin content proxy so later loads
    // do not depend on CDN or another proxy round-trip.
    if (isSameOriginContentUrl(remote)) {
      const absolute =
        remote.startsWith('/') && typeof window !== 'undefined'
          ? `${window.location.origin}${remote}`
          : remote;
      const dataUrl = await fetchAsDataUrl(absolute);
      if (dataUrl) {
        await this.cache.save(ref, dataUrl).catch(() => undefined);
        return dataUrl;
      }
    }

    if (cached && isHttpUrl(cached)) {
      // Drop unusable HTTP cache entries so we do not keep preferring them.
      await this.cache.delete(ref).catch(() => undefined);
    }

    return remote;
  }

  async delete(ref: ImageRef): Promise<void> {
    let primaryError: unknown;
    try {
      await this.primary.delete(ref);
    } catch (error) {
      primaryError = error;
    }
    await this.cache.delete(ref).catch(() => undefined);
    if (primaryError) throw primaryError;
  }

  async exists(ref: ImageRef): Promise<boolean> {
    if (await this.cache.exists(ref)) return true;
    return this.primary.exists(ref);
  }
}
