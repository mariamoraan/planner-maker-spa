import React, { useState, useCallback } from 'react';
import { 
  Layers, 
  Download, 
  Save, 
  FolderOpen,
  Plus,
  Settings,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FieldTypeSelector } from './FieldTypeSelector';
import { RectangleList } from './RectangleList';
import { TemplateImageList } from './TemplateImageList';
import { ImageUploader } from '@/components/canvas/ImageUploader';
import type { FieldType, Template, TemplateImage, TemplateType } from '@/types/planner';
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

interface EditorSidebarProps {
  template: Template | null;
  currentImage: TemplateImage | null;
  selectedFieldType: FieldType;
  selectedRectangleId: string | null;
  onFieldTypeChange: (type: FieldType) => void;
  onRectangleSelect: (id: string | null) => void;
  onRectangleDelete: (id: string) => void;
  onRectangleUpdateType: (id: string, type: FieldType) => void;
  onImageSelect: (id: string) => void;
  onImageDelete: (id: string) => void;
  onImageAdd: (imageData: string, width: number, height: number, name: string, type: TemplateType) => void;
  onCreateTemplate: (name: string) => void;
  onGeneratePlanner: () => void;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  template,
  currentImage,
  selectedFieldType,
  selectedRectangleId,
  onFieldTypeChange,
  onRectangleSelect,
  onRectangleDelete,
  onRectangleUpdateType,
  onImageSelect,
  onImageDelete,
  onImageAdd,
  onCreateTemplate,
  onGeneratePlanner,
}) => {
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
  
  const handleCreateTemplate = useCallback(() => {
    if (newTemplateName.trim()) {
      onCreateTemplate(newTemplateName.trim());
      setNewTemplateName('');
      setNewTemplateDialogOpen(false);
    }
  }, [newTemplateName, onCreateTemplate]);
  
  const handleImageUpload = useCallback((data: string, width: number, height: number, name: string) => {
    setPendingImage({ data, width, height, name });
    setUploadDialogOpen(true);
  }, []);
  
  const handleConfirmUpload = useCallback(() => {
    if (pendingImage) {
      onImageAdd(
        pendingImage.data,
        pendingImage.width,
        pendingImage.height,
        pendingImage.name,
        selectedTemplateType
      );
      setPendingImage(null);
      setUploadDialogOpen(false);
    }
  }, [pendingImage, selectedTemplateType, onImageAdd]);
  
  return (
    <aside className="w-80 bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 flex items-center justify-center shadow-lg">
            <Layers className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">Planner Maker</h1>
            <p className="text-xs text-sidebar-foreground/60">Template Editor</p>
          </div>
        </div>
      </div>
      
      {/* Template Actions */}
      <div className="p-4 space-y-3">
        {!template ? (
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
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium text-sidebar-foreground">{template.name}</h2>
                <p className="text-xs text-sidebar-foreground/60">
                  {template.images.length} page{template.images.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <ImageUploader onImageUpload={handleImageUpload} />
            
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
              onSelect={onImageSelect}
              onDelete={onImageDelete}
            />
            
            {currentImage && (
              <>
                <Separator className="bg-sidebar-border" />
                
                <FieldTypeSelector
                  selectedType={selectedFieldType}
                  onTypeChange={onFieldTypeChange}
                />
                
                <Separator className="bg-sidebar-border" />
                
                <RectangleList
                  rectangles={currentImage.rectangles}
                  selectedId={selectedRectangleId}
                  onSelect={onRectangleSelect}
                  onDelete={onRectangleDelete}
                  onUpdateType={onRectangleUpdateType}
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
            onClick={onGeneratePlanner}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Planner
          </Button>
        </div>
      )}
    </aside>
  );
};
