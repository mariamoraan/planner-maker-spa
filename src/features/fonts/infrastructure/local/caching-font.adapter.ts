import type { FontAssetPort, FontAssetRef } from '@/features/fonts/domain/ports/font-asset.port';
import { fetchAsDataUrl, isDataUrl, isHttpUrl } from '@/core/functions/image-data-url';

function isSameOriginContentUrl(src: string): boolean {
  return src.includes('/api/images/content');
}

export class CachingFontAdapter implements FontAssetPort {
  constructor(
    private readonly primary: FontAssetPort,
    private readonly cache: FontAssetPort,
  ) {}

  async save(ref: FontAssetRef, data: string): Promise<void> {
    await this.cache.delete(ref).catch(() => undefined);
    await this.primary.save(ref, data);
    if (isDataUrl(data)) {
      await this.cache.save(ref, data);
    }
  }

  async load(ref: FontAssetRef): Promise<string | null> {
    const cached = await this.cache.load(ref);
    if (cached && isDataUrl(cached)) {
      return cached;
    }

    const remote = await this.primary.load(ref);
    if (!remote) return null;

    if (isDataUrl(remote)) {
      await this.cache.save(ref, remote).catch(() => undefined);
      return remote;
    }

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
      await this.cache.delete(ref).catch(() => undefined);
    }

    return remote;
  }

  async delete(ref: FontAssetRef): Promise<void> {
    await Promise.allSettled([this.primary.delete(ref), this.cache.delete(ref)]);
  }

  async exists(ref: FontAssetRef): Promise<boolean> {
    if (await this.cache.exists(ref)) return true;
    return this.primary.exists(ref);
  }
}
