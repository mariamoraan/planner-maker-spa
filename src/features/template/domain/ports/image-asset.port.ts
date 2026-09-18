import type { ImageRef } from '../value-objects/image-ref';

export type ImageSaveOptions = {
  /** Required for cloud upload quota checks (pages per planner). */
  templateId?: string;
};

export interface ImageAssetPort {
  save(ref: ImageRef, data: string, options?: ImageSaveOptions): Promise<void>;
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
