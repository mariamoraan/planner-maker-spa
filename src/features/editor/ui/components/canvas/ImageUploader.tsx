import React, { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, Plus } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { cn } from '@/core/functions/cn';
import { fileToBase64 } from '@/features/editor/domain/services/planner-utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/components/ui/select';
import { Label } from '@/core/components/ui/label';
import { Input } from '@/core/components/ui/input';
import { useManageImages } from '@/features/editor/ui/hooks/use-manage-images';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { TEMPLATE_TYPE_CONFIG, TemplateType } from '@/features/template';
import { useNavigate } from 'react-router-dom';
import { getEditorPath } from '@/core/routes/paths';
import './image-uploader.scss';

interface ImageUploaderProps {
  className?: string;
  customButton?: React.ReactElement;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ className, customButton }) => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    data: string;
    width: number;
    height: number;
    name: string;
  } | null>(null);
  const [selectedTemplateType, setSelectedTemplateType] = useState<TemplateType>('monthly-calendar');

  const { addImage } = useManageImages();

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
        selectedTemplateType,
      );
      setPendingImage(null);
      setUploadDialogOpen(false);
    }
  }, [pendingImage, selectedTemplateType, addImage]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      console.error('Please upload an image file');
      return;
    }

    try {
      const imageData = await fileToBase64(file);
      const img = new Image();
      img.onload = () => {
        handleImageUpload(imageData, img.width, img.height, file.name);
      };
      img.src = imageData;
    } catch (error) {
      console.error('Error loading image:', error);
    }
  }, [handleImageUpload]);

  return (
    <div className={cn('image-uploader', className)}>
      {customButton ?? (
        <Button variant="outline" className="image-uploader__button">
          <Upload className="image-uploader__icon" />
          Upload Image
        </Button>
      )}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="image-uploader__input"
      />
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Template Page</DialogTitle>
            <DialogDescription>
              Select the type of page this image represents.
            </DialogDescription>
          </DialogHeader>
          <div className="image-uploader__dialog-body">
            {pendingImage && (
              <div className="image-uploader__preview">
                <img
                  src={pendingImage.data}
                  alt="Preview"
                  className="image-uploader__preview-image"
                />
              </div>
            )}
            <div>
              <Label>Page Type</Label>
              <Select
                value={selectedTemplateType}
                onValueChange={(v) => setSelectedTemplateType(v as TemplateType)}
              >
                <SelectTrigger className="select-trigger--spaced-top">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TEMPLATE_TYPE_CONFIG) as TemplateType[]).map(type => (
                    <SelectItem key={type} value={type}>
                      <div>
                        <div>{TEMPLATE_TYPE_CONFIG[type].label}</div>
                        <div className="select-item-description">
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
    </div>
  );
};

const EmptyCanvasStateCreateTemplate: React.FC = () => {
  const { createTemplate } = useTemplateStore();
  const navigate = useNavigate();
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDialogOpen, setNewTemplateDialogOpen] = useState(false);

  const handleCreateTemplate = useCallback(() => {
    if (newTemplateName.trim()) {
      const templateId = createTemplate(newTemplateName.trim());
      setNewTemplateName('');
      setNewTemplateDialogOpen(false);
      navigate(getEditorPath(templateId));
    }
  }, [newTemplateName, createTemplate, navigate]);

  return (
    <div className="image-uploader__empty-state canvas-workspace">
      <div className="image-uploader__empty-content animate-fade-in">
        <div className="image-uploader__empty-icon-wrapper">
          <ImageIcon className="image-uploader__empty-icon" />
        </div>
        <h3 className="image-uploader__empty-title">No templates</h3>
        <p className="image-uploader__empty-description">Create your first template</p>
        <Dialog open={newTemplateDialogOpen} onOpenChange={setNewTemplateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="sidebar-primary" className="button--full-width">
              <Plus className="image-uploader__icon" />
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
            <div className="image-uploader__dialog-body">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="My Planner 2024"
                className="input--spaced-top"
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
      </div>
    </div>
  );
};

const EmptyCanvasStateUploadPhoto: React.FC = () => {
  return (
    <div className="image-uploader__empty-state canvas-workspace">
      <div className="image-uploader__empty-content animate-fade-in">
        <div className="image-uploader__empty-icon-wrapper">
          <ImageIcon className="image-uploader__empty-icon" />
        </div>
        <h3 className="image-uploader__empty-title">No image uploaded</h3>
        <p className="image-uploader__empty-description">
          Upload a PNG image to start defining dynamic fields for your planner template
        </p>
        <div className="image-uploader__upload-wrapper">
          <ImageUploader
            customButton={
              <Button size="lg" variant="accent" className="button--no-pointer-events">
                <Upload className="image-uploader__icon image-uploader__icon--lg" />
                Upload Template Image
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
};

export const EmptyCanvasState: React.FC = () => {
  const { templates } = useTemplateStore();
  const hasTemplates = templates?.length > 0;
  if (hasTemplates) {
    return <EmptyCanvasStateUploadPhoto />;
  }
  return <EmptyCanvasStateCreateTemplate />;
};
