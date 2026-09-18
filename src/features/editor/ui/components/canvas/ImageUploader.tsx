import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/core/components/ui/button';
import { cn } from '@/core/functions/cn';
import { usePlanLimits } from '@/core/plans';
import { PlanLimitError } from '@/core/plans';
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
import { useTemplateId } from '@/features/editor/ui/hooks/use-template-id';
import { TEMPLATE_TYPE_CONFIG, TemplateType } from '@/features/template';
import './image-uploader.scss';

interface ImageUploaderProps {
  className?: string;
  customButton?: React.ReactElement;
  onUploadComplete?: () => void;
  disabled?: boolean;
  /** When false, only disable the control (parent shows copy). Default: !customButton */
  showLimitHints?: boolean;
  /** Notified when a limit/upload error occurs (useful when hints are hidden). */
  onError?: (message: string | null) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  className,
  customButton,
  onUploadComplete,
  disabled = false,
  showLimitHints,
  onError,
}) => {
  const { t } = useTranslation();
  const templateId = useTemplateId();
  const { limits, canAddPage, pageCountFor, maxImageLabel } = usePlanLimits();
  const atPageLimit = disabled || !canAddPage(templateId);
  const hintsVisible = showLimitHints ?? !customButton;

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    data: string;
    width: number;
    height: number;
    name: string;
  } | null>(null);
  const [selectedTemplateType, setSelectedTemplateType] = useState<TemplateType>('monthly-calendar');
  const [error, setError] = useState<string | null>(null);

  const reportError = useCallback(
    (message: string | null) => {
      setError(message);
      onError?.(message);
    },
    [onError],
  );

  const { addImage } = useManageImages();

  const handleImageUpload = useCallback((data: string, width: number, height: number, name: string) => {
    setPendingImage({ data, width, height, name });
    setUploadDialogOpen(true);
    reportError(null);
  }, [reportError]);

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
        reportError(null);
      } catch (err) {
        console.error('Error adding page:', err);
        if (err instanceof PlanLimitError && err.code === 'images') {
          reportError(t('limits.pagesLimitReached', { max: limits.maxImagesPerPlanner }));
        } else if (err instanceof PlanLimitError && err.code === 'imageSize') {
          reportError(t('limits.imageTooLarge', { max: maxImageLabel }));
        } else {
          reportError(err instanceof Error ? err.message : 'Upload failed');
        }
      }
    })();
  }, [pendingImage, selectedTemplateType, addImage, onUploadComplete, t, limits.maxImagesPerPlanner, maxImageLabel, reportError]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (atPageLimit) {
      reportError(t('limits.pagesLimitReached', { max: limits.maxImagesPerPlanner }));
      return;
    }

    if (!file.type.startsWith('image/')) {
      reportError('Please upload an image file');
      return;
    }

    if (file.size > limits.maxImageBytes) {
      reportError(t('limits.imageTooLarge', { max: maxImageLabel }));
      return;
    }

    try {
      const imageData = await fileToBase64(file);
      const img = new Image();
      img.onload = () => {
        handleImageUpload(imageData, img.width, img.height, file.name);
      };
      img.src = imageData;
    } catch (err) {
      console.error('Error loading image:', err);
      reportError(err instanceof Error ? err.message : 'Error loading image');
    }
  }, [atPageLimit, handleImageUpload, limits.maxImageBytes, limits.maxImagesPerPlanner, maxImageLabel, t, reportError]);

  const usageLabel = t('limits.pagesUsage', {
    used: pageCountFor(templateId),
    max: limits.maxImagesPerPlanner,
  });

  return (
    <div className={cn('image-uploader', className, atPageLimit && 'image-uploader--disabled')}>
      {customButton ?? (
        <Button variant="outline" className="image-uploader__button" disabled={atPageLimit}>
          <Upload className="image-uploader__icon" />
          Upload Image
        </Button>
      )}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="image-uploader__input"
        disabled={atPageLimit}
        title={atPageLimit ? t('limits.pagesLimitReached', { max: limits.maxImagesPerPlanner }) : undefined}
      />
      {hintsVisible ? (
        atPageLimit ? (
          <p className="image-uploader__limit-message">
            {t('limits.pagesLimitReached', { max: limits.maxImagesPerPlanner })}
          </p>
        ) : (
          <p className="image-uploader__limit-usage">{usageLabel}</p>
        )
      ) : null}
      {hintsVisible && error ? <p className="image-uploader__limit-message">{error}</p> : null}
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
