import './editor-sidebar.scss'

import React, { useState } from 'react';
import { FieldTypeSelector } from './FieldTypeSelector';
import { useCurrentTemplate } from '@/hooks/use-current-template';
import { useCurrentImage } from '@/hooks/use-current-image';
import { Link } from 'react-router-dom';
import { HomeIcon, PencilIcon } from '@/core/icons';
import { PATHS } from '@/core/routes/paths';
import { useTemplateStore } from '@/stores/template-store';

export const EditorSidebar: React.FC = () => {
    const template = useCurrentTemplate();
    const currentImage = useCurrentImage();
    const updateTemplate = useTemplateStore(state => state.updateTemplate);
    const [isEditingTemplateName, setIsEditingTemplateName] = useState(false);
    const [templateName, setTemplateName] = useState(template?.name ?? '');

  return (
    <aside className="editor-sidebar">
      <div className='editor-sidebar__header'>
        <div>
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
        {template && currentImage &&  (
            <>
            <p className='editor-sidebar__main__title'>Dynamic Blocks</p>
            <FieldTypeSelector />
            </>
        )}
      </div>
    </aside>
  );
};
