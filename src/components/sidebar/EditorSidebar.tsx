import React from 'react';
import { FieldTypeSelector } from './FieldTypeSelector';
import './editor-sidebar.scss'
import { useCurrentTemplate } from '@/hooks/use-current-template';
import { useCurrentImage } from '@/hooks/use-current-image';

export const EditorSidebar: React.FC = () => {
    const template = useCurrentTemplate();
    const currentImage = useCurrentImage();

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
