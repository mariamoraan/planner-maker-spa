export type ImageRef = {
  provider: 'local' | 'uploadthing' | 'firebase' | 'r2' | string;
  key: string;
  url?: string;
  fileKey?: string;
};

export interface ImageAssetPort {
  save(ref: ImageRef, data: string): Promise<void>;
  load(ref: ImageRef): Promise<string | null>;
  delete(ref: ImageRef): Promise<void>;
  exists(ref: ImageRef): Promise<boolean>;
}

export function isCloudImageStorageEnabled(): boolean {
  return import.meta.env.VITE_IMAGE_STORAGE === 'cloud';
}

export function buildLocalImageRef(uid: string, pageId: string): ImageRef {
  return { provider: 'local', key: `${uid}/${pageId}` };
}

export function buildUploadthingImageRef(uid: string, pageId: string, url?: string, fileKey?: string): ImageRef {
  return {
    provider: 'uploadthing',
    key: `${uid}/${pageId}`,
    url,
    fileKey,
  };
}

export function buildLegacyImageKey(pageId: string): string {
  return `image-${pageId}`;
}

export function pageIdFromImageRefKey(key: string): string {
  const slashIndex = key.lastIndexOf('/');
  return slashIndex >= 0 ? key.slice(slashIndex + 1) : key;
}
