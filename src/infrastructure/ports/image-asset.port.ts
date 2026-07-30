export type ImageRef = {
  provider: 'local' | 'firebase' | 'r2' | string;
  key: string;
};

export interface ImageAssetPort {
  save(ref: ImageRef, data: string): Promise<void>;
  load(ref: ImageRef): Promise<string | null>;
  delete(ref: ImageRef): Promise<void>;
  exists(ref: ImageRef): Promise<boolean>;
}

export function buildLocalImageRef(uid: string, pageId: string): ImageRef {
  return { provider: 'local', key: `${uid}/${pageId}` };
}

export function buildLegacyImageKey(pageId: string): string {
  return `image-${pageId}`;
}
