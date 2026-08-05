import './home-rail.scss';

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CloudUpload,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
} from 'lucide-react';
import { AddTemplateButton } from '@/features/template/ui/components/add-template-button/add-template-button';
import { getCoverImage } from '@/features/template/ui/components/template-card/template-card';
import { PATHS } from '@/core/routes/paths';
import type { Template } from '@/features/template';
import { getTemplatePaperSizeLabel } from '@/features/template';

const ONBOARDING_STEPS = [
  { icon: ImageIcon, label: 'Sube tu diseño' },
  { icon: Layers, label: 'Define bloques dinámicos' },
  { icon: Calendar, label: 'Genera tu planner' },
] as const;

const MAX_RECENT = 5;

interface HomeRailProps {
  templates: Template[];
  isLoading: boolean;
  onOpenTemplate: (templateId: string) => void;
}

export const HomeRail = ({ templates, isLoading, onOpenTemplate }: HomeRailProps) => {
  const hasProjects = templates.length > 0;

  const recentTemplates = useMemo(
    () =>
      [...templates]
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, MAX_RECENT),
    [templates],
  );

  return (
    <aside className="home-rail">
      <div className="home-rail__inner">
        <header className="home-rail__header">
          <Link to={PATHS.landing} className="home-rail__logo">
            <LayoutTemplate className="home-rail__logo-icon" aria-hidden="true" />
            Dyna
          </Link>
          <p className="home-rail__tagline">Planners dinámicos</p>
        </header>

        {!isLoading && (
          <div className="home-rail__body">
            {hasProjects ? (
              <section className="home-rail__section">
                <h2 className="home-rail__section-title">Recientes</h2>
                <ul className="home-rail__recent-list">
                  {recentTemplates.map(template => {
                    const cover = getCoverImage(template.images);
                    const paperSizeLabel = getTemplatePaperSizeLabel(template);

                    return (
                      <li key={template.id}>
                        <button
                          type="button"
                          className="home-rail__recent-item"
                          onClick={() => onOpenTemplate(template.id)}
                          aria-label={`Abrir ${template.name}`}
                        >
                          {cover?.src ? (
                            <img
                              className="home-rail__recent-thumb"
                              src={cover.src}
                              alt=""
                            />
                          ) : (
                            <span className="home-rail__recent-placeholder" aria-hidden="true">
                              <CloudUpload className="home-rail__recent-placeholder-icon" />
                            </span>
                          )}
                          <span className="home-rail__recent-name">
                            <span className="home-rail__recent-name-text">{template.name}</span>
                            {paperSizeLabel ? (
                              <span className="home-rail__recent-format">{paperSizeLabel}</span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : (
              <section className="home-rail__section home-rail__section--tips">
                <h2 className="home-rail__section-title">Cómo empezar</h2>
                <ol className="home-rail__tips">
                  {ONBOARDING_STEPS.map(({ icon: Icon, label }) => (
                    <li key={label} className="home-rail__tip">
                      <span className="home-rail__tip-icon-wrapper" aria-hidden="true">
                        <Icon className="home-rail__tip-icon" />
                      </span>
                      <span className="home-rail__tip-label">{label}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        )}

        <div className="home-rail__footer">
          <Link to={PATHS.landing} className="home-rail__explore-link">
            Explorar Dyna
          </Link>
          <AddTemplateButton label="Nuevo proyecto" />
        </div>
      </div>
    </aside>
  );
};
