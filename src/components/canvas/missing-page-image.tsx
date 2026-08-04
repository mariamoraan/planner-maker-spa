import React, { useCallback } from 'react';
import { Upload, ImageOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { fileToBase64 } from '@/lib/planner-utils';
import { useTemplateStore } from '@/stores/template-store';
import { useTemplateId } from '@/hooks/use-template-id';
import { getInfra } from '@/infrastructure';
import './missing-page-image.scss';

interface MissingPageImageProps {
  pageId: string;
  pageName: string;
}

export const MissingPageImage: React.FC<MissingPageImageProps> = ({ pageId, pageName }) => {
  const { t } = useTranslation();
  const templateId = useTemplateId();
  const syncUid = useTemplateStore(state => state.syncUid);
  const updateImage = useTemplateStore(state => state.updateImage);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !templateId || !syncUid) return;

      try {
        const imageData = await fileToBase64(file);
        const img = new Image();
        img.onload = async () => {
          const template = useTemplateStore.getState().getTemplate(templateId);
          const page = template?.images.find(p => p.id === pageId);
          if (!page?.imageRef) return;

          await getInfra().images.save(page.imageRef, imageData);
          const resolvedSrc = (await getInfra().images.load(page.imageRef)) ?? imageData;

          updateImage(templateId, pageId, {
            src: resolvedSrc,
            width: img.width,
            height: img.height,
            imageRef: page.imageRef,
            missingLocalAsset: false,
          });

          if (page.imageRef.url) {
            await getInfra().templates.updatePage(syncUid, templateId, pageId, {
              imageRef: page.imageRef,
            });
          }
        };
        img.src = imageData;
      } catch (error) {
        console.error('Error re-uploading image:', error);
      } finally {
        e.target.value = '';
      }
    },
    [templateId, pageId, syncUid, updateImage]
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
