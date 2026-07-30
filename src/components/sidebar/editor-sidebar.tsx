import './editor-sidebar.scss'

import React from 'react';
import { FieldTypeSelector } from './FieldTypeSelector';
import { useCurrentTemplate } from '@/hooks/use-current-template';
import { useCurrentImage } from '@/hooks/use-current-image';
import { Link } from 'react-router-dom';
import { HomeIcon } from '@/core/icons';
import { PATHS } from '@/core/routes/paths';

export const EditorSidebar: React.FC = () => {
    const template = useCurrentTemplate();
    const currentImage = useCurrentImage();

  return (
    <aside className="editor-sidebar">
      <div className='editor-sidebar__header'>
        <div>
          <Link to={PATHS.home}><HomeIcon /></Link>
        </div>
        <p className='editor-sidebar__header__title'>{template?.name ?? 'Template'}</p>
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
