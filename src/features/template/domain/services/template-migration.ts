import { collection, doc, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { get as idbGet, del as idbDel } from 'idb-keyval';
import {
  getInfra,
  isCloudImageStorageEnabled,
  buildUploadthingImageRef,
} from '@/core/bootstrap/infra';
import { getFirebaseDb } from '@/features/auth/infrastructure/firebase/config';
import {
  buildLegacyImageKey,
  buildLocalImageRef,
} from '@/features/template/domain/ports/image-asset.port';
import type { ImageRef } from '@/features/template/domain/ports/image-asset.port';
import type { Template, TemplateImage } from '@/features/template';
import type { TemplatePageRecord } from '@/features/template/domain/ports/template.port';

const LEGACY_STORAGE_KEY = 'planner-templates';

function migrationKey(uid: string): string {
  return `planner-migrated-${uid}`;
}

function cloudMigrationKey(uid: string): string {
  return `planner-cloud-images-migrated-${uid}`;
}

type LegacyPersistedState = {
  state?: {
    templates?: Template[];
  };
};

function readLegacyTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacyPersistedState;
    const templates =
      parsed.state?.templates ??
      (parsed as unknown as { templates?: Template[] }).templates ??
      [];
    return templates.map(t => ({
      ...t,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
      startDate: t.startDate ? new Date(t.startDate) : undefined,
      endDate: t.endDate ? new Date(t.endDate) : undefined,
      images: t.images.map(img => ({
        ...img,
        createdAt: new Date(img.createdAt),
        updatedAt: new Date(img.updatedAt),
        src: '',
      })),
    }));
  } catch {
    return [];
  }
}

async function loadLegacyImageData(pageId: string): Promise<string | null> {
  return (await idbGet<string>(buildLegacyImageKey(pageId))) ?? null;
}

function toPageRecord(uid: string, image: TemplateImage): TemplatePageRecord {
  return {
    id: image.id,
    name: image.name,
    type: image.type,
    width: image.width,
    height: image.height,
    rectangles: image.rectangles,
    imageRef: buildLocalImageRef(uid, image.id),
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  };
}

function hasMigrated(uid: string): boolean {
  return localStorage.getItem(migrationKey(uid)) === '1';
}

function markMigrated(uid: string): void {
  localStorage.setItem(migrationKey(uid), '1');
}

function hasCloudMigrated(uid: string): boolean {
  return localStorage.getItem(cloudMigrationKey(uid)) === '1';
}

function markCloudMigrated(uid: string): void {
  localStorage.setItem(cloudMigrationKey(uid), '1');
}

async function hasRemoteTemplates(uid: string): Promise<boolean> {
  const snap = await getDocs(collection(getFirebaseDb(), 'users', uid, 'templates'));
  return !snap.empty;
}

function normalizeImageRef(value: unknown): ImageRef | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const ref = value as Record<string, unknown>;
  if (typeof ref.key !== 'string' || !ref.key) return undefined;
  return {
    provider: typeof ref.provider === 'string' ? ref.provider : 'local',
    key: ref.key,
    url: typeof ref.url === 'string' ? ref.url : undefined,
    fileKey: typeof ref.fileKey === 'string' ? ref.fileKey : undefined,
  };
}

export async function migrateLocalTemplatesToFirebase(uid: string): Promise<boolean> {
  if (hasMigrated(uid)) return false;

  const legacyTemplates = readLegacyTemplates();

  if (legacyTemplates.length === 0 || (await hasRemoteTemplates(uid))) {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    markMigrated(uid);
    return false;
  }

  const { templates: repo, images } = getInfra();

  for (const template of legacyTemplates) {
    await repo.createTemplate(uid, template);

    for (let index = 0; index < template.images.length; index++) {
      const image = template.images[index];
      const page = toPageRecord(uid, image);
      await repo.createPage(uid, template.id, page, index);

      const legacyData = await loadLegacyImageData(image.id);
      if (legacyData) {
        await images.save(page.imageRef, legacyData);
        if (page.imageRef.url) {
          await repo.updatePage(uid, template.id, image.id, { imageRef: page.imageRef });
        }
      }
    }
  }

  localStorage.removeItem(LEGACY_STORAGE_KEY);
  markMigrated(uid);
  return true;
}

export async function migrateLocalImagesToCloud(uid: string): Promise<boolean> {
  if (!isCloudImageStorageEnabled() || hasCloudMigrated(uid)) return false;

  const db = getFirebaseDb();
  const { images, templates: repo } = getInfra();
  let migratedAny = false;

  const templatesSnap = await getDocs(collection(db, 'users', uid, 'templates'));

  for (const templateDoc of templatesSnap.docs) {
    const templateId = templateDoc.id;
    const pagesSnap = await getDocs(
      collection(db, 'users', uid, 'templates', templateId, 'pages')
    );

    for (const pageDoc of pagesSnap.docs) {
      const data = pageDoc.data();
      const pageId = pageDoc.id;
      const imageRef = normalizeImageRef(data.imageRef);

      if (!imageRef || imageRef.provider === 'uploadthing') continue;
      if (imageRef.url) continue;

      const candidates = [
        imageRef,
        buildLocalImageRef(uid, pageId),
        { provider: 'local', key: buildLegacyImageKey(pageId) },
      ];

      let localData: string | null = null;
      for (const candidate of candidates) {
        localData = (await idbGet<string>(candidate.key)) ?? null;
        if (localData) break;
      }

      if (!localData) continue;

      const cloudRef = buildUploadthingImageRef(uid, pageId);
      await images.save(cloudRef, localData);

      if (!cloudRef.url) continue;

      await repo.updatePage(uid, templateId, pageId, { imageRef: cloudRef });

      for (const candidate of candidates) {
        if (candidate.provider === 'local') {
          await idbDel(candidate.key).catch(() => undefined);
        }
      }

      migratedAny = true;
    }
  }

  markCloudMigrated(uid);
  return migratedAny;
}

/** One-time repair: persist deduped pageOrder if duplicates exist in Firestore. */
export async function repairDuplicatePageOrder(uid: string): Promise<void> {
  const db = getFirebaseDb();
  const templatesSnap = await getDocs(collection(db, 'users', uid, 'templates'));

  for (const templateDoc of templatesSnap.docs) {
    const data = templateDoc.data();
    const pageOrder = (data.pageOrder as string[]) ?? [];
    const deduped = pageOrder.filter((id, i) => pageOrder.indexOf(id) === i);

    if (deduped.length !== pageOrder.length) {
      await updateDoc(doc(db, 'users', uid, 'templates', templateDoc.id), {
        pageOrder: deduped,
        updatedAt: serverTimestamp(),
      });
    }
  }
}
