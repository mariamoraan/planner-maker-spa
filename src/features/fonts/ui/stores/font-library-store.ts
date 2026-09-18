import { create } from 'zustand';
import { getInfra } from '@/core/bootstrap/infra';
import { generateId } from '@/features/template';
import {
  hasRegularFace,
  type CustomFontFamily,
  type FontFaceAsset,
  type FontFaceStyle,
  type FontFaceWeight,
} from '@/features/fonts/domain/entities/custom-font-family';
import {
  MAX_FACES_PER_FAMILY,
  MAX_FONT_FAMILIES_PER_ACCOUNT,
} from '@/features/fonts/domain/constants/font-limits';
import {
  buildLocalFontAssetRef,
  buildUploadthingFontAssetRef,
  fontFaceKey,
  isCloudFontStorageEnabled,
} from '@/features/fonts/domain/value-objects/font-asset-ref';
import { fontFaceRegistry } from '@/features/fonts/domain/services/font-face-registry';
import { isCustomFontInUse } from '@/features/fonts/domain/services/font-in-use';
import type { Template } from '@/features/template';

export type PendingFontFace = {
  weight: FontFaceWeight;
  style: FontFaceStyle;
  fileName: string;
  dataUrl: string;
};

type FontLibraryState = {
  syncUid: string | null;
  fonts: CustomFontFamily[];
  isSyncReady: boolean;
  isRegistering: boolean;
  hydrateFromRemote: (fonts: CustomFontFamily[]) => void;
  setSyncUser: (uid: string | null) => void;
  resetSync: () => void;
  createFamily: (
    name: string,
    faces: PendingFontFace[],
  ) => Promise<CustomFontFamily>;
  renameFamily: (fontId: string, name: string) => Promise<void>;
  replaceFaces: (fontId: string, faces: PendingFontFace[]) => Promise<void>;
  deleteFamily: (fontId: string, templates: Template[]) => Promise<void>;
};

async function persistFaces(
  uid: string,
  fontId: string,
  pending: PendingFontFace[],
): Promise<FontFaceAsset[]> {
  if (pending.length > MAX_FACES_PER_FAMILY) {
    throw new Error(`Máximo ${MAX_FACES_PER_FAMILY} estilos por familia`);
  }

  const assets = getInfra().fontAssets;
  const cloud = isCloudFontStorageEnabled();
  const faces: FontFaceAsset[] = [];

  for (const face of pending) {
    const key = fontFaceKey(face.weight, face.style);
    const ref = cloud
      ? buildUploadthingFontAssetRef(uid, fontId, key)
      : buildLocalFontAssetRef(uid, fontId, key);
    await assets.save(ref, face.dataUrl);
    faces.push({
      weight: face.weight,
      style: face.style,
      fileName: face.fileName,
      assetRef: { ...ref },
    });
  }

  return faces;
}

async function deleteFaceAssets(faces: FontFaceAsset[]): Promise<void> {
  const assets = getInfra().fontAssets;
  await Promise.allSettled(faces.map(face => assets.delete(face.assetRef)));
}

export const useFontLibraryStore = create<FontLibraryState>((set, get) => ({
  syncUid: null,
  fonts: [],
  isSyncReady: false,
  isRegistering: false,

  setSyncUser: uid => {
    set({ syncUid: uid });
  },

  resetSync: () => {
    fontFaceRegistry.clear();
    set({ syncUid: null, fonts: [], isSyncReady: false, isRegistering: false });
  },

  hydrateFromRemote: fonts => {
    set({ fonts, isSyncReady: true, isRegistering: true });
    void fontFaceRegistry
      .syncFamilies(fonts, getInfra().fontAssets)
      .catch(error => {
        console.warn('[font-library] FontFace sync failed:', error);
      })
      .finally(() => {
        set({ isRegistering: false });
      });
  },

  createFamily: async (name, pendingFaces) => {
    const uid = get().syncUid;
    if (!uid) throw new Error('No hay sesión para guardar tipografías');
    if (get().fonts.length >= MAX_FONT_FAMILIES_PER_ACCOUNT) {
      throw new Error(`Máximo ${MAX_FONT_FAMILIES_PER_ACCOUNT} tipografías por cuenta`);
    }

    const now = Date.now();
    const id = generateId();
    const faces = await persistFaces(uid, id, pendingFaces);
    const family: CustomFontFamily = {
      id,
      name: name.trim() || 'Mi tipografía',
      faces,
      createdAt: now,
      updatedAt: now,
    };

    if (!hasRegularFace(family)) {
      await deleteFaceAssets(faces);
      throw new Error('La familia necesita al menos el estilo Regular');
    }

    await getInfra().fonts.createFont(uid, family);
    await fontFaceRegistry.registerFamily(family, getInfra().fontAssets);
    set(state => ({
      fonts: [...state.fonts.filter(f => f.id !== id), family].sort((a, b) =>
        a.name.localeCompare(b.name, 'es'),
      ),
    }));
    return family;
  },

  renameFamily: async (fontId, name) => {
    const uid = get().syncUid;
    if (!uid) throw new Error('No hay sesión para guardar tipografías');
    const trimmed = name.trim();
    if (!trimmed) throw new Error('El nombre no puede estar vacío');
    await getInfra().fonts.updateFont(uid, fontId, { name: trimmed });
    set(state => ({
      fonts: state.fonts
        .map(font =>
          font.id === fontId ? { ...font, name: trimmed, updatedAt: Date.now() } : font,
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    }));
  },

  replaceFaces: async (fontId, pendingFaces) => {
    const uid = get().syncUid;
    if (!uid) throw new Error('No hay sesión para guardar tipografías');
    const existing = get().fonts.find(font => font.id === fontId);
    if (!existing) throw new Error('Tipografía no encontrada');

    const faces = await persistFaces(uid, fontId, pendingFaces);
    if (!faces.some(face => face.weight === 400 && face.style === 'normal')) {
      await deleteFaceAssets(faces);
      throw new Error('La familia necesita al menos el estilo Regular');
    }

    const previousKeys = new Set(faces.map(face => face.assetRef.key));
    const obsolete = existing.faces.filter(face => !previousKeys.has(face.assetRef.key));
    await deleteFaceAssets(obsolete);

    await getInfra().fonts.updateFont(uid, fontId, { faces });
    const updated: CustomFontFamily = {
      ...existing,
      faces,
      updatedAt: Date.now(),
    };
    await fontFaceRegistry.registerFamily(updated, getInfra().fontAssets);
    set(state => ({
      fonts: state.fonts.map(font => (font.id === fontId ? updated : font)),
    }));
  },

  deleteFamily: async (fontId, templates) => {
    const uid = get().syncUid;
    if (!uid) throw new Error('No hay sesión para guardar tipografías');
    if (isCustomFontInUse(fontId, templates)) {
      throw new Error(
        'Esta tipografía está en uso en uno o más planners. Cámbiala antes de eliminarla.',
      );
    }

    const existing = get().fonts.find(font => font.id === fontId);
    await getInfra().fonts.deleteFont(uid, fontId);
    if (existing) {
      await deleteFaceAssets(existing.faces);
    }
    fontFaceRegistry.unregisterFamily(fontId);
    set(state => ({
      fonts: state.fonts.filter(font => font.id !== fontId),
    }));
  },
}));
