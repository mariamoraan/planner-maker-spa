import { create } from 'zustand';
import { getInfra } from '@/core/bootstrap/infra';
import {
  PlanLimitError,
  resolvePlanLimits,
  resolveUserPlan,
} from '@/core/plans';
import { generateId } from '@/features/template';
import {
  hasRegularFace,
  type CustomFontFamily,
  type FontFaceAsset,
  type FontFaceStyle,
  type FontFaceWeight,
} from '@/features/fonts/domain/entities/custom-font-family';
import {
  buildLocalFontAssetRef,
  buildUploadthingFontAssetRef,
  fontFaceKey,
  isCloudFontStorageEnabled,
} from '@/features/fonts/domain/value-objects/font-asset-ref';
import { fontFaceRegistry } from '@/features/fonts/domain/services/font-face-registry';
import { isCustomFontInUse } from '@/features/fonts/domain/services/font-in-use';
import { IndexedDBFontAdapter } from '@/features/fonts/infrastructure/local/indexeddb-font.adapter';
import {
  loadLocalFontLibrary,
  mergeFontLibraries,
  saveLocalFontLibrary,
} from '@/features/fonts/infrastructure/local/font-library-local';
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
  syncError: string | null;
  mutationDepth: number;
  hydrateFromRemote: (fonts: CustomFontFamily[]) => void;
  hydrateFromLocal: (uid: string) => Promise<void>;
  setSyncUser: (uid: string | null) => void;
  setSyncError: (error: string | null) => void;
  resetSync: () => void;
  createFamily: (
    name: string,
    faces: PendingFontFace[],
  ) => Promise<CustomFontFamily>;
  renameFamily: (fontId: string, name: string) => Promise<void>;
  replaceFaces: (fontId: string, faces: PendingFontFace[]) => Promise<void>;
  deleteFamily: (fontId: string, templates: Template[]) => Promise<void>;
};

function currentPlanLimits() {
  return resolvePlanLimits(resolveUserPlan());
}

function resolveUid(syncUid: string | null): string {
  if (syncUid) return syncUid;
  const current = getInfra().auth.getCurrentUser();
  if (current?.uid) return current.uid;
  throw new Error('No hay sesión para guardar tipografías. Recarga la página e inicia sesión.');
}

function formatFontSaveError(error: unknown): Error {
  if (error instanceof PlanLimitError) return error;
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Error desconocido';
  const lower = message.toLowerCase();
  if (isCloudQuotaOrPlanError(error)) {
    return new PlanLimitError('fonts', message);
  }
  if (lower.includes('permission') || lower.includes('insufficient')) {
    return new Error(
      'No hay permiso para guardar tipografías en Firestore. Despliega las reglas (colección users/{uid}/fonts) e inténtalo de nuevo.',
    );
  }
  if (lower.includes('upload') || lower.includes('failed to fetch') || lower.includes('network')) {
    return new Error(`No se pudo subir el archivo de la tipografía: ${message}`);
  }
  return error instanceof Error ? error : new Error(message);
}

function isCloudQuotaOrPlanError(error: unknown): boolean {
  if (error instanceof PlanLimitError) return true;
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    message.includes('free plan') ||
    message.includes('plan allows') ||
    message.includes('plan limit') ||
    message.includes('quota') ||
    (message.includes('up to') && message.includes('font')) ||
    (message.includes('allows up to') && message.includes('page'))
  );
}

async function persistFaces(
  uid: string,
  fontId: string,
  pending: PendingFontFace[],
  existingFaces: FontFaceAsset[] = [],
): Promise<FontFaceAsset[]> {
  const limits = currentPlanLimits();
  if (pending.length > limits.maxFacesPerFamily) {
    throw new PlanLimitError(
      'faces',
      `Máximo ${limits.maxFacesPerFamily} estilos por familia`,
    );
  }
  if (pending.length === 0) {
    throw new Error('Añade al menos un archivo de tipografía');
  }
  for (const face of pending) {
    if (!face.dataUrl || !face.dataUrl.startsWith('data:')) {
      throw new Error(`No se pudo leer el archivo ${face.fileName || 'de tipografía'}`);
    }
  }

  const assets = getInfra().fontAssets;
  const localOnly = new IndexedDBFontAdapter();
  const cloud = isCloudFontStorageEnabled();
  const faces: FontFaceAsset[] = [];
  const existingByKey = new Map(
    existingFaces.map(face => [fontFaceKey(face.weight, face.style), face] as const),
  );

  for (const face of pending) {
    const key = fontFaceKey(face.weight, face.style);
    const previous = existingByKey.get(key);
    const localRef = buildLocalFontAssetRef(uid, fontId, key);

    await localOnly.save(localRef, face.dataUrl);

    let assetRef = { ...localRef };

    if (cloud) {
      const cloudRef = buildUploadthingFontAssetRef(
        uid,
        fontId,
        key,
        previous?.assetRef.url,
        previous?.assetRef.fileKey,
      );
      try {
        await assets.save(cloudRef, face.dataUrl);
        assetRef = { ...cloudRef };
      } catch (error) {
        // Plan/quota rejections must not fall back to local — that bypasses free-tier caps.
        if (isCloudQuotaOrPlanError(error)) {
          await localOnly.delete(localRef).catch(() => undefined);
          if (error instanceof PlanLimitError) throw error;
          throw new PlanLimitError(
            'fonts',
            error instanceof Error ? error.message : 'Font plan limit reached',
          );
        }
        console.warn(
          '[font-library] Cloud font upload failed; keeping local IndexedDB copy:',
          error,
        );
        assetRef = { ...localRef };
      }
    } else {
      await assets.save(localRef, face.dataUrl);
      assetRef = { ...localRef };
    }

    faces.push({
      weight: face.weight,
      style: face.style,
      fileName: face.fileName,
      assetRef,
    });
  }

  return faces;
}

