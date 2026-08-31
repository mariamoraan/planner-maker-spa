import {
  getInfra,
  buildLocalImageRef,
  buildLegacyImageKey,
  buildUploadthingImageRef,
  isCloudImageStorageEnabled,
} from '@/core/bootstrap/infra';
import type { ImageRef } from '@/features/template/domain/ports/image-asset.port';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';

export function resolvePageImageRef(
  uid: string | null,
  pageId: string,
  existing?: ImageRef,
): ImageRef {
  if (existing) return { ...existing };
  if (uid && isCloudImageStorageEnabled()) return buildUploadthingImageRef(uid, pageId);
  if (uid) return buildLocalImageRef(uid, pageId);
  return { provider: 'local', key: buildLegacyImageKey(pageId) };
}

export async function persistPageImageAsset(
  imageRef: ImageRef,
  imageData: string,
): Promise<string> {
  await getInfra().images.save(imageRef, imageData);
  if (imageData.startsWith('data:')) {
    return imageData;
  }
  return (await getInfra().images.load(imageRef)) ?? imageData;
}

export async function syncPageImageRefIfCloud(
  uid: string | null,
  templateId: string,
  pageId: string,
  imageRef: ImageRef,
): Promise<void> {
  if (!uid || !imageRef.url) return;
  await getInfra().templates.updatePage(uid, templateId, pageId, { imageRef });
}

export async function applyPageImageData(
  templateId: string,
  pageId: string,
  imageData: string,
): Promise<void> {
  const store = useTemplateStore.getState();
  const template = store.getTemplate(templateId);
  const page = template?.images.find(p => p.id === pageId);
  if (!page) return;

  const uid = store.syncUid;
  const imageRef = resolvePageImageRef(uid, pageId, page.imageRef);
  const resolvedSrc = await persistPageImageAsset(imageRef, imageData);

  store.updateImage(templateId, pageId, {
    src: resolvedSrc,
    imageRef,
    missingLocalAsset: false,
  });

  await syncPageImageRefIfCloud(uid, templateId, pageId, imageRef);
}
