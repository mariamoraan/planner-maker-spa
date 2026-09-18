import { useEffect } from 'react';
import { useAuth } from '@/features/auth/ui/contexts/auth-provider';
import { getInfra } from '@/core/bootstrap/infra';
import { useFontLibraryStore } from '@/features/fonts/ui/stores/font-library-store';

export function useFontLibrarySync() {
  const { user, hasAccess, isConfigured } = useAuth();
  const setSyncUser = useFontLibraryStore(state => state.setSyncUser);
  const setSyncError = useFontLibraryStore(state => state.setSyncError);
  const hydrateFromRemote = useFontLibraryStore(state => state.hydrateFromRemote);
  const hydrateFromLocal = useFontLibraryStore(state => state.hydrateFromLocal);
  const resetSync = useFontLibraryStore(state => state.resetSync);
  const isSyncReady = useFontLibraryStore(state => state.isSyncReady);
  const isRegistering = useFontLibraryStore(state => state.isRegistering);
  const syncError = useFontLibraryStore(state => state.syncError);

  useEffect(() => {
    if (!isConfigured || !user || !hasAccess) {
      resetSync();
      return;
    }

    let cancelled = false;
    const uid = user.uid;
    setSyncUser(uid);
    setSyncError(null);

    void hydrateFromLocal(uid).catch(error => {
      console.warn('[font-library-sync] local hydrate failed:', error);
    });

    const unsubscribe = getInfra().fonts.subscribe(
      uid,
      fonts => {
        if (!cancelled) {
          setSyncError(null);
          hydrateFromRemote(fonts);
        }
      },
      error => {
        console.error('[font-library-sync] subscribe failed:', error);
        if (!cancelled) {
          const message = error.message || 'Font sync failed';
          setSyncError(
            message.toLowerCase().includes('permission')
              ? 'Sin permiso para sincronizar tipografías con la nube. Se usarán las guardadas en este dispositivo. Despliega firestore.rules (users/{uid}/fonts).'
              : message,
          );
        }
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
      resetSync();
    };
  }, [
    user,
    hasAccess,
    isConfigured,
    setSyncUser,
    setSyncError,
    hydrateFromRemote,
    hydrateFromLocal,
    resetSync,
  ]);

  return { isSyncReady, isRegistering, syncError };
}
