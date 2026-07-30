import './home.page.scss';

import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutTemplate } from 'lucide-react';
import { AddTemplateButton } from '@/components/add-template-button/add-template-button';
import { AnimatedTagline } from '@/components/animated-tagline/animated-tagline';
import { TemplateCard } from '@/components/home/template-card';
import { PATHS, getEditorPath } from '@/core/routes/paths';
import { useHomeTemplates } from '@/hooks/use-home-templates';
import { useTemplateStore } from '@/stores/template-store';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export const HomePage = () => {
  const navigate = useNavigate();
  const { templates, isLoading } = useHomeTemplates();
  const setCurrentImage = useTemplateStore(state => state.setCurrentImage);
  const deleteTemplate = useTemplateStore(state => state.deleteTemplate);

  const hasProjects = templates.length > 0;

  const goToTemplate = (templateId: string) => {
    const template = templates.find(item => item.id === templateId);
    setCurrentImage(template?.images[0]?.id ?? null);
    navigate(getEditorPath(templateId));
  };

  const projectCountLabel =
    templates.length === 1
      ? '1 planner'
      : `${templates.length} planners`;

  return (
    <div className="home-page">
      <aside className="home-page__rail">
        <div className="home-page__rail-inner">
          <Link to={PATHS.landing} className="home-page__logo">
            Dyna
          </Link>
          <p className="home-page__rail-tagline">Planners dinámicos</p>
          <div className="home-page__rail-spacer" />
          <AddTemplateButton label="Nuevo proyecto" />
        </div>
      </aside>

      <motion.main
        className="home-page__workspace"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.6 }}
      >
        <div className="home-page__content">
          {isLoading ? (
            <div className="home-page__loading" aria-live="polite">
              Cargando proyectos…
            </div>
          ) : hasProjects ? (
            <>
              <header className="home-page__header">
                <div>
                  <h1 className="home-page__title">Tus proyectos</h1>
                  <p className="home-page__subtitle">
                    {projectCountLabel} · continúa donde lo dejaste
                  </p>
                </div>
              </header>

              <section className="home-page__projects">
                <h2 className="home-page__section-title">Recientes</h2>
                <ol className="home-page__grid">
                  {templates.map((template, index) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      index={index}
                      onOpen={() => goToTemplate(template.id)}
                      onDelete={() => deleteTemplate(template.id)}
                    />
                  ))}
                </ol>
              </section>
            </>
          ) : (
            <div className="home-page__empty">
              <div className="home-page__empty-icon-wrapper">
                <LayoutTemplate className="home-page__empty-icon" />
              </div>
              <AnimatedTagline words={['diseño', 'fechas', 'planner']} prefix="Tu" />
              <h1 className="home-page__empty-title">Crea tu primer planner</h1>
              <p className="home-page__empty-description">
                Sube tus diseños, define áreas dinámicas y genera planners listos
                para imprimir.
              </p>
              <div className="home-page__empty-cta">
                <AddTemplateButton label="Empezar un proyecto" />
              </div>
            </div>
          )}
        </div>
      </motion.main>
    </div>
  );
};
