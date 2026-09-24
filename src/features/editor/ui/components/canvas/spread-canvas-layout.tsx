import { useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { rebalanceYearMonthIndicesAcrossSpread } from '@/features/editor/domain/services/binding-group';
import { TemplateCanvas } from './TemplateCanvas';
import {
  useSpreadCrossFaceDrag,
  type SpreadFaceRefs,
} from './use-spread-cross-face-drag';
import './spread-canvas-layout.scss';

export function SpreadCanvasLayout() {
  const { t } = useTranslation();
  const currentImage = useCurrentImage();
  const template = useCurrentTemplate();
  const setCurrentImage = useTemplateStore(state => state.setCurrentImage);
  const clearSelection = useEditorStore(state => state.clearSelection);
  const activeBlockDrag = useEditorStore(state => state.activeBlockDrag);
  const faceRefs = useRef<SpreadFaceRefs>({ left: null, right: null });

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

  const { ghost, isCrossFaceDragging } = useSpreadCrossFaceDrag({
    leftPageId: faces?.left.id ?? '',
    rightPageId: faces?.right.id ?? '',
    leftWidth: faces?.left.width ?? 1,
    leftHeight: faces?.left.height ?? 1,
    rightWidth: faces?.right.width ?? 1,
    rightHeight: faces?.right.height ?? 1,
    faceRefs,
  });

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

  // Contiguous yearly spreads: month day grids on the right must not reuse
  // January–June slots already taken by the left face.
  useEffect(() => {
    if (!template || !faces) return;
    if (faces.left.type !== 'yearly-calendar') return;
    const result = rebalanceYearMonthIndicesAcrossSpread(faces.left, faces.right);
    if (!result.changed || !result.right.bindingGroups) return;
    useTemplateStore.getState().updateImage(template.id, result.right.id, {
      bindingGroups: result.right.bindingGroups,
    });
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
    <div
      className={clsx('spread-canvas-layout', {
        'spread-canvas-layout--dragging': Boolean(activeBlockDrag),
      })}
    >
      <div
        ref={el => {
          faceRefs.current.left = el;
        }}
        className={clsx('spread-canvas-layout__face', {
          'spread-canvas-layout__face--active': activeIsLeft,
          'spread-canvas-layout__face--inactive': !activeIsLeft,
        })}
      >
        <span className="spread-canvas-layout__tag" aria-hidden={!activeIsLeft}>
          {t('editor.spreadFaceLeft')}
        </span>
        {!activeIsLeft && !activeBlockDrag ? (
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
        ref={el => {
          faceRefs.current.right = el;
        }}
        className={clsx('spread-canvas-layout__face', {
          'spread-canvas-layout__face--active': !activeIsLeft,
          'spread-canvas-layout__face--inactive': activeIsLeft,
        })}
      >
        <span className="spread-canvas-layout__tag" aria-hidden={activeIsLeft}>
          {t('editor.spreadFaceRight')}
        </span>
        {activeIsLeft && !activeBlockDrag ? (
          <button
            type="button"
            className="spread-canvas-layout__hit"
            aria-label={t('editor.spreadFaceRight')}
            onClick={() => selectFace(faces.right.id)}
          />
        ) : null}
        <TemplateCanvas pageId={faces.right.id} interactive={!activeIsLeft} />
      </div>

      {ghost && isCrossFaceDragging ? (
        <div
          className="spread-canvas-layout__ghost"
          style={{
            left: ghost.left,
            top: ghost.top,
            width: ghost.width,
            height: ghost.height,
          }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
