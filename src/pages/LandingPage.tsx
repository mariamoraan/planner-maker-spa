import { Check, Sparkles, Calendar, Image as ImageIcon, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { PATHS } from '@/core/routes/paths';
import { useNavigate } from 'react-router-dom';
import './landing-page.scss';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const tiers = [
  {
    name: 'Free',
    price: 'Available now',
    description: 'Everything you need to build your first dynamic planner',
    features: [
      'Create 1 planner',
      'Upload your own images',
      'Basic dynamic pages (monthly calendar)',
      'Limited date range generation',
      'Local storage on your device',
    ],
    cta: 'Start for free',
    onClick: (navigate: (path: string) => void) => {
      navigate(PATHS.home);
    },
    highlight: true,
  },
  {
    name: 'Pro Add-ons',
    price: 'Coming soon',
    description: 'Unlock advanced capabilities, only what you need',
    features: [
      'Advanced dynamic pages (weekly, covers, custom layouts)',
      'Extended date ranges',
      'Premium typography packs',
      'Specialized selectors & generators',
    ],
    cta: 'Coming soon',
  },
  {
    name: 'Cloud',
    price: 'Coming later',
    description: 'Sync and protect your planners',
    features: [
      'Cloud sync across devices',
      'Backup & restore',
      'Planner sharing',
      'Version history',
    ],
    cta: 'Coming later',
  },
];

const steps = [
  {
    icon: ImageIcon,
    title: 'Upload your design',
    text: 'Start from your own images: covers, monthly or weekly layouts.',
  },
  {
    icon: Layers,
    title: 'Define dynamic zones',
    text: 'Select exactly where months, days or years should appear.',
  },
  {
    icon: Calendar,
    title: 'Choose a date range',
    text: 'From a few weeks to a full year — you decide.',
  },
  {
    icon: Sparkles,
    title: 'Generate automatically',
    text: 'Pages are duplicated, ordered and filled with correct data.',
  },
];

const features = [
  {
    title: 'Design-first',
    text: 'Start from your own visuals. No locked templates, no forced grids.',
  },
  {
    title: 'Truly dynamic',
    text: 'Dates, months and days are generated programmatically based on real calendars.',
  },
  {
    title: 'Generative by nature',
    text: 'One page design can become dozens of perfectly ordered planner pages.',
  },
  {
    title: 'Print-aware',
    text: 'Layouts are built with PDF export and real-world printing in mind.',
  },
  {
    title: 'Local-first',
    text: 'Your data stays on your device. No accounts, no uploads required.',
  },
  {
    title: 'Expandable',
    text: 'Advanced selectors, typography packs and cloud sync are designed to plug in later.',
  },
];

const roadmap = [
  {
    phase: 'Now',
    title: 'Core planner generation',
    items: [
      'Upload custom images',
      'Define dynamic areas',
      'Generate planners by date range',
      'Local-first storage',
      'PDF export',
    ],
  },
  {
    phase: 'Next',
    title: 'Advanced generation & customization',
    items: [
      'Weekly and advanced page generators',
      'Extended date logic and rules',
      'Advanced selectors',
      'Typography packs',
    ],
  },
  {
    phase: 'Later',
    title: 'Cloud & collaboration',
    items: [
      'Cloud sync across devices',
      'Backup & restore',
      'Planner sharing',
      'Version history',
    ],
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="landing-page">
      <header className="landing-page__header">
        <div className="landing-page__header-inner">
          <div className="landing-page__logo">Dyna</div>
          <nav className="landing-page__nav">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#roadmap">Roadmap</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <a href={PATHS.home} className="landing-page__cta">
            Start creating for free
          </a>
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
        <h1 className="landing-page__hero-title">
          Design once.
          <br />
          Generate planners forever.
        </h1>
        <p className="landing-page__hero-subtitle">
          Upload your own designs, define dynamic areas, and generate fully-dated planners
          automatically — perfectly aligned, every time.
        </p>
        <div className="landing-page__hero-actions">
          <a href={PATHS.home} className="landing-page__cta">
            Start creating for free
          </a>
          <a className="landing-page__cta-outline">See an example</a>
        </div>
      </motion.section>

      <section id="how" className="landing-page__section landing-page__section--white">
        <div className="landing-page__container">
          <motion.h2
            className="landing-page__section-title"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            How it works
          </motion.h2>
          <div className="landing-page__grid-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="landing-page__card landing-page__card--neutral"
              >
                <step.icon className="landing-page__card-icon" />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="landing-page__section landing-page__section--neutral">
        <div className="landing-page__container">
          <motion.div
            className="landing-page__section-intro"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2>Built for flexible planners</h2>
            <p>
              This tool adapts to your designs instead of forcing you into predefined layouts.
              You stay in control of structure, visuals and logic.
            </p>
          </motion.div>

          <div className="landing-page__grid-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="landing-page__card landing-page__card--white"
              >
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="roadmap" className="landing-page__section landing-page__section--white">
        <div className="landing-page__container">
          <motion.h2
            className="landing-page__section-title"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            Roadmap
          </motion.h2>

          <div className="landing-page__roadmap">
            <div className="landing-page__roadmap-line" />

            {roadmap.map((block, index) => (
              <motion.div
                key={block.phase}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="landing-page__roadmap-item"
              >
                <div className={index % 2 === 0 ? 'landing-page__roadmap-content landing-page__roadmap-content--left' : 'landing-page__roadmap-content landing-page__roadmap-content--hidden-mobile'}>
                  {index % 2 === 0 && (
                    <div>
                      <p className="landing-page__roadmap-phase">{block.phase}</p>
                      <h3 className="landing-page__roadmap-title">{block.title}</h3>
                      <ul className="landing-page__roadmap-list">
                        {block.items.map(item => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="landing-page__roadmap-dot" />

                <div className="landing-page__roadmap-content landing-page__roadmap-content--right">
                  {index % 2 === 1 && (
                    <div>
                      <p className="landing-page__roadmap-phase">{block.phase}</p>
                      <h3 className="landing-page__roadmap-title">{block.title}</h3>
                      <ul className="landing-page__roadmap-list">
                        {block.items.map(item => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="landing-page__section landing-page__section--neutral">
        <div className="landing-page__container">
          <h2 className="landing-page__section-title">Pricing</h2>
          <div className="landing-page__pricing-grid">
            {tiers.map(tier => (
              <div
                key={tier.name}
                className={`landing-page__pricing-card${tier.highlight ? ' landing-page__pricing-card--highlight' : ''}`}
              >
                <h3>{tier.name}</h3>
                <p className="landing-page__pricing-description">{tier.description}</p>
                <p className="landing-page__pricing-price">{tier.price}</p>
                <ul className="landing-page__pricing-features">
                  {tier.features.map(feature => (
                    <li key={feature} className="landing-page__pricing-feature">
                      <Check />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => tier?.onClick?.(navigate)}
                  disabled={!tier?.onClick}
                  className="landing-page__pricing-button"
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="landing-page__footer">
        <div className="landing-page__footer-inner">
          <div className="landing-page__footer-grid">
            <div>
              <p className="landing-page__footer-brand">Planner Builder</p>
              <p className="landing-page__footer-text">
                Build fully custom planners using your own designs and dynamic date logic.
                A local‑first tool for creators who care about structure, flexibility and craft.
              </p>
            </div>

            <div className="landing-page__footer-center">
              <p className="landing-page__footer-label">Product</p>
              <ul className="landing-page__footer-links">
                <li><a href="#features">Features</a></li>
                <li><a href="#how">How it works</a></li>
                <li><a href="#roadmap">Roadmap</a></li>
                <li><a href="#pricing">Pricing</a></li>
              </ul>
            </div>

            <div className="landing-page__footer-end">
              <p className="landing-page__footer-label">Status</p>
              <p className="landing-page__footer-text">Early access · Local‑first</p>
              <p className="landing-page__footer-text">Cloud sync & accounts coming later</p>
            </div>
          </div>

          <div className="landing-page__footer-bottom">
            <p>© {new Date().getFullYear()} Planner Builder. All rights reserved.</p>
            <p>Designed & built with care.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
