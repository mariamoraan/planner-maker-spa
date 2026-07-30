import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/auth-provider';
import { PATHS } from '@/core/routes/paths';
import { TemplateSyncGate } from './template-sync-gate';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAccess?: boolean;
}

export function ProtectedRoute({ children, requireAccess = true }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const { user, isLoading, hasAccess, isConfigured } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="auth-gate">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (!isConfigured) {
    return <Navigate to={PATHS.login} replace state={{ from: location.pathname }} />;
  }

  if (!user) {
    return <Navigate to={PATHS.login} replace state={{ from: location.pathname }} />;
  }

  if (requireAccess && !hasAccess) {
    return <Navigate to={PATHS.accessPending} replace />;
  }

  if (requireAccess) {
    return <TemplateSyncGate>{children}</TemplateSyncGate>;
  }

  return <>{children}</>;
}

export function AuthRequiredRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requireAccess={false}>{children}</ProtectedRoute>;
}
