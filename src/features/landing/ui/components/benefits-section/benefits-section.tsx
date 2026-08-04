import { motion } from 'framer-motion';
import { Clock, Sparkles, FileDown, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './benefits-section.scss';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const icons = [Clock, Sparkles, FileDown, Globe];

export function BenefitsSection() {
  const { t } = useTranslation();
  const items = t('landing.benefits.items', { returnObjects: true }) as Array<{
    title: string;
    text: string;
  }>;

  return (
    <section id="benefits" className="landing-page__section landing-page__section--neutral benefits-section">
      <div className="landing-page__container">
        <motion.div
          className="landing-page__section-intro"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <h2>{t('landing.benefits.title')}</h2>
          <p>{t('landing.benefits.subtitle')}</p>
        </motion.div>

        <div className="landing-page__grid-4">
          {items.map((item, index) => {
            const Icon = icons[index] ?? Clock;
            return (
              <motion.div
                key={item.title}
                className="landing-page__card landing-page__card--white benefits-section__card"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: index * 0.1 }}
              >
                <Icon className="landing-page__card-icon" aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
