import { useEffect } from 'react';
import { useAuth } from '@/features/auth/ui/contexts/auth-provider';
import { getInfra } from '@/core/bootstrap/infra';
import { useFontLibraryStore } from '@/features/fonts/ui/stores/font-library-store';

export function useFontLibrarySync() {
  const { user, hasAccess, isConfigured } = useAuth();
  const setSyncUser = useFontLibraryStore(state => state.setSyncUser);
  const hydrateFromRemote = useFontLibraryStore(state => state.hydrateFromRemote);
  const resetSync = useFontLibraryStore(state => state.resetSync);
  const isSyncReady = useFontLibraryStore(state => state.isSyncReady);
  const isRegistering = useFontLibraryStore(state => state.isRegistering);

  useEffect(() => {
    if (!isConfigured || !user || !hasAccess) {
      resetSync();
      return;
    }

    let cancelled = false;
    const uid = user.uid;
    setSyncUser(uid);

    const unsubscribe = getInfra().fonts.subscribe(
      uid,
      fonts => {
        if (!cancelled) hydrateFromRemote(fonts);
      },
      error => {
        console.error('[font-library-sync] subscribe failed:', error);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
      resetSync();
    };
  }, [user, hasAccess, isConfigured, setSyncUser, hydrateFromRemote, resetSync]);

  return { isSyncReady, isRegistering };
}
