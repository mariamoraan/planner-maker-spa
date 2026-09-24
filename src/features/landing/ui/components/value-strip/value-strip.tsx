import { Upload, Layers, FileDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import './value-strip.scss';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const icons = [Upload, Layers, FileDown];

export function ValueStrip() {
  const { t } = useTranslation();
  const steps = t('landing.valueStrip.steps', { returnObjects: true }) as Array<{
    title: string;
    text: string;
  }>;

  return (
    <section id="value" className="landing-page__section landing-page__section--white value-strip">
      <div className="landing-page__container">
        <motion.div
          className="landing-page__section-intro"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <h2>{t('landing.valueStrip.title')}</h2>
          <p>{t('landing.valueStrip.subtitle')}</p>
        </motion.div>

        <div className="value-strip__grid">
          {steps.map((step, index) => {
            const Icon = icons[index] ?? Upload;
            return (
              <motion.div
                key={step.title}
                className="landing-page__card landing-page__card--neutral value-strip__card"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: index * 0.08 }}
              >
                <span className="value-strip__phase" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Icon className="landing-page__card-icon" aria-hidden="true" />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
