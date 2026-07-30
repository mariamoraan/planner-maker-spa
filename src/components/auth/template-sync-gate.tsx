import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useTemplateSync } from '@/hooks/use-template-sync';

export function TemplateSyncGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { isSyncReady, isMigrating, syncError } = useTemplateSync();

  if (syncError) {
    return (
      <div className="auth-gate">
        <p>{t('sync.error')}</p>
        <p className="auth-gate__hint">{t('sync.errorHint')}</p>
      </div>
    );
  }

  if (isMigrating || !isSyncReady) {
    return (
      <div className="auth-gate">
        <p>{isMigrating ? t('sync.migrating') : t('sync.loading')}</p>
      </div>
    );
  }

  return <>{children}</>;
}
