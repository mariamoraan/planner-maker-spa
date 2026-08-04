import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LANDING_ASSETS } from '@/features/landing/domain/landing-assets';
import { LandingScreenshot } from '@/features/landing/ui/components/landing-screenshot/landing-screenshot';
import { useSharpDisplayWidth } from '@/features/landing/ui/hooks/use-sharp-display-width';
import './how-it-works-timeline.scss';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const STEPS = [
  { key: 'upload', image: LANDING_ASSETS.stepUpload, phase: '01' },
  { key: 'zones', image: LANDING_ASSETS.stepZones, phase: '02' },
  { key: 'range', image: LANDING_ASSETS.stepRange, phase: '03' },
  { key: 'generate', image: LANDING_ASSETS.stepGenerate, phase: '04' },
] as const;

export function HowItWorksTimeline() {
  const { t } = useTranslation();
  const sharpWidth = useSharpDisplayWidth(1024);

  return (
    <section id="how" className="landing-page__section landing-page__section--neutral how-it-works">
      <div className="landing-page__container">
        <motion.div
          className="landing-page__section-intro"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <h2>{t('landing.how.title')}</h2>
          <p>{t('landing.how.subtitle')}</p>
        </motion.div>

        <div className="landing-page__roadmap how-it-works__timeline">
          <div className="landing-page__roadmap-line" aria-hidden="true" />

          {STEPS.map((step, index) => {
            const isEven = index % 2 === 0;
            const title = t(`landing.steps.${step.key}.title`);
            const text = t(`landing.steps.${step.key}.text`);
            const alt = t(`landing.screenshots.${step.key}`);

            return (
              <motion.div
                key={step.key}
                className="landing-page__roadmap-item how-it-works__item"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: index * 0.08 }}
              >
                <div className="landing-page__roadmap-dot" aria-hidden="true" />

                <div
                  className={`landing-page__roadmap-content how-it-works__content${
                    isEven
                      ? ' landing-page__roadmap-content--left how-it-works__content--left'
                      : ' landing-page__roadmap-content--right how-it-works__content--right'
                  }`}
                >
                  <p className="landing-page__roadmap-phase">{step.phase}</p>
                  <h3 className="landing-page__roadmap-title">{title}</h3>
                  <p className="how-it-works__text">{text}</p>
                </div>

                <div
                  className={`how-it-works__visual${
                    isEven ? ' how-it-works__visual--right' : ' how-it-works__visual--left'
                  }`}
                  style={{ maxWidth: sharpWidth }}
                >
                  <LandingScreenshot
                    src={step.image}
                    alt={alt}
                    url={
                      step.key === 'upload'
                        ? 'dyna.app/home'
                        : 'dyna.app/editor'
                    }
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
