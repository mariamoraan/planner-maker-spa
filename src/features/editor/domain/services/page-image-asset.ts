import {
  getInfra,
  buildLocalImageRef,
  buildLegacyImageKey,
  buildUploadthingImageRef,
  isCloudImageStorageEnabled,
} from '@/core/bootstrap/infra';
import {
  PlanLimitError,
  formatBytesLimit,
  resolvePlanLimits,
  resolveUserPlan,
} from '@/core/plans';
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
  options?: { templateId?: string },
): Promise<string> {
  const limits = resolvePlanLimits(resolveUserPlan());
  if (imageData.startsWith('data:')) {
    const comma = imageData.indexOf(',');
    const base64 = comma >= 0 ? imageData.slice(comma + 1) : imageData;
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    const bytes = Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
    if (bytes > limits.maxImageBytes) {
      throw new PlanLimitError(
        'imageSize',
        `Images must be ${formatBytesLimit(limits.maxImageBytes)} or smaller on the free plan.`,
      );
    }
  }

  await getInfra().images.save(imageRef, imageData, {
    templateId: options?.templateId,
  });
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
  // fileKey is what makes the image recoverable later; url is only a convenience.
  if (!uid || (!imageRef.fileKey && !imageRef.url)) return;
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
  const resolvedSrc = await persistPageImageAsset(imageRef, imageData, { templateId });

  store.updateImage(templateId, pageId, {
    src: resolvedSrc,
    imageRef,
    missingLocalAsset: false,
  });

  await syncPageImageRefIfCloud(uid, templateId, pageId, imageRef);
}
