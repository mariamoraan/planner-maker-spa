import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { getInfra } from '@/infrastructure';
import { migrateLocalTemplatesToFirebase, repairDuplicatePageOrder } from '@/lib/template-migration';
import { useTemplateStore } from '@/stores/template-store';

export function useTemplateSync() {
  const { user, hasAccess, isConfigured } = useAuth();
  const setSyncUser = useTemplateStore(state => state.setSyncUser);
  const setMigrating = useTemplateStore(state => state.setMigrating);
  const hydrateFromRemote = useTemplateStore(state => state.hydrateFromRemote);
  const resetSync = useTemplateStore(state => state.resetSync);
  const isSyncReady = useTemplateStore(state => state.isSyncReady);
  const isMigrating = useTemplateStore(state => state.isMigrating);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured || !user || !hasAccess) {
      resetSync();
      setSyncError(null);
      return;
    }

    let cancelled = false;
    const uid = user.uid;
    setSyncUser(uid);
    setSyncError(null);

    const start = async () => {
      setMigrating(true);
      try {
        await migrateLocalTemplatesToFirebase(uid);
        if (cancelled) return;

        await repairDuplicatePageOrder(uid);
        if (cancelled) return;

        const unsubscribe = getInfra().templates.subscribe(uid, templates => {
          if (!cancelled) hydrateFromRemote(templates);
        });

        return unsubscribe;
      } catch (error) {
        console.error('[template-sync]', error);
        if (!cancelled) {
          setSyncError(error instanceof Error ? error.message : 'Sync failed');
        }
        return undefined;
      } finally {
        if (!cancelled) setMigrating(false);
      }
    };

    let unsubscribe: (() => void) | undefined;
    void start().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
      resetSync();
    };
  }, [user, hasAccess, isConfigured, setSyncUser, setMigrating, hydrateFromRemote, resetSync]);

  return { isSyncReady, isMigrating, syncError };
}
