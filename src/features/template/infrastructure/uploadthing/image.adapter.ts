import { getFirebaseIdToken } from '@/features/auth/infrastructure/firebase/get-id-token';
import type { ImageAssetPort, ImageRef } from '@/features/template/domain/ports/image-asset.port';
import { pageIdFromImageRefKey } from '@/features/template/domain/ports/image-asset.port';
import { resolveImageDeleteUrl, uploadFiles } from '@/features/template/infrastructure/uploadthing/client';

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

function extensionForMime(mime: string): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  return 'png';
}

export class UploadthingImageAdapter implements ImageAssetPort {
  async save(ref: ImageRef, data: string): Promise<void> {
    const token = await getFirebaseIdToken(true);
    if (!token) {
      throw new Error('You must be signed in to upload images to the cloud');
    }

    const pageId = pageIdFromImageRefKey(ref.key);
    const mime = data.match(/^data:(.*?);/)?.[1] ?? 'image/png';
    const file = dataUrlToFile(data, `${pageId}.${extensionForMime(mime)}`);

    const uploaded = await uploadFiles('plannerImage', {
      files: [file],
      input: { pageId, idToken: token },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = uploaded[0];
    if (!result) {
      throw new Error('Upload failed');
    }

    const serverData = result.serverData as { url?: string; key?: string; fileKey?: string } | null;
    const url = serverData?.url ?? result.url ?? result.ufsUrl;
    const fileKey = serverData?.fileKey ?? result.key;

    if (!url) {
      throw new Error('Upload completed without a file URL');
    }

    ref.provider = 'uploadthing';
    ref.url = url;
    ref.fileKey = fileKey;
  }

  async load(ref: ImageRef): Promise<string | null> {
    return ref.url ?? null;
  }

  async delete(ref: ImageRef): Promise<void> {
    if (!ref.fileKey) return;

    const token = await getFirebaseIdToken();
    if (!token) {
      throw new Error('You must be signed in to delete cloud images');
    }

    const response = await fetch(resolveImageDeleteUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileKey: ref.fileKey,
        key: ref.key,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? 'Failed to delete cloud image');
    }
  }

  async exists(ref: ImageRef): Promise<boolean> {
    return Boolean(ref.url);
  }
}
