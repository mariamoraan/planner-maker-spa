import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
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
} from '@/core/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/components/ui/select';
import { Label } from '@/core/components/ui/label';
import { useManageImages } from '@/features/editor/ui/hooks/use-manage-images';
import { TEMPLATE_TYPE_CONFIG, TemplateType } from '@/features/template';
import './image-uploader.scss';

interface ImageUploaderProps {
  className?: string;
  customButton?: React.ReactElement;
  onUploadComplete?: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  className,
  customButton,
  onUploadComplete,
}) => {
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
    if (!pendingImage) return;

    const image = pendingImage;
    const templateType = selectedTemplateType;

    onUploadComplete?.();
    setPendingImage(null);
    setUploadDialogOpen(false);

    void (async () => {
      try {
        await addImage(
          image.data,
          image.width,
          image.height,
          image.name,
          templateType,
        );
      } catch (error) {
        console.error('Error adding page:', error);
      }
    })();
  }, [pendingImage, selectedTemplateType, addImage, onUploadComplete]);

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
