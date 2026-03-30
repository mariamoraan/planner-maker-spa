import React from 'react';
import {  
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FieldTypeSelector } from './FieldTypeSelector';
import { RectangleList } from './RectangleList';
import { TemplateImageList } from './TemplateImageList';
import { ImageUploader } from '@/components/canvas/ImageUploader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useTemplateStore } from '@/stores/template-store';
import { useManageAreas } from '@/hooks/use-manage-areas';
import { useManageImages } from '@/hooks/use-manage-images';
import { AddTemplateButton } from '../add-template-button/add-template-button';

export const EditorSidebar: React.FC = () => {
 
  
  

  const openGenerator = useTemplateStore(state => state.openGenerator)
  const {deleteImage} = useManageImages();
  const {deleteArea, updateAreaType} = useManageAreas()

  const {
      templates,
      setCurrentTemplate,
      setCurrentImage,
      selectedFieldType,
      setSelectedFieldType,
      selectedRectangleId,
      setSelectedRectangleId,
      getCurrentTemplate,
      getCurrentImage,
      createTemplate
    } = useTemplateStore();

    const template = getCurrentTemplate();
    const currentImage = getCurrentImage();

  
  
  
  return (
    <aside className="w-80 bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white from-sidebar-primary to-sidebar-primary/70 flex items-center justify-center shadow-lg">
            <img src='./icon.png' className="w-8 h-8" />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">Planner Maker</h1>
            <p className="text-xs text-sidebar-foreground/60">Template Editor</p>
          </div>
        </div>
      </div>
      
      {/* Template Actions */}
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
        {template &&  (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium text-sidebar-foreground">{template.name}</h2>
                <p className="text-xs text-sidebar-foreground/60">
                  {template.images.length} page{template.images.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <ImageUploader />
          </>
        )}
      </div>
      
      <Separator className="bg-sidebar-border" />
      
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {template && (
          <>
            <TemplateImageList
              images={template.images}
              selectedId={currentImage?.id ?? null}
              onSelect={setCurrentImage}
              onDelete={deleteImage}
            />
            
            {currentImage && (
              <>
                <Separator className="bg-sidebar-border" />
                
                <FieldTypeSelector
                  selectedType={selectedFieldType}
                  onTypeChange={setSelectedFieldType}
                />
                
                <Separator className="bg-sidebar-border" />
                
                <RectangleList
                  rectangles={currentImage.rectangles}
                  selectedId={selectedRectangleId}
                  onSelect={setSelectedRectangleId}
                  onDelete={deleteArea}
                  onUpdateType={updateAreaType}
                />
              </>
            )}
          </>
        )}
      </div>
      
      {/* Footer actions */}
      {template && template.images.length > 0 && (
        <div className="p-4 border-t border-sidebar-border">
          <Button 
            className="w-full bg-gradient-to-r from-sidebar-primary to-accent hover:opacity-90 text-white"
            onClick={openGenerator}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Planner
          </Button>
        </div>
      )}
    </aside>
  );
};
