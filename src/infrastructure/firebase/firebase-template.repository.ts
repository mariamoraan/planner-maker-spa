import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe as FirestoreUnsubscribe,
} from 'firebase/firestore';
import type { Template, TemplateImage, Rectangle } from '@/types/planner';
import type {
  TemplatePageRecord,
  TemplateRecord,
  TemplateRepositoryPort,
  Unsubscribe,
} from '../ports/template.port';
import { getFirebaseDb } from './firebase-config';

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  return new Date();
}

function mapPage(id: string, data: Record<string, unknown>): TemplatePageRecord {
  return {
    id,
    name: String(data.name ?? ''),
    type: data.type as TemplateImage['type'],
    width: Number(data.width ?? 0),
    height: Number(data.height ?? 0),
    rectangles: (data.rectangles as Rectangle[]) ?? [],
    imageRef: data.imageRef as TemplatePageRecord['imageRef'],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function dedupePageOrder(pageOrder: string[]): string[] {
  const seen = new Set<string>();
  return pageOrder.filter(id => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function mapTemplate(
  id: string,
  data: Record<string, unknown>,
  pages: TemplatePageRecord[]
): Template {
  const rawOrder = (data.pageOrder as string[]) ?? pages.map(p => p.id);
  const pageOrder = dedupePageOrder(rawOrder);
  const pageMap = new Map(pages.map(p => [p.id, p]));
  const images: TemplateImage[] = pageOrder
    .map(pageId => pageMap.get(pageId))
    .filter((p): p is TemplatePageRecord => p != null)
    .map(p => ({ ...p, src: '' }));

  return {
    id,
    name: String(data.name ?? ''),
    description: data.description ? String(data.description) : undefined,
    images,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    startDate: data.startDate ? toDate(data.startDate) : undefined,
    endDate: data.endDate ? toDate(data.endDate) : undefined,
    locale: data.locale as Template['locale'],
  };
}

function templatesRef(uid: string) {
  return collection(getFirebaseDb(), 'users', uid, 'templates');
}

function templateRef(uid: string, templateId: string) {
  return doc(getFirebaseDb(), 'users', uid, 'templates', templateId);
}

function pageRef(uid: string, templateId: string, pageId: string) {
  return doc(getFirebaseDb(), 'users', uid, 'templates', templateId, 'pages', pageId);
}

function pagesRef(uid: string, templateId: string) {
  return collection(getFirebaseDb(), 'users', uid, 'templates', templateId, 'pages');
}

export class FirebaseTemplateRepository implements TemplateRepositoryPort {
  subscribe(uid: string, onChange: (templates: Template[]) => void): Unsubscribe {
    const pageUnsubs = new Map<string, FirestoreUnsubscribe>();
    let templateMeta = new Map<string, Record<string, unknown>>();
    let pagesByTemplate = new Map<string, TemplatePageRecord[]>();

    const emit = () => {
      const templates = Array.from(templateMeta.entries())
        .map(([id, data]) => mapTemplate(id, data, pagesByTemplate.get(id) ?? []))
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      onChange(templates);
    };

    const unsubTemplates = onSnapshot(templatesRef(uid), snap => {
      const activeIds = new Set(snap.docs.map(d => d.id));

      for (const [id, unsub] of pageUnsubs) {
        if (!activeIds.has(id)) {
          unsub();
          pageUnsubs.delete(id);
          templateMeta.delete(id);
          pagesByTemplate.delete(id);
        }
      }

      snap.docs.forEach(docSnap => {
        templateMeta.set(docSnap.id, docSnap.data());
        if (pageUnsubs.has(docSnap.id)) return;

        const unsubPages = onSnapshot(pagesRef(uid, docSnap.id), pagesSnap => {
          pagesByTemplate.set(
            docSnap.id,
            pagesSnap.docs.map(d => mapPage(d.id, d.data()))
          );
          emit();
        });
        pageUnsubs.set(docSnap.id, unsubPages);
      });

      if (snap.empty) {
        templateMeta.clear();
        pagesByTemplate.clear();
        emit();
      }
    });

    return () => {
      unsubTemplates();
      pageUnsubs.forEach(u => u());
      pageUnsubs.clear();
    };
  }

  async createTemplate(uid: string, template: Template): Promise<void> {
    await setDoc(templateRef(uid, template.id), {
      name: template.name,
      description: template.description ?? null,
      pageOrder: [],
      startDate: template.startDate ?? null,
      endDate: template.endDate ?? null,
      locale: template.locale ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async updateTemplate(
    uid: string,
    templateId: string,
    updates: Partial<TemplateRecord>
  ): Promise<void> {
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description ?? null;
    if (updates.pageOrder !== undefined) payload.pageOrder = updates.pageOrder;
    if (updates.startDate !== undefined) payload.startDate = updates.startDate ?? null;
    if (updates.endDate !== undefined) payload.endDate = updates.endDate ?? null;
    if (updates.locale !== undefined) payload.locale = updates.locale ?? null;
    await updateDoc(templateRef(uid, templateId), payload);
  }

  async deleteTemplate(uid: string, templateId: string): Promise<void> {
    const batch = writeBatch(getFirebaseDb());
    const pages = await getDocs(pagesRef(uid, templateId));
    pages.docs.forEach(d => batch.delete(d.ref));
    batch.delete(templateRef(uid, templateId));
    await batch.commit();
  }

  async createPage(
    uid: string,
    templateId: string,
    page: TemplatePageRecord,
    index: number
  ): Promise<void> {
    const tRef = templateRef(uid, templateId);
    const tSnap = await getDoc(tRef);
    const pageOrder = dedupePageOrder((tSnap.data()?.pageOrder as string[]) ?? []);
    const pageExists = pageOrder.includes(page.id);

    const batch = writeBatch(getFirebaseDb());
    batch.set(pageRef(uid, templateId, page.id), {
      name: page.name,
      type: page.type,
      width: page.width,
      height: page.height,
      rectangles: page.rectangles,
      imageRef: page.imageRef,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    if (!pageExists) {
      const nextOrder = [...pageOrder];
      const clampedIndex = Math.max(0, Math.min(index, nextOrder.length));
      nextOrder.splice(clampedIndex, 0, page.id);
      batch.update(tRef, { pageOrder: nextOrder, updatedAt: serverTimestamp() });
    } else {
      batch.update(tRef, { updatedAt: serverTimestamp() });
    }

    await batch.commit();
  }

  async updatePage(
    uid: string,
    templateId: string,
    pageId: string,
    updates: Partial<TemplatePageRecord>
  ): Promise<void> {
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.width !== undefined) payload.width = updates.width;
    if (updates.height !== undefined) payload.height = updates.height;
    if (updates.rectangles !== undefined) payload.rectangles = updates.rectangles;
    if (updates.imageRef !== undefined) payload.imageRef = updates.imageRef;
    await updateDoc(pageRef(uid, templateId, pageId), payload);
    await updateDoc(templateRef(uid, templateId), { updatedAt: serverTimestamp() });
  }

  async deletePage(uid: string, templateId: string, pageId: string): Promise<void> {
    const tRef = templateRef(uid, templateId);
    const tSnap = await getDoc(tRef);
    const pageOrder = ((tSnap.data()?.pageOrder as string[]) ?? []).filter(id => id !== pageId);

    const batch = writeBatch(getFirebaseDb());
    batch.delete(pageRef(uid, templateId, pageId));
    batch.update(tRef, { pageOrder, updatedAt: serverTimestamp() });
    await batch.commit();
  }

  async setPageOrder(uid: string, templateId: string, pageOrder: string[]): Promise<void> {
    await updateDoc(templateRef(uid, templateId), {
      pageOrder,
      updatedAt: serverTimestamp(),
    });
  }

  async updatePageRectangles(
    uid: string,
    templateId: string,
    pageId: string,
    rectangles: Rectangle[]
  ): Promise<void> {
    await updateDoc(pageRef(uid, templateId, pageId), {
      rectangles,
      updatedAt: serverTimestamp(),
    });
    await updateDoc(templateRef(uid, templateId), { updatedAt: serverTimestamp() });
  }
}
