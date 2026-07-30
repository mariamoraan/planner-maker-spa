import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { get as idbGet } from 'idb-keyval';
import { getInfra } from '@/infrastructure';
import { getFirebaseDb } from '@/infrastructure/firebase/firebase-config';
import {
  buildLegacyImageKey,
  buildLocalImageRef,
} from '@/infrastructure/ports/image-asset.port';
import type { Template, TemplateImage } from '@/types/planner';
import type { TemplatePageRecord } from '@/infrastructure/ports/template.port';

const LEGACY_STORAGE_KEY = 'planner-templates';

function migrationKey(uid: string): string {
  return `planner-migrated-${uid}`;
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

async function hasRemoteTemplates(uid: string): Promise<boolean> {
  const snap = await getDocs(collection(getFirebaseDb(), 'users', uid, 'templates'));
  return !snap.empty;
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
      }
    }
  }

  localStorage.removeItem(LEGACY_STORAGE_KEY);
  markMigrated(uid);
  return true;
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
