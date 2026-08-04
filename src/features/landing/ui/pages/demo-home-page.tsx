import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { HomeRail } from '@/features/template/ui/components/home-rail/home-rail';
import { NewProjectCard } from '@/features/template/ui/components/new-project-card/new-project-card';
import { TemplateCard } from '@/features/template/ui/components/template-card/template-card';
import { DEMO_HOME_TEMPLATES } from '@/features/landing/domain/demo-template-data';
import '@/features/template/ui/pages/home.page.scss';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export function DemoHomePage() {
  const { t } = useTranslation();
  const templates = DEMO_HOME_TEMPLATES;

  return (
    <div className="home-page">
      <HomeRail templates={templates} isLoading={false} onOpenTemplate={() => undefined} />

      <main className="home-page__workspace">
        <div className="home-page__content">
          <motion.div
            className="home-page__content-inner"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            <header className="home-page__header">
              <div>
                <h1 className="home-page__title">{t('home.projects')}</h1>
                <p className="home-page__subtitle">{templates.length} planners</p>
              </div>
            </header>

            <section className="home-page__projects">
              <h2 className="home-page__section-title">{t('home.recent')}</h2>
              <ol className="home-page__grid">
                {templates.map((template, index) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    index={index}
                    onOpen={() => undefined}
                    onDelete={() => undefined}
                  />
                ))}
                <NewProjectCard index={templates.length} />
              </ol>
            </section>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
