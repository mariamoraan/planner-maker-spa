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
import {
  pageTypeLabelKey,
  type FontId,
  type PlannerLocale,
  type WeekStartsOn,
  getTemplatePaperSizeLabel,
  toCustomFontId,
} from '@/features/template';
import { DEFAULT_WEEK_STARTS_ON } from '@/features/template/domain/services/locale-config';
import {
  FONT_REGISTRY,
  resolvePlannerDefaultFontId,
} from '@/features/editor/domain/services/field-style-config';
import {
  applyPlannerFontToRectangle,
  shouldFollowPlannerFont,
} from '@/features/editor/domain/services/planner-default-font';
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
import { UploadFontFamilyDialog } from '@/features/fonts/ui/components/upload-font-family-dialog/upload-font-family-dialog';
import { ManageFontsDialog } from '@/features/fonts/ui/components/manage-fonts-dialog/manage-fonts-dialog';
import { resolveFontLabel } from '@/features/fonts/ui/components/font-picker-list/font-picker-list';
import { useFontLibraryStore } from '@/features/fonts/ui/stores/font-library-store';
import { cssFamilyNameForCustomFont } from '@/features/fonts/domain/entities/custom-font-family';
import { usePlanLimits } from '@/core/plans';
import { Plus, Settings2 } from 'lucide-react';

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
  const updateRectangles = useTemplateStore(state => state.updateRectangles);
  const [isEditingTemplateName, setIsEditingTemplateName] = useState(false);
  const [templateName, setTemplateName] = useState(template?.name ?? '');
  const [sectionOpen, setSectionOpen] = useState({
    ...DEFAULT_SECTION_STATE,
    plannerSettings: !currentImage,
  });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const customFonts = useFontLibraryStore(state => state.fonts);
  const { canUploadFont, limits } = usePlanLimits();
  const fontsLimitHint = t('limits.fontsLimitReached', { max: limits.maxFontFamilies });

  const isDemo = pathname.includes('landing-demo');
  const paperSizeLabel = template ? getTemplatePaperSizeLabel(template) : null;
  const plannerFontId = resolvePlannerDefaultFontId(template?.defaultFontId);

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

  const handleDefaultFontChange = (nextFontId: FontId) => {
    if (!template || nextFontId === plannerFontId) return;

    const previousFontId = plannerFontId;
    updateTemplate(template.id, { defaultFontId: nextFontId });

    for (const page of template.images) {
      const updates = page.rectangles
        .filter(rect => shouldFollowPlannerFont(rect, previousFontId))
        .map(rect => ({
          rectangleId: rect.id,
          changes: {
            style: applyPlannerFontToRectangle(rect, nextFontId).style,
          },
        }));

      if (updates.length > 0) {
        updateRectangles(template.id, page.id, updates);
      }
    }
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
            {currentImage ? t(pageTypeLabelKey(currentImage.type)) : '—'}
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
            <div className="editor-sidebar__locale">
              <Label className="editor-sidebar__locale-label" htmlFor="planner-default-font">
                {t('editor.plannerDefaultFont')}
              </Label>
              <p className="editor-sidebar__locale-hint">{t('editor.plannerDefaultFontHint')}</p>
              <div className="editor-sidebar__font-row">
                <Select
                  value={plannerFontId}
                  onValueChange={(value) => handleDefaultFontChange(value as FontId)}
                >
                  <SelectTrigger id="planner-default-font" className="editor-sidebar__locale-select">
                    <SelectValue>
                      {resolveFontLabel(plannerFontId, customFonts)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {customFonts.length > 0 ? (
                      <>
                        {customFonts.map(font => {
                          const fontId = toCustomFontId(font.id);
                          const family = cssFamilyNameForCustomFont(font.id);
                          return (
                            <SelectItem key={font.id} value={fontId}>
                              <span style={{ fontFamily: `"${family}", system-ui, sans-serif` }}>
                                {font.name}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </>
                    ) : null}
                    {FONT_REGISTRY.map(font => (
                      <SelectItem key={font.id} value={font.id}>
                        <span style={{ fontFamily: font.family }}>{font.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  className="editor-sidebar__font-action"
                  title={canUploadFont ? 'Subir tipografía' : fontsLimitHint}
                  disabled={!canUploadFont}
                  onClick={() => setUploadOpen(true)}
                >
                  <Plus size={16} />
                </button>
                <button
                  type="button"
                  className="editor-sidebar__font-action"
                  title="Gestionar tipografías"
                  onClick={() => setManageOpen(true)}
                >
                  <Settings2 size={16} />
                </button>
              </div>
            </div>
          </EditorSidebarSection>
        ) : null}
      </div>
      <div className="editor-sidebar__footer">
        <EditorPlannerActions variant="sidebar" />
      </div>
      <UploadFontFamilyDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onCreated={fontId => handleDefaultFontChange(toCustomFontId(fontId))}
      />
      <ManageFontsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        onRequestUpload={() => {
          if (!canUploadFont) return;
          setUploadOpen(true);
        }}
      />
    </aside>
  );
};
