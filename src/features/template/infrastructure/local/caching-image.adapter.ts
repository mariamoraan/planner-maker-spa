import type { ImageAssetPort, ImageRef } from '@/features/template/domain/ports/image-asset.port';
import { ensureDataUrl, isDataUrl, isHttpUrl } from '@/core/functions/image-data-url';

export class CachingImageAdapter implements ImageAssetPort {
  constructor(
    private readonly primary: ImageAssetPort,
    private readonly cache: ImageAssetPort
  ) {}

  private async normalizeForCache(data: string): Promise<string> {
    if (isDataUrl(data)) return data;
    if (isHttpUrl(data)) {
      const converted = await ensureDataUrl(data);
      return converted;
    }
    return data;
  }

  async save(ref: ImageRef, data: string): Promise<void> {
    await this.cache.delete(ref).catch(() => undefined);
    await this.primary.save(ref, data);
    const fromPrimary = (await this.primary.load(ref)) ?? ref.url ?? data;
    const toCache = isDataUrl(data)
      ? data
      : await this.normalizeForCache(fromPrimary);
    await this.cache.save(ref, toCache);
  }

  async load(ref: ImageRef): Promise<string | null> {
    const cached = await this.cache.load(ref);
    if (cached) {
      if (isHttpUrl(cached)) {
        const dataUrl = await ensureDataUrl(cached);
        if (dataUrl !== cached) {
          await this.cache.save(ref, dataUrl);
        }
        return dataUrl;
      }
      return cached;
    }

    const remote = await this.primary.load(ref);
    if (!remote) return null;

    const resolved = await this.normalizeForCache(remote);
    await this.cache.save(ref, resolved);
    return resolved;
  }

  async delete(ref: ImageRef): Promise<void> {
    await Promise.allSettled([this.primary.delete(ref), this.cache.delete(ref)]);
  }

  async exists(ref: ImageRef): Promise<boolean> {
    if (await this.cache.exists(ref)) return true;
    return this.primary.exists(ref);
  }
}
