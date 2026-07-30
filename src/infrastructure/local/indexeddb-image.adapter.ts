import { get, set, del } from 'idb-keyval';
import type { ImageAssetPort, ImageRef } from '../ports/image-asset.port';

export class IndexedDBImageAdapter implements ImageAssetPort {
  async save(ref: ImageRef, data: string): Promise<void> {
    await set(ref.key, data);
  }

  async load(ref: ImageRef): Promise<string | null> {
    const value = await get<string>(ref.key);
    return value ?? null;
  }

  async delete(ref: ImageRef): Promise<void> {
    await del(ref.key);
  }

  async exists(ref: ImageRef): Promise<boolean> {
    const value = await get(ref.key);
    return value != null;
  }
}
