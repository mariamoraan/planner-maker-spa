import React, { useState, useCallback } from 'react';
import {  
  Plus,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FieldTypeSelector } from './FieldTypeSelector';
import { RectangleList } from './RectangleList';
import { TemplateImageList } from './TemplateImageList';
import { ImageUploader } from '@/components/canvas/ImageUploader';
import type { TemplateType } from '@/types/planner';
import { TEMPLATE_TYPE_CONFIG } from '@/types/planner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTemplateStore } from '@/stores/template-store';
import { useManageAreas } from '@/hooks/use-manage-areas';
import { useManageImages } from '@/hooks/use-manage-images';

export const EditorSidebar: React.FC = () => {
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDialogOpen, setNewTemplateDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    data: string;
    width: number;
    height: number;
    name: string;
  } | null>(null);
  const [selectedTemplateType, setSelectedTemplateType] = useState<TemplateType>('monthly-calendar');
  

  const openGenerator = useTemplateStore(state => state.openGenerator)
  const {addImage, deleteImage} = useManageImages();
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
  
  const handleCreateTemplate = useCallback(() => {
    if (newTemplateName.trim()) {
      createTemplate(newTemplateName.trim());
      setNewTemplateName('');
      setNewTemplateDialogOpen(false);
    }
  }, [newTemplateName, createTemplate]);
  
  const handleImageUpload = useCallback((data: string, width: number, height: number, name: string) => {
    setPendingImage({ data, width, height, name });
    setUploadDialogOpen(true);
  }, []);
  
  const handleConfirmUpload = useCallback(() => {
    if (pendingImage) {
      addImage(
        pendingImage.data,
        pendingImage.width,
        pendingImage.height,
        pendingImage.name,
        selectedTemplateType
      );
      setPendingImage(null);
      setUploadDialogOpen(false);
    }
  }, [pendingImage, selectedTemplateType, addImage]);
  
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
        <Dialog open={newTemplateDialogOpen} onOpenChange={setNewTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
                <DialogDescription>
                  Give your planner template a name to get started.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="My Planner 2024"
                  className="mt-2"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewTemplateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim()}>
                  Create Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
            
            <ImageUploader handleImageUpload={handleImageUpload} />
            
            {/* Upload type dialog */}
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Template Page</DialogTitle>
                  <DialogDescription>
                    Select the type of page this image represents.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  {pendingImage && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <img
                        src={pendingImage.data}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <Label>Page Type</Label>
                    <Select
                      value={selectedTemplateType}
                      onValueChange={(v) => setSelectedTemplateType(v as TemplateType)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TEMPLATE_TYPE_CONFIG) as TemplateType[]).map(type => (
                          <SelectItem key={type} value={type}>
                            <div>
                              <div>{TEMPLATE_TYPE_CONFIG[type].label}</div>
                              <div className="text-xs text-muted-foreground">
                                {TEMPLATE_TYPE_CONFIG[type].description}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleConfirmUpload}>
                    Add Page
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
