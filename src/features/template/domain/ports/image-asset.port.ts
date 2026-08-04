import type { ImageRef } from '../value-objects/image-ref';

export interface ImageAssetPort {
  save(ref: ImageRef, data: string): Promise<void>;
  load(ref: ImageRef): Promise<string | null>;
  delete(ref: ImageRef): Promise<void>;
  exists(ref: ImageRef): Promise<boolean>;
}

export type { ImageRef } from '../value-objects/image-ref';
export {
  isCloudImageStorageEnabled,
  buildLocalImageRef,
  buildUploadthingImageRef,
  buildLegacyImageKey,
  pageIdFromImageRefKey,
} from '../value-objects/image-ref';
