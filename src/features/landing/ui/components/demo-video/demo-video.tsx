import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookDemoForm } from '@/features/landing/ui/components/book-demo-form/book-demo-form';
import { DEMO_SLIDES } from '@/features/landing/domain/landing-assets';
import { LandingScreenshot } from '@/features/landing/ui/components/landing-screenshot/landing-screenshot';
import { useSharpDisplayWidth } from '@/features/landing/ui/hooks/use-sharp-display-width';
import './demo-video.scss';

const SLIDE_MS = 4000;

export function DemoVideo() {
  const { t } = useTranslation();
  const sharpWidth = useSharpDisplayWidth(1024);
  const [index, setIndex] = useState(0);
  const slide = DEMO_SLIDES[index] ?? DEMO_SLIDES[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex(current => (current + 1) % DEMO_SLIDES.length);
    }, SLIDE_MS);

    return () => window.clearInterval(timer);
  }, []);

  const title = t(`landing.steps.${slide.key}.title`);

  return (
    <section id="demo" className="landing-page__section landing-page__section--white demo-video">
      <div className="landing-page__container">
        <div className="landing-page__section-intro">
          <h2>{t('landing.demo.title')}</h2>
          <p>{t('landing.demo.subtitle')}</p>
        </div>

        <div className="demo-video__player" style={{ maxWidth: sharpWidth }}>
          <div className="demo-video__stage">
            {DEMO_SLIDES.map((item, slideIndex) => (
              <div
                key={item.key}
                className={`demo-video__slide${slideIndex === index ? ' demo-video__slide--active' : ''}`}
                aria-hidden={slideIndex !== index}
              >
                <LandingScreenshot
                  src={item.image}
                  alt={t(`landing.screenshots.${item.key}`)}
                  framed={false}
                  priority={slideIndex === 0}
                />
              </div>
            ))}
          </div>

          <div className="demo-video__caption" aria-live="polite">
            <span className="demo-video__step">
              {index + 1}/{DEMO_SLIDES.length}
            </span>
            <strong>{title}</strong>
          </div>

          <div className="demo-video__dots" aria-hidden="true">
            {DEMO_SLIDES.map((item, dotIndex) => (
              <button
                key={item.key}
                type="button"
                className={`demo-video__dot${dotIndex === index ? ' demo-video__dot--active' : ''}`}
                onClick={() => setIndex(dotIndex)}
                aria-label={t(`landing.steps.${item.key}.title`)}
              />
            ))}
          </div>
        </div>

        <div className="demo-video__cta">
          <h3>{t('landing.bookDemo.title')}</h3>
          <p>{t('landing.bookDemo.subtitle')}</p>
          <BookDemoForm source="landing_demo" />
        </div>
      </div>
    </section>
  );
}
