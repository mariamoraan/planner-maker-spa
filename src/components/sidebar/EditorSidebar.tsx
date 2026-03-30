import React from 'react';
import { FieldTypeSelector } from './FieldTypeSelector';

import { useTemplateStore } from '@/stores/template-store';
import './editor-sidebar.scss'

export const EditorSidebar: React.FC = () => {

  const {
      selectedFieldType,
      setSelectedFieldType,
      getCurrentTemplate,
      getCurrentImage,
    } = useTemplateStore();

    const template = getCurrentTemplate();
    const currentImage = getCurrentImage();

  
  return (
    <aside className="editor-sidebar">
      {/* Header */}

      
      {/* Template Actions */}
      {/*
      <div className="p-4 space-y-3">
        {
          templates?.length && (
            <Select
              value={template?.id}
              onValueChange={(v) => {
                setCurrentTemplate(v)
                setCurrentImage(templates.find(template => template.id === v).images[0].id ?? null)
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates?.map(template => (
                  <SelectItem key={template?.id} value={template?.id}>
                    <div>
                      <div>{template?.name}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
        <AddTemplateButton />
      </div>
      */}
      
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {template && currentImage &&  (
            <FieldTypeSelector
            selectedType={selectedFieldType}
            onTypeChange={setSelectedFieldType}
            />
        )}
      </div>
      
      {/* Footer actions */}
    </aside>
  );
};
