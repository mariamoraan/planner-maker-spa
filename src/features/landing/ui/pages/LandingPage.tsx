import { useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PATHS } from '@/core/routes/paths';
import { AudienceSection } from '@/features/landing/ui/components/audience-section/audience-section';
import { BenefitsSection } from '@/features/landing/ui/components/benefits-section/benefits-section';
import { DemoVideo } from '@/features/landing/ui/components/demo-video/demo-video';
import { HowItWorksTimeline } from '@/features/landing/ui/components/how-it-works-timeline/how-it-works-timeline';
import { WaitlistForm } from '@/features/landing/ui/components/waitlist-form/waitlist-form';
import { trackPageView } from '@/features/template/use-case/commands/analytics.commands';
import './landing-page.scss';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  const { t } = useTranslation();

  useEffect(() => {
    trackPageView('landing');
  }, []);

  const manualItems = t('landing.compare.manual.items', { returnObjects: true }) as string[];
  const dynaItems = t('landing.compare.dyna.items', { returnObjects: true }) as string[];
  const heroPills = t('landing.hero.pills', { returnObjects: true }) as string[];

  return (
    <main className="landing-page">
      <header className="landing-page__header">
        <div className="landing-page__header-inner">
          <div className="landing-page__logo">{t('common.appName')}</div>
          <nav className="landing-page__nav">
            <a href="#compare">{t('landing.nav.compare')}</a>
            <a href="#benefits">{t('landing.nav.benefits')}</a>
            <a href="#demo">{t('landing.nav.demo')}</a>
            <a href="#how">{t('landing.nav.how')}</a>
            <a href="#waitlist">{t('landing.nav.waitlist')}</a>
          </nav>
          <Link to={PATHS.login} className="landing-page__cta">
            {t('landing.waitlist.signIn')}
          </Link>
        </div>
      </header>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={{ duration: 0.6 }}
        className="landing-page__hero"
      >
        <span className="landing-page__hero-badge">{t('landing.hero.badge')}</span>
        <h1 className="landing-page__hero-title">{t('landing.hero.title')}</h1>
        <p className="landing-page__hero-subtitle">{t('landing.hero.subtitle')}</p>
        <ul className="landing-page__hero-pills">
          {heroPills.map(pill => (
            <li key={pill}>{pill}</li>
          ))}
        </ul>
        <div className="landing-page__hero-waitlist">
          <WaitlistForm source="landing_hero" />
        </div>
      </motion.section>

      <AudienceSection />

      <BenefitsSection />

      <section id="compare" className="landing-page__section landing-page__section--white">
        <div className="landing-page__container">
          <motion.div
            className="landing-page__section-intro"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2>{t('landing.compare.title')}</h2>
            <p>{t('landing.compare.subtitle')}</p>
          </motion.div>

          <div className="landing-page__compare-grid">
            <motion.div
              className="landing-page__compare-card landing-page__compare-card--manual"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <Clock className="landing-page__compare-icon" />
              <h3>{t('landing.compare.manual.title')}</h3>
              <ul>
                {manualItems.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="landing-page__compare-time">{t('landing.compare.manual.time')}</p>
            </motion.div>

            <motion.div
              className="landing-page__compare-card landing-page__compare-card--dyna"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ delay: 0.1 }}
            >
              <Zap className="landing-page__compare-icon" />
              <h3>{t('landing.compare.dyna.title')}</h3>
              <ul>
                {dynaItems.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="landing-page__compare-time landing-page__compare-time--highlight">
                {t('landing.compare.dyna.time')}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <DemoVideo />

      <HowItWorksTimeline />

      <section id="waitlist" className="landing-page__section landing-page__section--dark">
        <div className="landing-page__container landing-page__waitlist-section">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="landing-page__section-title landing-page__section-title--light">
              {t('landing.waitlist.title')}
            </h2>
            <p className="landing-page__waitlist-subtitle">{t('landing.waitlist.subtitle')}</p>
            <WaitlistForm source="landing_footer" />
          </motion.div>
        </div>
      </section>

      <footer className="landing-page__footer">
        <div className="landing-page__footer-inner">
          <div className="landing-page__footer-grid">
            <div>
              <p className="landing-page__footer-brand">{t('landing.footer.brand')}</p>
              <p className="landing-page__footer-text">{t('landing.footer.description')}</p>
            </div>

            <div className="landing-page__footer-center">
              <p className="landing-page__footer-label">{t('landing.nav.waitlist')}</p>
              <ul className="landing-page__footer-links">
                <li><a href="#compare">{t('landing.nav.compare')}</a></li>
                <li><a href="#benefits">{t('landing.nav.benefits')}</a></li>
                <li><a href="#demo">{t('landing.nav.demo')}</a></li>
                <li><a href="#how">{t('landing.nav.how')}</a></li>
                <li><a href="#waitlist">{t('landing.nav.waitlist')}</a></li>
              </ul>
            </div>

            <div className="landing-page__footer-end">
              <p className="landing-page__footer-label">{t('landing.footer.status')}</p>
              <p className="landing-page__footer-text">{t('landing.footer.statusDetail')}</p>
            </div>
          </div>

          <div className="landing-page__footer-bottom">
            <p>© {new Date().getFullYear()} {t('common.appName')}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
