import React, { useCallback, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { fileToBase64 } from '@/features/editor/domain/services/planner-utils';
import { useManageImages } from '@/features/editor/ui/hooks/use-manage-images';

interface ReplacePageImageButtonProps {
  pageId: string;
}

export const ReplacePageImageButton: React.FC<ReplacePageImageButtonProps> = ({ pageId }) => {
  const { t } = useTranslation();
  const { replaceImage } = useManageImages();
  const [isReplacing, setIsReplacing] = useState(false);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || isReplacing) return;

      if (!file.type.startsWith('image/')) {
        console.error('Please upload an image file');
        return;
      }

      setIsReplacing(true);
      try {
        const imageData = await fileToBase64(file);
        await replaceImage(pageId, imageData);
      } catch (error) {
        console.error('Error replacing image:', error);
      } finally {
        setIsReplacing(false);
        e.target.value = '';
      }
    },
    [pageId, replaceImage, isReplacing],
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
    </div>
  );
};
