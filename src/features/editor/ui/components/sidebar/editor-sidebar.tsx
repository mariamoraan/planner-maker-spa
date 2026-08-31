import './editor-sidebar.scss'
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FieldTypeSelector } from './FieldTypeSelector';
import { AreaStylePanel } from './area-style-panel';
import { GridStylePanel } from './grid-style-panel';
import { BlockSettingsHeader } from './block-settings-header';
import { EditorSidebarSection } from './editor-sidebar-section';
import { useGridGroupOps } from '@/features/editor/ui/hooks/use-grid-group-ops';
import {
  canGroupSelection,
  getGridGroupForSelection,
} from '@/features/editor/domain/services/grid-group';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, PencilIcon } from '@/core/icons';
import { PATHS } from '@/core/routes/paths';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { useManageAreas } from '@/features/editor/ui/hooks/use-manage-areas';
import { TEMPLATE_TYPE_CONFIG, type PlannerLocale, type WeekStartsOn, getTemplatePaperSizeLabel } from '@/features/template';
import { DEFAULT_WEEK_STARTS_ON } from '@/features/template/domain/services/locale-config';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';
import { EditorPlannerActions } from '@/features/export/ui/components/editor-planner-actions/editor-planner-actions';
import { ReplacePageImageButton } from './replace-page-image-button';

type SidebarSectionId = 'currentPage' | 'dynamicBlocks' | 'actions' | 'blockSettings';

const DEFAULT_SECTION_STATE: Record<SidebarSectionId, boolean> = {
  currentPage: true,
  dynamicBlocks: true,
  actions: false,
  blockSettings: false,
};

