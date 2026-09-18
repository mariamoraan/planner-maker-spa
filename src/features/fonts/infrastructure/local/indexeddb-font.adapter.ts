import { get, set, del } from 'idb-keyval';
import type { FontAssetPort, FontAssetRef } from '@/features/fonts/domain/ports/font-asset.port';

export class IndexedDBFontAdapter implements FontAssetPort {
  async save(ref: FontAssetRef, data: string): Promise<void> {
    await set(ref.key, data);
  }

  async load(ref: FontAssetRef): Promise<string | null> {
    const value = await get<string>(ref.key);
    return value ?? null;
  }

  async delete(ref: FontAssetRef): Promise<void> {
    await del(ref.key);
  }

  async exists(ref: FontAssetRef): Promise<boolean> {
    const value = await get(ref.key);
    return value != null;
  }
}