async function deleteFaceAssets(faces: FontFaceAsset[]): Promise<void> {
  const assets = getInfra().fontAssets;
  const results = await Promise.allSettled(faces.map(face => assets.delete(face.assetRef)));
  const failures = results.filter(result => result.status === 'rejected');
  if (failures.length > 0) {
    const first = failures[0] as PromiseRejectedResult;
    const message =
      first.reason instanceof Error
        ? first.reason.message
        : 'Failed to delete font from cloud storage';
    throw new Error(message);
  }
}

function upsertFontInState(fonts: CustomFontFamily[], family: CustomFontFamily): CustomFontFamily[] {
  return [...fonts.filter(font => font.id !== family.id), family].sort((a, b) =>
    a.name.localeCompare(b.name, 'es'),
  );
}

async function persistLibraryMeta(uid: string, fonts: CustomFontFamily[]): Promise<void> {
  try {
    await saveLocalFontLibrary(uid, fonts);
  } catch (error) {
    console.warn('[font-library] Failed to persist local font metadata:', error);
  }
}

export const useFontLibraryStore = create<FontLibraryState>((set, get) => ({
  syncUid: null,
  fonts: [],
  isSyncReady: false,
  isRegistering: false,
  syncError: null,
  mutationDepth: 0,

  setSyncUser: uid => {
    set({ syncUid: uid });
  },

  setSyncError: error => {
    set({ syncError: error });
  },

  resetSync: () => {
    fontFaceRegistry.clear();
    set({
      syncUid: null,
      fonts: [],
      isSyncReady: false,
      isRegistering: false,
      syncError: null,
      mutationDepth: 0,
    });
  },

  hydrateFromLocal: async uid => {
    const local = await loadLocalFontLibrary(uid);
    if (local.length === 0) return;
    set(state => ({
      fonts: mergeFontLibraries(state.fonts, local),
      isSyncReady: true,
    }));
    void fontFaceRegistry.syncFamilies(get().fonts, getInfra().fontAssets).catch(error => {
      console.warn('[font-library] local FontFace sync failed:', error);
    });
  },

  hydrateFromRemote: remoteFonts => {
    const state = get();
    const merged = mergeFontLibraries(remoteFonts, state.fonts);

    set({ fonts: merged, isSyncReady: true, isRegistering: true });
    if (state.syncUid) {
      void persistLibraryMeta(state.syncUid, merged);
    }
    void fontFaceRegistry
      .syncFamilies(merged, getInfra().fontAssets)
      .catch(error => {
        console.warn('[font-library] FontFace sync failed:', error);
      })
      .finally(() => {
        set({ isRegistering: false });
      });
  },

  createFamily: async (name, pendingFaces) => {
    const uid = resolveUid(get().syncUid);
    if (!get().syncUid) set({ syncUid: uid });

    const limits = currentPlanLimits();
    if (get().fonts.length >= limits.maxFontFamilies) {
      throw new PlanLimitError(
        'fonts',
        `Free plan allows up to ${limits.maxFontFamilies} custom fonts. Delete one to upload another.`,
      );
    }

    set(state => ({ mutationDepth: state.mutationDepth + 1 }));

    try {
      const now = Date.now();
      const id = generateId();

      let faces: FontFaceAsset[];
      try {
        faces = await persistFaces(uid, id, pendingFaces);
      } catch (error) {
        throw formatFontSaveError(error);
      }

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

      // Local-first: keep the font even if Firestore rejects (rules not deployed).
      const nextFonts = upsertFontInState(get().fonts, family);
      set({ fonts: nextFonts, isSyncReady: true });
      await persistLibraryMeta(uid, nextFonts);

      try {
        await fontFaceRegistry.registerFamily(family, getInfra().fontAssets);
      } catch (error) {
        console.warn('[font-library] FontFace registration failed after save:', error);
      }

      try {
        await getInfra().fonts.createFont(uid, family);
      } catch (error) {
        console.warn('[font-library] Firestore create failed; font kept locally:', error);
        set({
          syncError:
            formatFontSaveError(error).message +
            ' La tipografía quedó guardada en este dispositivo.',
        });
      }

      return family;
    } finally {
      set(state => ({ mutationDepth: Math.max(0, state.mutationDepth - 1) }));
    }
  },

  renameFamily: async (fontId, name) => {
    const uid = resolveUid(get().syncUid);
    const trimmed = name.trim();
    if (!trimmed) throw new Error('El nombre no puede estar vacío');

    set(state => ({ mutationDepth: state.mutationDepth + 1 }));
    try {
      const nextFonts = get()
        .fonts.map(font =>
          font.id === fontId ? { ...font, name: trimmed, updatedAt: Date.now() } : font,
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
      set({ fonts: nextFonts });
      await persistLibraryMeta(uid, nextFonts);

      try {
        await getInfra().fonts.updateFont(uid, fontId, { name: trimmed });
      } catch (error) {
        console.warn('[font-library] Firestore rename failed; kept locally:', error);
        set({ syncError: formatFontSaveError(error).message });
      }
    } finally {
      set(state => ({ mutationDepth: Math.max(0, state.mutationDepth - 1) }));
    }
  },

  replaceFaces: async (fontId, pendingFaces) => {
    const uid = resolveUid(get().syncUid);
    const existing = get().fonts.find(font => font.id === fontId);
    if (!existing) throw new Error('Tipografía no encontrada');

    set(state => ({ mutationDepth: state.mutationDepth + 1 }));
    try {
      let faces: FontFaceAsset[];
      try {
        faces = await persistFaces(uid, fontId, pendingFaces, existing.faces);
      } catch (error) {
        throw formatFontSaveError(error);
      }

      if (!faces.some(face => face.weight === 400 && face.style === 'normal')) {
        await deleteFaceAssets(faces);
        throw new Error('La familia necesita al menos el estilo Regular');
      }

      const previousKeys = new Set(faces.map(face => face.assetRef.key));
      const obsolete = existing.faces.filter(face => !previousKeys.has(face.assetRef.key));
      await deleteFaceAssets(obsolete);

      const updated: CustomFontFamily = {
        ...existing,
        faces,
        updatedAt: Date.now(),
      };
      const nextFonts = get().fonts.map(font => (font.id === fontId ? updated : font));
      set({ fonts: nextFonts });
      await persistLibraryMeta(uid, nextFonts);

      try {
        await fontFaceRegistry.registerFamily(updated, getInfra().fontAssets);
      } catch (error) {
        console.warn('[font-library] FontFace registration failed after replace:', error);
      }

      try {
        await getInfra().fonts.updateFont(uid, fontId, { faces });
      } catch (error) {
        console.warn('[font-library] Firestore replace failed; kept locally:', error);
        set({ syncError: formatFontSaveError(error).message });
      }
    } finally {
      set(state => ({ mutationDepth: Math.max(0, state.mutationDepth - 1) }));
    }
  },

  deleteFamily: async (fontId, templates) => {
    const uid = resolveUid(get().syncUid);
    if (isCustomFontInUse(fontId, templates)) {
      throw new Error(
        'Esta tipografía está en uso en uno o más planners. Cámbiala antes de eliminarla.',
      );
    }

    const existing = get().fonts.find(font => font.id === fontId);
    if (!existing) return;

    set(state => ({ mutationDepth: state.mutationDepth + 1 }));
    try {
      // Delete cloud assets first so a UT failure does not fake-free quota.
      await deleteFaceAssets(existing.faces);

      const nextFonts = get().fonts.filter(font => font.id !== fontId);
      set({ fonts: nextFonts });
      await persistLibraryMeta(uid, nextFonts);
      fontFaceRegistry.unregisterFamily(fontId);

      try {
        await getInfra().fonts.deleteFont(uid, fontId);
      } catch (error) {
        console.warn('[font-library] Firestore delete failed:', error);
        set({ syncError: formatFontSaveError(error).message });
      }
    } catch (error) {
      throw formatFontSaveError(error);
    } finally {
      set(state => ({ mutationDepth: Math.max(0, state.mutationDepth - 1) }));
    }
  },
}));
