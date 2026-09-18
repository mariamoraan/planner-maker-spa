import './home-rail.scss';

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Image as ImageIcon,
  Layers,
  Type,
} from 'lucide-react';
import { AmarkLogo } from '@/core/components/ui/amark-logo';
import { PATHS } from '@/core/routes/paths';
import { AddTemplateButton } from '@/features/template/ui/components/add-template-button/add-template-button';
import { getCoverImage } from '@/features/template/ui/components/template-card/template-card';
import { TemplateCoverThumb } from '@/features/template/ui/components/template-cover-thumb/template-cover-thumb';
import type { Template } from '@/features/template';
import { getTemplatePaperSizeLabel } from '@/features/template';
import { ManageFontsDialog } from '@/features/fonts/ui/components/manage-fonts-dialog/manage-fonts-dialog';
import { UploadFontFamilyDialog } from '@/features/fonts/ui/components/upload-font-family-dialog/upload-font-family-dialog';

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
  const { t } = useTranslation();
  const hasProjects = templates.length > 0;
  const [manageFontsOpen, setManageFontsOpen] = useState(false);
  const [uploadFontsOpen, setUploadFontsOpen] = useState(false);

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
            <AmarkLogo className="home-rail__logo-icon" />
            {t('common.appName')}
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
                          <TemplateCoverThumb image={cover} size="rail" />
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

            <section className="home-rail__section">
              <h2 className="home-rail__section-title">Biblioteca</h2>
              <button
                type="button"
                className="home-rail__library-btn"
                onClick={() => setManageFontsOpen(true)}
              >
                <Type size={16} aria-hidden="true" />
                Tipografías
              </button>
            </section>
          </div>
        )}

        <div className="home-rail__footer">
          <Link to={PATHS.landing} className="home-rail__explore-link">
            {t('home.exploreBrand')}
          </Link>
          <AddTemplateButton label="Nuevo proyecto" />
        </div>
      </div>

      <ManageFontsDialog
        open={manageFontsOpen}
        onOpenChange={setManageFontsOpen}
        onRequestUpload={() => setUploadFontsOpen(true)}
      />
      <UploadFontFamilyDialog
        open={uploadFontsOpen}
        onOpenChange={setUploadFontsOpen}
      />
    </aside>
  );
};
