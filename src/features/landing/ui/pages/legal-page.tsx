import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PATHS } from '@/core/routes/paths';
import { getSupportEmail, getSupportMailto } from '@/core/config/support-email';
import './legal-page.scss';

type LegalDoc = 'privacy' | 'terms';

interface LegalPageProps {
  doc: LegalDoc;
}

export function LegalPage({ doc }: LegalPageProps) {
  const { t } = useTranslation();
  const supportEmail = getSupportEmail();
  const supportMailto = getSupportMailto();
  const paragraphs = t(`legal.${doc}.paragraphs`, { returnObjects: true }) as string[];

  return (
    <main className="legal-page">
      <div className="legal-page__inner">
        <p className="legal-page__brand">{t('common.appName')}</p>
        <h1 className="legal-page__title">{t(`legal.${doc}.title`)}</h1>
        <p className="legal-page__updated">{t('legal.updated')}</p>

        <div className="legal-page__body">
          {paragraphs.map(text => (
            <p key={text}>{text}</p>
          ))}
        </div>

        {supportEmail && supportMailto && (
          <p className="legal-page__contact">
            {t('legal.contactLabel')}{' '}
            <a href={supportMailto}>{supportEmail}</a>
          </p>
        )}

        <div className="legal-page__nav">
          <Link to={PATHS.landing}>{t('legal.backToLanding')}</Link>
          <Link to={doc === 'privacy' ? PATHS.terms : PATHS.privacy}>
            {t(doc === 'privacy' ? 'legal.termsLink' : 'legal.privacyLink')}
          </Link>
        </div>
      </div>
    </main>
  );
}

export function PrivacyPage() {
  return <LegalPage doc="privacy" />;
}

export function TermsPage() {
  return <LegalPage doc="terms" />;
}
