import React, { useCallback } from 'react';
import { Upload, ImageOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/core/components/ui/button';
import { fileToBase64 } from '@/features/editor/domain/services/planner-utils';
import { useTemplateId } from '@/features/editor/ui/hooks/use-template-id';
import { applyPageImageData } from '@/features/editor/domain/services/page-image-asset';
import './missing-page-image.scss';

interface MissingPageImageProps {
  pageId: string;
  pageName: string;
}

export const MissingPageImage: React.FC<MissingPageImageProps> = ({ pageId, pageName }) => {
  const { t } = useTranslation();
  const templateId = useTemplateId();

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !templateId) return;

      try {
        const imageData = await fileToBase64(file);
        const img = new Image();
        img.onload = async () => {
          await applyPageImageData(templateId, pageId, imageData);
        };
        img.src = imageData;
      } catch (error) {
        console.error('Error re-uploading image:', error);
      } finally {
        e.target.value = '';
      }
    },
    [templateId, pageId],
  );

  return (
    <div className="missing-page-image canvas-workspace">
      <div className="missing-page-image__content animate-fade-in">
        <div className="missing-page-image__icon-wrapper">
          <ImageOff className="missing-page-image__icon" />
        </div>
        <h3 className="missing-page-image__title">{t('editor.missingImageTitle')}</h3>
        <p className="missing-page-image__description">
          {t('editor.missingImageDescription', { name: pageName })}
        </p>
        <label className="missing-page-image__upload">
          <Button variant="accent" size="lg" className="button--no-pointer-events" asChild>
            <span>
              <Upload className="missing-page-image__upload-icon" />
              {t('editor.reuploadImage')}
            </span>
          </Button>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={e => void handleFileChange(e)}
            className="missing-page-image__input"
          />
        </label>
      </div>
    </div>
  );
};