export const EditorSidebar: React.FC = () => {
  const {pathname} = useLocation();
    const { t } = useTranslation();
    const template = useCurrentTemplate();
    const currentImage = useCurrentImage();
    const updateTemplate = useTemplateStore(state => state.updateTemplate);
    const selectedRectangleIds = useEditorStore(state => state.selectedRectangleIds);
    const { deleteAreas } = useManageAreas();
    const { groupSelectionAsGrid } = useGridGroupOps();
    const [isEditingTemplateName, setIsEditingTemplateName] = useState(false);
    const [templateName, setTemplateName] = useState(template?.name ?? '');
    const [sectionOpen, setSectionOpen] = useState(DEFAULT_SECTION_STATE);
    const prevSelectionCount = useRef(0);

    const isDemo = pathname.includes('landing-demo');
    const paperSizeLabel = template ? getTemplatePaperSizeLabel(template) : null;
    const singleSelectedId = selectedRectangleIds.length === 1 ? selectedRectangleIds[0] : null;
    const multiSelected = selectedRectangleIds.length > 1;
    const rectangles = currentImage?.rectangles ?? [];
    const lockedGridGroup = getGridGroupForSelection(selectedRectangleIds, currentImage?.gridGroups);
    const isLockedGridGroupSelected = lockedGridGroup !== null;
    const canGroup = canGroupSelection(selectedRectangleIds, rectangles);
    const showMultiBlockSection = multiSelected && !isLockedGridGroupSelected;

    const setSectionOpenState = (id: SidebarSectionId, open: boolean) => {
      setSectionOpen(prev => ({ ...prev, [id]: open }));
    };

    useEffect(() => {
      if (selectedRectangleIds.length > 0 && prevSelectionCount.current === 0) {
        setSectionOpen(prev => ({ ...prev, blockSettings: true }));
      }
      prevSelectionCount.current = selectedRectangleIds.length;
    }, [selectedRectangleIds.length]);

    const handleLocaleChange = (locale: PlannerLocale) => {
      if (!template) return;
      updateTemplate(template.id, { locale });
    };

    const handleWeekStartsOnChange = (weekStartsOn: WeekStartsOn) => {
      if (!template) return;
      updateTemplate(template.id, { weekStartsOn });
    };

  return (
    <aside className="editor-sidebar" {...blockSelectionZoneProps}>
      <div className='editor-sidebar__header'>
        <div className='editor-sidebar__header__home-icon'>
          <Link to={isDemo ? PATHS.landingDemoHome : PATHS.home}><HomeIcon /></Link>
        </div>
        {isEditingTemplateName ? (
          <input 
          type="text" 
          value={templateName} 
          autoFocus
          onChange={(e) => setTemplateName(e.target.value)} 
          onBlur={() => {
            updateTemplate(template?.id ?? '', {name: templateName});
            setIsEditingTemplateName(false);
          }} 
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateTemplate(template?.id ?? '', {name: templateName});
              setIsEditingTemplateName(false);
            }
          }}
          className='editor-sidebar__header__title__input'
          />
        ) : (
          <div className='editor-sidebar__header__title'>
            <div className='editor-sidebar__header__title__meta'>
              <p className='editor-sidebar__header__title__name'>{template?.name ?? 'Template'}</p>
              {paperSizeLabel ? (
                <span className='editor-sidebar__header__title__format'>{paperSizeLabel}</span>
              ) : null}
            </div>
            <button className='editor-sidebar__header__title__button' onClick={() => setIsEditingTemplateName(true)}>
              <PencilIcon size={14} />
            </button>
          </div>
        )}
        <EditorPlannerActions variant="sidebar" />
      </div>
      <div className="editor-sidebar__main">
        <EditorSidebarSection
          title={t('editor.currentPage')}
          open={sectionOpen.currentPage}
          onOpenChange={(open) => setSectionOpenState('currentPage', open)}
        >
          <p className='editor-sidebar__main__section__content__title'>
            {currentImage ? TEMPLATE_TYPE_CONFIG[currentImage.type].label : '—'}
          </p>
          {currentImage ? <ReplacePageImageButton pageId={currentImage.id} /> : null}
        </EditorSidebarSection>
        {template && currentImage && (
          <EditorSidebarSection
            title={t('editor.dynamicBlocks')}
            open={sectionOpen.dynamicBlocks}
            onOpenChange={(open) => setSectionOpenState('dynamicBlocks', open)}
          >
            <FieldTypeSelector />
          </EditorSidebarSection>
        )}
        <EditorSidebarSection
          title={t('editor.actions')}
          open={sectionOpen.actions}
          onOpenChange={(open) => setSectionOpenState('actions', open)}
        >
          {template && (
            <div className="editor-sidebar__locale">
              <label className="editor-sidebar__locale-label" htmlFor="planner-locale">
                {t('editor.plannerLocale')}
              </label>
              <p className="editor-sidebar__locale-hint">{t('editor.plannerLocaleHint')}</p>
              <select
                id="planner-locale"
                className="editor-sidebar__locale-select"
                value={template.locale ?? 'es'}
                onChange={(e) => handleLocaleChange(e.target.value as PlannerLocale)}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
          )}
          {template && (
            <div className="editor-sidebar__locale">
              <label className="editor-sidebar__locale-label" htmlFor="planner-week-starts-on">
                {t('editor.weekStartsOn')}
              </label>
              <p className="editor-sidebar__locale-hint">{t('editor.weekStartsOnHint')}</p>
              <select
                id="planner-week-starts-on"
                className="editor-sidebar__locale-select"
                value={template.weekStartsOn ?? DEFAULT_WEEK_STARTS_ON}
                onChange={(e) => handleWeekStartsOnChange(e.target.value as WeekStartsOn)}
              >
                <option value="monday">{t('editor.weekStartsOnMonday')}</option>
                <option value="sunday">{t('editor.weekStartsOnSunday')}</option>
              </select>
            </div>
          )}
        </EditorSidebarSection>
        {showMultiBlockSection && (
          <EditorSidebarSection
            title={t('editor.blockSettings')}
            open={sectionOpen.blockSettings}
            onOpenChange={(open) => setSectionOpenState('blockSettings', open)}
          >
            <p className="editor-sidebar__multi-select-count">
              {t('editor.blocksSelected', { count: selectedRectangleIds.length })}
            </p>
            {canGroup ? (
              <button
                type="button"
                className="editor-sidebar__grid-action"
                onClick={() => groupSelectionAsGrid([...selectedRectangleIds])}
              >
                {t('editor.gridGroupAsGrid')}
              </button>
            ) : null}
            <button
              type="button"
              className="editor-sidebar__delete-selected"
              onClick={() => deleteAreas([...selectedRectangleIds])}
            >
              {t('editor.deleteSelected')}
            </button>
          </EditorSidebarSection>
        )}
        {singleSelectedId && !isLockedGridGroupSelected && (
          <EditorSidebarSection
            title={t('editor.blockSettings')}
            open={sectionOpen.blockSettings}
            onOpenChange={(open) => setSectionOpenState('blockSettings', open)}
          >
            <BlockSettingsHeader rectangleId={singleSelectedId} />
            <AreaStylePanel />
          </EditorSidebarSection>
        )}
        {isLockedGridGroupSelected && lockedGridGroup && (
          <EditorSidebarSection
            title={t('editor.blockSettings')}
            open={sectionOpen.blockSettings}
            onOpenChange={(open) => setSectionOpenState('blockSettings', open)}
          >
            <GridStylePanel group={lockedGridGroup} />
          </EditorSidebarSection>
        )}
      </div>
    </aside>
  );
};
