import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/auth-provider';
import { PATHS } from '@/core/routes/paths';
import './auth-pages.scss';

export function AccessPendingPage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  return (
    <main className="auth-page">
      <div className="auth-page__card">
        <p className="auth-page__brand">{t('common.appName')}</p>
        <h1 className="auth-page__title">{t('accessPending.title')}</h1>
        <p className="auth-page__subtitle">{t('accessPending.subtitle')}</p>

        {user?.email && (
          <p className="auth-page__email">
            {t('accessPending.signedInAs')} <strong>{user.email}</strong>
          </p>
        )}

        <div className="auth-page__actions">
          <Link to={PATHS.landing} className="auth-page__link">
            {t('accessPending.backToLanding')}
          </Link>
          <button type="button" className="auth-page__ghost-btn" onClick={() => void signOut()}>
            {t('common.signOut')}
          </button>
        </div>
      </div>
    </main>
  );
}
