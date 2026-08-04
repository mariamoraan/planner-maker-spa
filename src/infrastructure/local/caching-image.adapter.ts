import type { ImageAssetPort, ImageRef } from '../ports/image-asset.port';

export class CachingImageAdapter implements ImageAssetPort {
  constructor(
    private readonly primary: ImageAssetPort,
    private readonly cache: ImageAssetPort
  ) {}

  async save(ref: ImageRef, data: string): Promise<void> {
    await this.primary.save(ref, data);
    const resolved = (await this.primary.load(ref)) ?? ref.url ?? data;
    await this.cache.save(ref, resolved);
  }

  async load(ref: ImageRef): Promise<string | null> {
    const cached = await this.cache.load(ref);
    if (cached) return cached;

    const remote = await this.primary.load(ref);
    if (remote) {
      await this.cache.save(ref, remote);
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
