import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlanLimitError, usePlanLimits } from '@/core/plans';
import { fileToBase64 } from '@/features/editor/domain/services/planner-utils';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { getSpreadMate, isSpreadEligibleType } from '@/features/template';
import './contiguous-pages-toolbar-toggle.scss';

export function ContiguousPagesToolbarToggle() {
  const { t } = useTranslation();
  const template = useCurrentTemplate();
  const currentImage = useCurrentImage();
  const enableSpread = useTemplateStore(state => state.enableSpread);
  const disableSpread = useTemplateStore(state => state.disableSpread);
  const setCurrentImage = useTemplateStore(state => state.setCurrentImage);
  const { limits, maxImageLabel } = usePlanLimits();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligible =
    Boolean(template && currentImage && isSpreadEligibleType(currentImage.type));
  const isSpread = Boolean(currentImage?.spreadId);

  const handleDisable = useCallback(async () => {
    if (!template || !currentImage?.spreadId) return;
    const confirmed = window.confirm(t('editor.contiguousPagesDisableConfirm'));
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await disableSpread(template.id, currentImage.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('editor.contiguousPagesError'));
    } finally {
      setBusy(false);
    }
  }, [template, currentImage, disableSpread, t]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !template || !currentImage) return;

      if (!file.type.startsWith('image/')) {
        setError(t('editor.contiguousPagesImageRequired'));
        return;
      }
      if (file.size > limits.maxImageBytes) {
        setError(t('limits.imageTooLarge', { max: maxImageLabel }));
        return;
      }

      setBusy(true);
      setError(null);
      try {
        const rightImageData = await fileToBase64(file);
        const leftId =
          currentImage.spreadFace === 'right'
            ? (getSpreadMate(currentImage, template.images)?.id ?? currentImage.id)
            : currentImage.id;
        const rightId = await enableSpread(template.id, leftId, { rightImageData });
        await setCurrentImage(rightId);
      } catch (err) {
        if (err instanceof PlanLimitError) {
          setError(
            err.code === 'imageSize'
              ? t('limits.imageTooLarge', { max: maxImageLabel })
              : t('limits.pagesLimitReached', { max: limits.maxImagesPerPlanner })
          );
        } else {
          setError(err instanceof Error ? err.message : t('editor.contiguousPagesError'));
        }
      } finally {
        setBusy(false);
      }
    },
    [
      template,
      currentImage,
      enableSpread,
      setCurrentImage,
      limits.maxImageBytes,
      limits.maxImagesPerPlanner,
      maxImageLabel,
      t,
    ]
  );

  const handleToggle = (checked: boolean) => {
    setError(null);
    if (!checked) {
      void handleDisable();
      return;
    }
    inputRef.current?.click();
  };

  if (!eligible) return null;

  return (
    <div className="contiguous-pages-toolbar">
      <div className="base-toolbar__divider" aria-hidden />
      <label className="contiguous-pages-toolbar__control" title={t('editor.contiguousPagesHint')}>
        <input
          type="checkbox"
          checked={isSpread}
          disabled={busy}
          onChange={event => handleToggle(event.target.checked)}
        />
        <span>{t('editor.contiguousPagesToggle')}</span>
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="contiguous-pages-toolbar__file"
        disabled={busy}
        onChange={event => void handleFileChange(event)}
      />
      {error ? (
        <span className="contiguous-pages-toolbar__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
