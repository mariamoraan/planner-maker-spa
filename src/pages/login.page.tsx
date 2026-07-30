import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/auth-provider';
import { PATHS } from '@/core/routes/paths';
import './auth-pages.scss';

export function LoginPage() {
  const { t } = useTranslation();
  const { signIn, isConfigured, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? PATHS.home;

  const handleSignIn = async () => {
    await signIn();
    navigate(from, { replace: true });
  };

  return (
    <main className="auth-page">
      <div className="auth-page__card">
        <p className="auth-page__brand">{t('common.appName')}</p>
        <h1 className="auth-page__title">{t('login.title')}</h1>
        <p className="auth-page__subtitle">{t('login.subtitle')}</p>

        {!isConfigured ? (
          <p className="auth-page__error">{t('login.notConfigured')}</p>
        ) : (
          <button
            type="button"
            className="auth-page__google-btn"
            onClick={() => void handleSignIn()}
            disabled={isLoading}
          >
            {t('common.continueWithGoogle')}
          </button>
        )}

        <Link to={PATHS.landing} className="auth-page__link">
          {t('login.backToLanding')}
        </Link>
      </div>
    </main>
  );
}
