import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/ui/contexts/auth-provider';
import { getUserGreetingName } from '@/features/auth/domain/get-user-greeting-name';
import { PATHS } from '@/core/routes/paths';

interface SignInLinkProps {
  className?: string;
  onClick?: () => void;
}

export function SignInLink({ className, onClick }: SignInLinkProps) {
  const { t } = useTranslation();
  const { user, profile, hasAccess, isLoading } = useAuth();

  const isSignedIn = Boolean(user) && !isLoading;
  const label = isSignedIn
    ? t('landing.waitlist.greeting', {
        name: getUserGreetingName(user, profile) || t('common.you'),
      })
    : t('landing.waitlist.signIn');

  const to = isSignedIn
    ? hasAccess
      ? PATHS.home
      : PATHS.accessPending
    : PATHS.login;

  return (
    <Link to={to} className={className} onClick={onClick}>
      {label}
    </Link>
  );
}
