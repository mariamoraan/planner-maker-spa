import { useTranslation } from 'react-i18next';
import { TryDemoCta } from '@/features/landing/ui/components/try-demo-cta/try-demo-cta';
import { LANDING_ASSETS } from '@/features/landing/domain/landing-assets';
import { useSharpDisplayWidth } from '@/features/landing/ui/hooks/use-sharp-display-width';
import './demo-video.scss';

export function DemoVideo() {
  const { t } = useTranslation();
  const sharpWidth = useSharpDisplayWidth(1920);

  return (
    <section id="demo" className="landing-page__section landing-page__section--white demo-video">
      <div className="landing-page__container">
        <div className="landing-page__section-intro">
          <h2>{t('landing.demo.title')}</h2>
          <p>{t('landing.demo.subtitle')}</p>
        </div>

        <div className="demo-video__player" style={{ maxWidth: sharpWidth }}>
          <div className="demo-video__stage">
            <video
              className="demo-video__media"
              autoPlay
              muted
              loop
              playsInline
              poster={LANDING_ASSETS.demoPoster}
              aria-label={t('landing.demo.videoLabel')}
              width={1920}
              height={1080}
            >
              <source src={LANDING_ASSETS.demoVideo} type="video/mp4" />
            </video>
          </div>
        </div>

        <div className="demo-video__cta">
          <h3>{t('landing.tryDemo.title')}</h3>
          <p>{t('landing.tryDemo.subtitle')}</p>
          <TryDemoCta source="landing_demo" />
          <p className="landing-page__desktop-note landing-page__desktop-note--compact">
            {t('landing.tryDemo.desktopNote')}
          </p>
        </div>
      </div>
    </section>
  );
}
