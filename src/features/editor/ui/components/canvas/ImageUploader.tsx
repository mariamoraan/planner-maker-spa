import React, { cloneElement, isValidElement, useCallback, useRef, useState } from 'react';
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
import { PageTypePicker } from '@/features/editor/ui/components/shared/page-type-picker/page-type-picker';
import { useManageImages } from '@/features/editor/ui/hooks/use-manage-images';
import { useTemplateId } from '@/features/editor/ui/hooks/use-template-id';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import { suggestedTemplateType, type TemplateType } from '@/features/template';
import './image-uploader.scss';

type UploadStep = 'choose-type' | 'confirm';

interface PendingImage {
  data: string;
  width: number;
  height: number;
  name: string;
}

interface ImageUploaderProps {
  className?: string;
  customButton?: React.ReactElement;
  onUploadComplete?: () => void;
  /** Called with the new page id after a successful add. */
  onPageAdded?: (pageId: string) => void;
  disabled?: boolean;
  /** When false, only disable the control (parent shows copy). Default: !customButton */
  showLimitHints?: boolean;
  /** Notified when a limit/upload error occurs (useful when hints are hidden). */
  onError?: (message: string | null) => void;
  /** Override the suggested default page type. */
  initialType?: TemplateType;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  className,
  customButton,
  onUploadComplete,
  onPageAdded,
  disabled = false,
  showLimitHints,
  onError,
  initialType,
}) => {
  const { t } = useTranslation();
  const templateId = useTemplateId();
  const template = useCurrentTemplate();
  const { limits, canAddPage, pageCountFor, maxImageLabel } = usePlanLimits();
  const atPageLimit = disabled || !canAddPage(templateId);
  const hintsVisible = showLimitHints ?? !customButton;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<UploadStep>('choose-type');
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [selectedTemplateType, setSelectedTemplateType] = useState<TemplateType>(
    initialType ?? 'monthly-calendar',
  );
  const [error, setError] = useState<string | null>(null);

  const reportError = useCallback(
    (message: string | null) => {
      setError(message);
      onError?.(message);
    },
    [onError],
  );

  const { addImage } = useManageImages();

  const resetDialog = useCallback(() => {
    setStep('choose-type');
    setPendingImage(null);
  }, []);

  const openDialog = useCallback(() => {
    if (atPageLimit) {
      reportError(t('limits.pagesLimitReached', { max: limits.maxImagesPerPlanner }));
      return;
    }
    const suggested =
      initialType ?? suggestedTemplateType(template?.images ?? []);
    setSelectedTemplateType(suggested);
    resetDialog();
    reportError(null);
    setDialogOpen(true);
  }, [
    atPageLimit,
    initialType,
    limits.maxImagesPerPlanner,
    reportError,
    resetDialog,
    t,
    template?.images,
  ]);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      if (!open) resetDialog();
    },
    [resetDialog],
  );

  const handleContinueToUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleBackToTypes = useCallback(() => {
    setPendingImage(null);
    setStep('choose-type');
  }, []);

  const handleConfirmUpload = useCallback(() => {
    if (!pendingImage) return;

    const image = pendingImage;
    const templateType = selectedTemplateType;

    onUploadComplete?.();
    setPendingImage(null);
    setDialogOpen(false);
    resetDialog();

    void (async () => {
      try {
        const pageId = await addImage(
          image.data,
          image.width,
          image.height,
          image.name,
          templateType,
        );
        reportError(null);
        if (pageId) onPageAdded?.(pageId);
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
  }, [
    pendingImage,
    selectedTemplateType,
    addImage,
    onUploadComplete,
    onPageAdded,
    resetDialog,
    t,
    limits.maxImagesPerPlanner,
    maxImageLabel,
    reportError,
  ]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setPendingImage({
            data: imageData,
            width: img.width,
            height: img.height,
            name: file.name,
          });
          setStep('confirm');
          setDialogOpen(true);
          reportError(null);
        };
        img.onerror = () => {
          reportError('Error loading image');
        };
        img.src = imageData;
      } catch (err) {
        console.error('Error loading image:', err);
        reportError(err instanceof Error ? err.message : 'Error loading image');
      }
    },
    [
      atPageLimit,
      limits.maxImageBytes,
      limits.maxImagesPerPlanner,
      maxImageLabel,
      t,
      reportError,
    ],
  );

  const usageLabel = t('limits.pagesUsage', {
    used: pageCountFor(templateId),
    max: limits.maxImagesPerPlanner,
  });

  const trigger = customButton && isValidElement(customButton) ? (
    cloneElement(customButton as React.ReactElement<Record<string, unknown>>, {
      onClick: (event: React.MouseEvent) => {
        const existing = (customButton.props as { onClick?: (e: React.MouseEvent) => void })
          .onClick;
        existing?.(event);
        if (!event.defaultPrevented) openDialog();
      },
      ...(typeof (customButton.type) === 'string' && customButton.type !== 'button'
        ? {}
        : {
            disabled:
              atPageLimit ||
              Boolean((customButton.props as { disabled?: boolean }).disabled),
          }),
      ...(typeof customButton.type === 'string' && customButton.type === 'div'
        ? {
            role: 'button',
            tabIndex: atPageLimit ? -1 : 0,
            onKeyDown: (event: React.KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openDialog();
              }
            },
          }
        : {}),
    })
  ) : (
    <Button
      variant="outline"
      className="image-uploader__button"
      disabled={atPageLimit}
      onClick={openDialog}
    >
      <Upload className="image-uploader__icon" />
      {t('limits.pagesAdd')}
    </Button>
  );

  const isChooseStep = step === 'choose-type';

  return (
    <div className={cn('image-uploader', className, atPageLimit && 'image-uploader--disabled')}>
      {trigger}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="image-uploader__input"
        disabled={atPageLimit}
        tabIndex={-1}
        aria-hidden
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
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="dialog-content--wide image-uploader__dialog">
          <DialogHeader>
            <DialogTitle>
              {isChooseStep
                ? t('editor.addPage.titleChoose')
                : t('editor.addPage.titleConfirm')}
            </DialogTitle>
            <DialogDescription>
              {isChooseStep
                ? t('editor.addPage.descriptionChoose')
                : t('editor.addPage.descriptionConfirm')}
            </DialogDescription>
          </DialogHeader>
          <div
            key={step}
            className="image-uploader__dialog-body image-uploader__dialog-body--animated"
          >
            {step === 'confirm' && pendingImage ? (
              <div className="image-uploader__preview">
                <img
                  src={pendingImage.data}
                  alt=""
                  className="image-uploader__preview-image"
                />
              </div>
            ) : null}
            <PageTypePicker
              value={selectedTemplateType}
              onChange={setSelectedTemplateType}
              showHint={isChooseStep}
            />
          </div>
          <DialogFooter>
            {isChooseStep ? (
              <>
                <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleContinueToUpload}>
                  {t('editor.addPage.uploadImage')}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleBackToTypes}>
                  {t('editor.addPage.backToTypes')}
                </Button>
                <Button onClick={handleConfirmUpload} disabled={!pendingImage}>
                  {t('editor.addPage.addPage')}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
