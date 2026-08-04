import { motion } from 'framer-motion';
import { ShoppingBag, Palette, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './audience-section.scss';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const icons = [ShoppingBag, Palette, Printer];

export function AudienceSection() {
  const { t } = useTranslation();
  const cards = t('landing.audience.cards', { returnObjects: true }) as Array<{
    title: string;
    pain: string;
    solution: string;
  }>;

  return (
    <section id="audience" className="landing-page__section landing-page__section--white audience-section">
      <div className="landing-page__container">
        <motion.div
          className="landing-page__section-intro"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <h2>{t('landing.audience.title')}</h2>
          <p>{t('landing.audience.subtitle')}</p>
        </motion.div>

        <div className="audience-section__grid">
          {cards.map((card, index) => {
            const Icon = icons[index] ?? ShoppingBag;
            return (
              <motion.article
                key={card.title}
                className="audience-section__card"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: index * 0.1 }}
              >
                <Icon className="audience-section__icon" aria-hidden="true" />
                <h3>{card.title}</h3>
                <p className="audience-section__pain">{card.pain}</p>
                <p className="audience-section__solution">{card.solution}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
