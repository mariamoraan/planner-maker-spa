export type FontAssetRef = {
  provider: 'local' | 'uploadthing' | string;
  key: string;
  url?: string;
  fileKey?: string;
};

export function isCloudFontStorageEnabled(): boolean {
  return import.meta.env.VITE_IMAGE_STORAGE === 'cloud';
}

export function fontFaceKey(weight: number, style: string): string {
  return `${weight}-${style}`;
}

export function buildLocalFontAssetRef(
  uid: string,
  fontId: string,
  faceKey: string,
): FontAssetRef {
  return { provider: 'local', key: `${uid}/fonts/${fontId}/${faceKey}` };
}

export function buildUploadthingFontAssetRef(
  uid: string,
  fontId: string,
  faceKey: string,
  url?: string,
  fileKey?: string,
): FontAssetRef {
  return {
    provider: 'uploadthing',
    key: `${uid}/fonts/${fontId}/${faceKey}`,
    url,
    fileKey,
  };
}

/** Parse `${uid}/fonts/${fontId}/${faceKey}` → parts for upload input. */
export function parseFontAssetKey(key: string): {
  uid: string;
  fontId: string;
  faceKey: string;
} | null {
  const parts = key.split('/');
  if (parts.length < 4 || parts[1] !== 'fonts') return null;
  const [uid, , fontId, faceKey] = parts;
  if (!uid || !fontId || !faceKey) return null;
  return { uid, fontId, faceKey };
}
