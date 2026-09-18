import React, { useCallback, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { PlanLimitError, usePlanLimits } from '@/core/plans';
import { fileToBase64 } from '@/features/editor/domain/services/planner-utils';
import { useManageImages } from '@/features/editor/ui/hooks/use-manage-images';

interface ReplacePageImageButtonProps {
  pageId: string;
}

export const ReplacePageImageButton: React.FC<ReplacePageImageButtonProps> = ({ pageId }) => {
  const { t } = useTranslation();
  const { replaceImage } = useManageImages();
  const { limits, maxImageLabel } = usePlanLimits();
  const [isReplacing, setIsReplacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || isReplacing) return;

      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }

      if (file.size > limits.maxImageBytes) {
        setError(t('limits.imageTooLarge', { max: maxImageLabel }));
        return;
      }

      setIsReplacing(true);
      setError(null);
      try {
        const imageData = await fileToBase64(file);
        await replaceImage(pageId, imageData);
      } catch (err) {
        console.error('Error replacing image:', err);
        if (err instanceof PlanLimitError && err.code === 'imageSize') {
          setError(t('limits.imageTooLarge', { max: maxImageLabel }));
        } else {
          setError(err instanceof Error ? err.message : 'Error replacing image');
        }
      } finally {
        setIsReplacing(false);
        e.target.value = '';
      }
    },
    [pageId, replaceImage, isReplacing, limits.maxImageBytes, maxImageLabel, t],
  );

  return (
    <div className="editor-sidebar__replace-image">
      <p className="editor-sidebar__replace-image-hint">{t('editor.replacePageImageHint')}</p>
      <label
        className={clsx(
          'editor-sidebar__grid-action',
          'editor-sidebar__grid-action--secondary',
          'editor-sidebar__replace-image-button',
          { 'editor-sidebar__replace-image-button--loading': isReplacing },
        )}
        aria-busy={isReplacing}
      >
        {isReplacing ? (
          <>
            <Loader2
              className="editor-sidebar__replace-image-icon editor-sidebar__replace-image-icon--spin"
              aria-hidden
            />
            <span>{t('editor.replacePageImageInProgress')}</span>
          </>
        ) : (
          <>
            <ImagePlus className="editor-sidebar__replace-image-icon" aria-hidden />
            <span>{t('editor.replacePageImage')}</span>
          </>
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => void handleFileChange(e)}
          className="editor-sidebar__replace-image-input"
          disabled={isReplacing}
        />
      </label>
      {error ? <p className="editor-sidebar__replace-image-error">{error}</p> : null}
    </div>
  );
};
