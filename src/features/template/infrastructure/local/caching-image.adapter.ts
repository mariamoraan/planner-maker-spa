import type { ImageAssetPort, ImageRef } from '@/features/template/domain/ports/image-asset.port';
import { isDataUrl, isHttpUrl } from '@/core/functions/image-data-url';

export class CachingImageAdapter implements ImageAssetPort {
  constructor(
    private readonly primary: ImageAssetPort,
    private readonly cache: ImageAssetPort
  ) {}

  async save(ref: ImageRef, data: string): Promise<void> {
    await this.cache.delete(ref).catch(() => undefined);
    await this.primary.save(ref, data);
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
    } else if (cached && isHttpUrl(cached)) {
      // Drop unusable HTTP cache entries so we do not keep preferring them.
      await this.cache.delete(ref).catch(() => undefined);
    }

    return remote;
  }

  async delete(ref: ImageRef): Promise<void> {
    await Promise.allSettled([this.primary.delete(ref), this.cache.delete(ref)]);
  }

  async exists(ref: ImageRef): Promise<boolean> {
    if (await this.cache.exists(ref)) return true;
    return this.primary.exists(ref);
  }
}
