import './editor-sidebar.scss'

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FieldTypeSelector } from './FieldTypeSelector';
import { EditorSidebarSection } from './editor-sidebar-section';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, PencilIcon } from '@/core/icons';
import { PATHS } from '@/core/routes/paths';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { TEMPLATE_TYPE_CONFIG, type PlannerLocale, type WeekStartsOn, getTemplatePaperSizeLabel } from '@/features/template';
import { DEFAULT_WEEK_STARTS_ON } from '@/features/template/domain/services/locale-config';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';
import { EditorPlannerActions } from '@/features/export/ui/components/editor-planner-actions/editor-planner-actions';
import { ReplacePageImageButton } from './replace-page-image-button';
import { Label } from '@/core/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/components/ui/select';

type SidebarSectionId = 'page' | 'plannerSettings';

const DEFAULT_SECTION_STATE: Record<SidebarSectionId, boolean> = {
  page: false,
  plannerSettings: false,
};

export const EditorSidebar: React.FC = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const template = useCurrentTemplate();
  const currentImage = useCurrentImage();
  const updateTemplate = useTemplateStore(state => state.updateTemplate);
  const [isEditingTemplateName, setIsEditingTemplateName] = useState(false);
  const [templateName, setTemplateName] = useState(template?.name ?? '');
  const [sectionOpen, setSectionOpen] = useState({
    ...DEFAULT_SECTION_STATE,
    plannerSettings: !currentImage,
  });

  const isDemo = pathname.includes('landing-demo');
  const paperSizeLabel = template ? getTemplatePaperSizeLabel(template) : null;

  const setSectionOpenState = (id: SidebarSectionId, open: boolean) => {
    setSectionOpen(prev => ({ ...prev, [id]: open }));
  };

  const handleLocaleChange = (locale: PlannerLocale) => {
    if (!template) return;
    updateTemplate(template.id, { locale });
  };

  const handleWeekStartsOnChange = (weekStartsOn: WeekStartsOn) => {
    if (!template) return;
    updateTemplate(template.id, { weekStartsOn });
  };

  const commitTemplateName = () => {
    updateTemplate(template?.id ?? '', { name: templateName });
    setIsEditingTemplateName(false);
  };

  return (
    <aside className="editor-sidebar" {...blockSelectionZoneProps}>
      <div className="editor-sidebar__header">
        <div className="editor-sidebar__header__top">
          <div className="editor-sidebar__header__home-icon">
            <Link to={isDemo ? PATHS.landingDemoHome : PATHS.home} aria-label={t('editor.home')}>
              <HomeIcon />
            </Link>
          </div>
          {isEditingTemplateName ? (
            <input
              type="text"
              value={templateName}
              autoFocus
              onChange={(e) => setTemplateName(e.target.value)}
              onBlur={commitTemplateName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitTemplateName();
                }
              }}
              className="editor-sidebar__header__title__input"
            />
          ) : (
            <div className="editor-sidebar__header__title">
              <div className="editor-sidebar__header__title__meta">
                <p className="editor-sidebar__header__title__meta__name">{template?.name ?? 'Template'}</p>
                {paperSizeLabel ? (
                  <span className="editor-sidebar__header__title__meta__format">{paperSizeLabel}</span>
                ) : null}
              </div>
              <button
                type="button"
                className="editor-sidebar__header__title__button"
                onClick={() => setIsEditingTemplateName(true)}
                aria-label={t('editor.renameTemplate')}
              >
                <PencilIcon size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="editor-sidebar__main">
        {template && currentImage ? (
          <div className="editor-sidebar__add-blocks" data-tour-anchor="add-blocks">
            <p className="editor-sidebar__add-blocks__title">{t('editor.addBlocks')}</p>
            <FieldTypeSelector />
          </div>
        ) : template ? (
          <div className="editor-sidebar__add-blocks editor-sidebar__add-blocks--empty">
            <p className="editor-sidebar__add-blocks__title">{t('editor.addBlocks')}</p>
            <p className="editor-sidebar__add-blocks__hint">{t('editor.setup.addBlocksHint')}</p>
          </div>
        ) : null}
        <EditorSidebarSection
          title={t('editor.currentPage')}
          open={sectionOpen.page}
          onOpenChange={(open) => setSectionOpenState('page', open)}
        >
          <p className="editor-sidebar__main__section__content__title">
            {currentImage ? TEMPLATE_TYPE_CONFIG[currentImage.type].label : '—'}
          </p>
          {currentImage ? <ReplacePageImageButton pageId={currentImage.id} /> : null}
        </EditorSidebarSection>
        {template ? (
          <EditorSidebarSection
            title={t('editor.plannerSettings')}
            open={sectionOpen.plannerSettings}
            onOpenChange={(open) => setSectionOpenState('plannerSettings', open)}
          >
            <div className="editor-sidebar__locale">
              <Label className="editor-sidebar__locale-label" htmlFor="planner-locale">
                {t('editor.plannerLocale')}
              </Label>
              <p className="editor-sidebar__locale-hint">{t('editor.plannerLocaleHint')}</p>
              <Select
                value={template.locale ?? 'es'}
                onValueChange={(value) => handleLocaleChange(value as PlannerLocale)}
              >
                <SelectTrigger id="planner-locale" className="editor-sidebar__locale-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="editor-sidebar__locale">
              <Label className="editor-sidebar__locale-label" htmlFor="planner-week-starts-on">
                {t('editor.weekStartsOn')}
              </Label>
              <p className="editor-sidebar__locale-hint">{t('editor.weekStartsOnHint')}</p>
              <Select
                value={template.weekStartsOn ?? DEFAULT_WEEK_STARTS_ON}
                onValueChange={(value) => handleWeekStartsOnChange(value as WeekStartsOn)}
              >
                <SelectTrigger id="planner-week-starts-on" className="editor-sidebar__locale-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monday">{t('editor.weekStartsOnMonday')}</SelectItem>
                  <SelectItem value="sunday">{t('editor.weekStartsOnSunday')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </EditorSidebarSection>
        ) : null}
      </div>
      <div className="editor-sidebar__footer">
        <EditorPlannerActions variant="sidebar" />
      </div>
    </aside>
  );
};
