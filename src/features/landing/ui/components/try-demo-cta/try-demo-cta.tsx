import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PATHS } from '@/core/routes/paths';
import { trackEvent } from '@/features/template/use-case/commands/analytics.commands';

export type TryDemoSource = 'landing_hero' | 'landing_demo' | 'landing_footer' | 'landing_header';

interface TryDemoCtaProps {
  source?: TryDemoSource;
  variant?: 'default' | 'secondary' | 'dark';
  onClick?: () => void;
}

export function TryDemoCta({ source = 'landing_hero', variant = 'default', onClick }: TryDemoCtaProps) {
  const { t, i18n } = useTranslation();

  const handleClick = () => {
    trackEvent('demo_cta_click', { source, locale: i18n.language });
    onClick?.();
  };

  const variantClass =
    variant === 'secondary' || variant === 'dark' ? ' landing-page__cta--secondary' : '';

  return (
    <Link
      to={PATHS.landingDemoHome}
      className={`landing-page__cta${variantClass}`}
      onClick={handleClick}
    >
      {t('landing.tryDemo.cta')}
    </Link>
  );
}
