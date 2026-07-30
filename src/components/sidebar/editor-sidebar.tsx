import './editor-sidebar.scss'

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FieldTypeSelector } from './FieldTypeSelector';
import { AreaStylePanel } from './area-style-panel';
import { BlockSettingsHeader } from './block-settings-header';
import { EditorSidebarSection } from './editor-sidebar-section';
import { useCurrentTemplate } from '@/hooks/use-current-template';
import { useCurrentImage } from '@/hooks/use-current-image';
import { Link } from 'react-router-dom';
import { HomeIcon, PencilIcon } from '@/core/icons';
import { PATHS } from '@/core/routes/paths';
import { useTemplateStore } from '@/stores/template-store';
import { TEMPLATE_TYPE_CONFIG, type PlannerLocale } from '@/types/planner';
import { blockSelectionZoneProps } from '@/lib/block-selection';
import { EditorPlannerActions } from '@/components/shared/editor-planner-actions';

type SidebarSectionId = 'currentPage' | 'dynamicBlocks' | 'actions' | 'blockSettings';

const DEFAULT_SECTION_STATE: Record<SidebarSectionId, boolean> = {
  currentPage: false,
  dynamicBlocks: true,
  actions: false,
  blockSettings: false,
};

export const EditorSidebar: React.FC = () => {
    const { t } = useTranslation();
    const template = useCurrentTemplate();
    const currentImage = useCurrentImage();
    const updateTemplate = useTemplateStore(state => state.updateTemplate);
    const selectedRectangleId = useTemplateStore(state => state.selectedRectangleId);
    const [isEditingTemplateName, setIsEditingTemplateName] = useState(false);
    const [templateName, setTemplateName] = useState(template?.name ?? '');
    const [sectionOpen, setSectionOpen] = useState(DEFAULT_SECTION_STATE);
    const prevSelectedRectangleId = useRef<string | null>(null);

    const setSectionOpenState = (id: SidebarSectionId, open: boolean) => {
      setSectionOpen(prev => ({ ...prev, [id]: open }));
    };

    useEffect(() => {
      if (selectedRectangleId && !prevSelectedRectangleId.current) {
        setSectionOpen(prev => ({ ...prev, blockSettings: true }));
      }
      prevSelectedRectangleId.current = selectedRectangleId;
    }, [selectedRectangleId]);

    const handleLocaleChange = (locale: PlannerLocale) => {
      if (!template) return;
      updateTemplate(template.id, { locale });
    };

  return (
    <aside className="editor-sidebar" {...blockSelectionZoneProps}>
      <div className='editor-sidebar__header'>
        <div className='editor-sidebar__header__home-icon'>
          <Link to={PATHS.home}><HomeIcon /></Link>
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
            <p className='editor-sidebar__header__title__name'>{template?.name ?? 'Template'}</p>
            <button className='editor-sidebar__header__title__button' onClick={() => setIsEditingTemplateName(true)}>
              <PencilIcon size={14} />
            </button>
          </div>
        )}
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
          <EditorPlannerActions variant="sidebar" />
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
        </EditorSidebarSection>
        {selectedRectangleId && (
          <EditorSidebarSection
            title={t('editor.blockSettings')}
            open={sectionOpen.blockSettings}
            onOpenChange={(open) => setSectionOpenState('blockSettings', open)}
          >
            <BlockSettingsHeader rectangleId={selectedRectangleId} />
            <AreaStylePanel />
          </EditorSidebarSection>
        )}
      </div>
    </aside>
  );
};
