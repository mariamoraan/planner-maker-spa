import './editor-sidebar.scss'

import React, { useEffect, useRef, useState } from 'react';
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
import { TEMPLATE_TYPE_CONFIG } from '@/types/planner';
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
          title="Current Page"
          open={sectionOpen.currentPage}
          onOpenChange={(open) => setSectionOpenState('currentPage', open)}
        >
          <p className='editor-sidebar__main__section__content__title'>
            {currentImage ? TEMPLATE_TYPE_CONFIG[currentImage.type].label : '—'}
          </p>
        </EditorSidebarSection>
        {template && currentImage && (
          <EditorSidebarSection
            title="Dynamic Blocks"
            open={sectionOpen.dynamicBlocks}
            onOpenChange={(open) => setSectionOpenState('dynamicBlocks', open)}
          >
            <FieldTypeSelector />
          </EditorSidebarSection>
        )}
        <EditorSidebarSection
          title="Actions"
          open={sectionOpen.actions}
          onOpenChange={(open) => setSectionOpenState('actions', open)}
        >
          <EditorPlannerActions variant="sidebar" />
        </EditorSidebarSection>
        {selectedRectangleId && (
          <EditorSidebarSection
            title="Block Settings"
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
