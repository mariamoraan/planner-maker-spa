import { useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { TemplateCanvas } from './TemplateCanvas';
import './spread-canvas-layout.scss';

export function SpreadCanvasLayout() {
  const { t } = useTranslation();
  const currentImage = useCurrentImage();
  const template = useCurrentTemplate();
  const setCurrentImage = useTemplateStore(state => state.setCurrentImage);
  const clearSelection = useEditorStore(state => state.clearSelection);

  const faces = useMemo(() => {
    if (!currentImage?.spreadId || !template) return null;
    const left = template.images.find(
      img => img.spreadId === currentImage.spreadId && img.spreadFace === 'left'
    );
    const right = template.images.find(
      img => img.spreadId === currentImage.spreadId && img.spreadFace === 'right'
    );
    if (!left || !right) return null;
    return { left, right };
  }, [currentImage?.spreadId, template]);

  useEffect(() => {
    if (!template || !faces) return;
    let cancelled = false;
    void (async () => {
      for (const page of [faces.left, faces.right]) {
        if (page.src) continue;
        const data = await useTemplateStore.getState().getImageData(page.id);
        if (cancelled || !data) continue;
        useTemplateStore.getState().updateImage(template.id, page.id, {
          src: data,
          missingLocalAsset: false,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [template, faces]);

  if (!faces) {
    return <TemplateCanvas />;
  }

  const activeIsLeft = currentImage?.id === faces.left.id;

  const selectFace = (pageId: string) => {
    if (pageId === currentImage?.id) return;
    clearSelection();
    void setCurrentImage(pageId);
  };

  return (
    <div className="spread-canvas-layout">
      <div
        className={clsx('spread-canvas-layout__face', {
          'spread-canvas-layout__face--active': activeIsLeft,
          'spread-canvas-layout__face--inactive': !activeIsLeft,
        })}
      >
        <span className="spread-canvas-layout__tag" aria-hidden={!activeIsLeft}>
          {t('editor.spreadFaceLeft')}
        </span>
        {!activeIsLeft ? (
          <button
            type="button"
            className="spread-canvas-layout__hit"
            aria-label={t('editor.spreadFaceLeft')}
            onClick={() => selectFace(faces.left.id)}
          />
        ) : null}
        <TemplateCanvas pageId={faces.left.id} interactive={activeIsLeft} />
      </div>
      <div
        className={clsx('spread-canvas-layout__face', {
          'spread-canvas-layout__face--active': !activeIsLeft,
          'spread-canvas-layout__face--inactive': activeIsLeft,
        })}
      >
        <span className="spread-canvas-layout__tag" aria-hidden={activeIsLeft}>
          {t('editor.spreadFaceRight')}
        </span>
        {activeIsLeft ? (
          <button
            type="button"
            className="spread-canvas-layout__hit"
            aria-label={t('editor.spreadFaceRight')}
            onClick={() => selectFace(faces.right.id)}
          />
        ) : null}
        <TemplateCanvas pageId={faces.right.id} interactive={!activeIsLeft} />
      </div>
    </div>
  );
}
