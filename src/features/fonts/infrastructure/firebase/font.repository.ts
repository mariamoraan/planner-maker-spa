import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/features/auth/infrastructure/firebase/config';
import type { CustomFontFamily, FontFaceAsset } from '@/features/fonts/domain/entities/custom-font-family';
import type { FontAssetRef } from '@/features/fonts/domain/value-objects/font-asset-ref';
import type {
  FontLibraryPort,
  Unsubscribe,
} from '@/features/fonts/domain/ports/font-library.port';

function toMillis(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object' && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return Date.now();
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => stripUndefined(item)) as T;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefined(entry)]),
    ) as T;
  }
  return value;
}

function normalizeAssetRef(value: unknown): FontAssetRef | null {
  if (!value || typeof value !== 'object') return null;
  const ref = value as Record<string, unknown>;
  if (typeof ref.key !== 'string' || !ref.key) return null;
  return {
    provider: typeof ref.provider === 'string' ? ref.provider : 'local',
    key: ref.key,
    url: typeof ref.url === 'string' ? ref.url : undefined,
    fileKey: typeof ref.fileKey === 'string' ? ref.fileKey : undefined,
  };
}

function normalizeFace(value: unknown): FontFaceAsset | null {
  if (!value || typeof value !== 'object') return null;
  const face = value as Record<string, unknown>;
  const weight = face.weight === 700 ? 700 : face.weight === 400 ? 400 : null;
  const style = face.style === 'italic' ? 'italic' : face.style === 'normal' ? 'normal' : null;
  const assetRef = normalizeAssetRef(face.assetRef);
  if (weight == null || style == null || !assetRef) return null;
  return {
    weight,
    style,
    fileName: typeof face.fileName === 'string' ? face.fileName : 'font.ttf',
    assetRef,
  };
}

function mapFont(id: string, data: Record<string, unknown>): CustomFontFamily {
  const faces = Array.isArray(data.faces)
    ? data.faces.map(normalizeFace).filter((face): face is FontFaceAsset => face != null)
    : [];

  return {
    id,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Tipografía',
    faces,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

function fontsCollection(uid: string) {
  return collection(getFirebaseDb(), 'users', uid, 'fonts');
}

function fontDoc(uid: string, fontId: string) {
  return doc(getFirebaseDb(), 'users', uid, 'fonts', fontId);
}

export class FirebaseFontRepository implements FontLibraryPort {
  subscribe(
    uid: string,
    onChange: (fonts: CustomFontFamily[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    return onSnapshot(
      fontsCollection(uid),
      snapshot => {
        const fonts = snapshot.docs
          .map(docSnap => mapFont(docSnap.id, docSnap.data() as Record<string, unknown>))
          .sort((a, b) => a.name.localeCompare(b.name, 'es'));
        onChange(fonts);
      },
      error => {
        onError?.(error);
      },
    );
  }

  async createFont(uid: string, font: CustomFontFamily): Promise<void> {
    await setDoc(
      fontDoc(uid, font.id),
      stripUndefined({
        name: font.name,
        faces: font.faces,
        createdAt: font.createdAt,
        updatedAt: font.updatedAt,
        createdAtServer: serverTimestamp(),
        updatedAtServer: serverTimestamp(),
      }),
    );
  }

  async updateFont(
    uid: string,
    fontId: string,
    updates: Partial<Pick<CustomFontFamily, 'name' | 'faces'>>,
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      updatedAt: Date.now(),
      updatedAtServer: serverTimestamp(),
    };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.faces !== undefined) payload.faces = stripUndefined(updates.faces);
    await updateDoc(fontDoc(uid, fontId), stripUndefined(payload));
  }

  async deleteFont(uid: string, fontId: string): Promise<void> {
    await deleteDoc(fontDoc(uid, fontId));
  }
}
