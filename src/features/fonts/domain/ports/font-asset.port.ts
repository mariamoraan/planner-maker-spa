import type { FontAssetRef } from '../value-objects/font-asset-ref';

export interface FontAssetPort {
  save(ref: FontAssetRef, data: string): Promise<void>;
  load(ref: FontAssetRef): Promise<string | null>;
  delete(ref: FontAssetRef): Promise<void>;
  exists(ref: FontAssetRef): Promise<boolean>;
}

export type { FontAssetRef } from '../value-objects/font-asset-ref';
export {
  isCloudFontStorageEnabled,
  fontFaceKey,
  buildLocalFontAssetRef,
  buildUploadthingFontAssetRef,
  parseFontAssetKey,
} from '../value-objects/font-asset-ref';
