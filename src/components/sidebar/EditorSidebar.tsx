import React from 'react';
import { FieldTypeSelector } from './FieldTypeSelector';

import { useTemplateStore } from '@/stores/template-store';
import './editor-sidebar.scss'

export const EditorSidebar: React.FC = () => {

  const {
      getCurrentTemplate,
      getCurrentImage,
    } = useTemplateStore();

    const template = getCurrentTemplate();
    const currentImage = getCurrentImage();

  
  return (
    <aside className="editor-sidebar">
      <div className="editor-sidebar__main">
        {template && currentImage &&  (
            <FieldTypeSelector />
        )}
      </div>
    </aside>
  );
};
