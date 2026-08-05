import './grid-toolbar-controls.scss';

import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { FieldType, GridGroup } from '@/features/template';
import { BlockTypeSelector } from '@/features/editor/ui/components/shared/block-type-selector';
import { LayerControls } from '@/features/editor/ui/components/shared/layer-controls';
import { ToolbarHistoryButtons } from '@/features/editor/ui/components/shared/toolbar-history-buttons';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useGridGroupOps } from '@/features/editor/ui/hooks/use-grid-group-ops';

interface GridToolbarControlsProps {
  group: GridGroup;
}

function clampDimension(value: number, min = 1, max = 20): number {
  return Math.min(max, Math.max(min, value));
}

function clampPadding(value: number, min = 0): number {
  return Math.max(min, Math.round(value));
}

function useToolbarPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setIsOpen(false);
    setMenuPosition(null);
  };

  const toggle = () => {
    if (isOpen) {
      close();
      return;
    }

    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setMenuPosition({ top: rect.bottom + 6, left: rect.left });
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      close();
    };

    const handleScrollOrResize = () => close();

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  return {
    isOpen,
    menuPosition,
    triggerRef,
    containerRef,
    menuRef,
    close,
    toggle,
  };
}

export const GridToolbarControls = ({ group }: GridToolbarControlsProps) => {
  const { t } = useTranslation();
  const currentImage = useCurrentImage();
  const selectedRectangleIds = useEditorStore(state => state.selectedRectangleIds);
  const { updateGroupSettings, updateGroupFieldType, ungroupGridGroup } = useGridGroupOps();

  const layoutPopover = useToolbarPopover();
  const paddingPopover = useToolbarPopover();

  const groupFieldType = currentImage?.rectangles.find(r => r.id === group.rectIds[0])?.fieldType;
  const padding = group.settings.padding ?? { x: 0, y: 0 };
  const showPaddingControls = group.settings.align === 'top-left';

  useEffect(() => {
    layoutPopover.close();
    paddingPopover.close();
  }, [group.id]);

  const adjustCols = (delta: number) => {
    updateGroupSettings(group.id, { cols: clampDimension(group.settings.cols + delta) });
  };

  const adjustRows = (delta: number) => {
    updateGroupSettings(group.id, { rows: clampDimension(group.settings.rows + delta) });
  };

  const commitCols = (value: number) => {
    const cols = clampDimension(value);
    if (cols !== group.settings.cols) {
      updateGroupSettings(group.id, { cols });
    }
  };

  const commitRows = (value: number) => {
    const rows = clampDimension(value);
    if (rows !== group.settings.rows) {
      updateGroupSettings(group.id, { rows });
    }
  };

  const adjustPaddingX = (delta: number) => {
    updateGroupSettings(group.id, {
      padding: { x: clampPadding(padding.x + delta), y: padding.y },
    });
  };

  const adjustPaddingY = (delta: number) => {
    updateGroupSettings(group.id, {
      padding: { x: padding.x, y: clampPadding(padding.y + delta) },
    });
  };

  const commitPaddingX = (value: number) => {
    const x = clampPadding(value);
    if (x !== padding.x) {
      updateGroupSettings(group.id, { padding: { x, y: padding.y } });
    }
  };

  const commitPaddingY = (value: number) => {
    const y = clampPadding(value);
    if (y !== padding.y) {
      updateGroupSettings(group.id, { padding: { x: padding.x, y } });
    }
  };

  return (
    <div className="grid-toolbar-controls">
      <ToolbarHistoryButtons />
      <div className="grid-toolbar-controls__divider" />

      <p className="grid-toolbar-controls__badge">
        {t('editor.gridGroupBadge', {
          cols: group.cols,
          rows: group.rows,
          count: group.rectIds.length,
        })}
      </p>
      <div className="grid-toolbar-controls__divider" />

      <div ref={layoutPopover.containerRef} className="grid-toolbar-controls__popover-anchor">
        <button
          ref={layoutPopover.triggerRef}
          type="button"
          className={clsx('grid-toolbar-controls__menu-trigger', {
            'grid-toolbar-controls__menu-trigger--open': layoutPopover.isOpen,
          })}
          onClick={layoutPopover.toggle}
        >
          {t('editor.gridEditLayout')}
        </button>
        {layoutPopover.isOpen && layoutPopover.menuPosition &&
          createPortal(
            <div
              ref={layoutPopover.menuRef}
              className="grid-toolbar-controls__popover grid-toolbar-controls__popover--layout"
              {...blockSelectionZoneProps}
              style={{
                top: layoutPopover.menuPosition.top,
                left: layoutPopover.menuPosition.left,
              }}
            >
              <label className="grid-toolbar-controls__stepper">
                <span>{t('editor.gridColumns')}</span>
                <div className="grid-toolbar-controls__stepper-inputs">
                  <button type="button" onClick={() => adjustCols(-1)} aria-label="-">
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    defaultValue={group.settings.cols}
                    key={`cols-${group.id}-${group.settings.cols}`}
                    onBlur={e => commitCols(Number(e.target.value) || 1)}
                  />
                  <button type="button" onClick={() => adjustCols(1)} aria-label="+">
                    +
                  </button>
                </div>
              </label>

              <label className="grid-toolbar-controls__stepper">
                <span>{t('editor.gridRows')}</span>
                <div className="grid-toolbar-controls__stepper-inputs">
                  <button type="button" onClick={() => adjustRows(-1)} aria-label="-">
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    defaultValue={group.settings.rows}
                    key={`rows-${group.id}-${group.settings.rows}`}
                    onBlur={e => commitRows(Number(e.target.value) || 1)}
                  />
                  <button type="button" onClick={() => adjustRows(1)} aria-label="+">
                    +
                  </button>
                </div>
              </label>
            </div>,
            document.body,
          )}
      </div>

      {showPaddingControls && (
        <div ref={paddingPopover.containerRef} className="grid-toolbar-controls__popover-anchor">
          <button
            ref={paddingPopover.triggerRef}
            type="button"
            className={clsx('grid-toolbar-controls__menu-trigger', {
              'grid-toolbar-controls__menu-trigger--open': paddingPopover.isOpen,
            })}
            onClick={paddingPopover.toggle}
          >
            {t('editor.gridEditPadding')}
          </button>
          {paddingPopover.isOpen && paddingPopover.menuPosition &&
            createPortal(
              <div
                ref={paddingPopover.menuRef}
                className="grid-toolbar-controls__popover grid-toolbar-controls__popover--padding"
                {...blockSelectionZoneProps}
                style={{
                  top: paddingPopover.menuPosition.top,
                  left: paddingPopover.menuPosition.left,
                }}
              >
                <label className="grid-toolbar-controls__stepper">
                  <span>{t('editor.gridPaddingX')}</span>
                  <div className="grid-toolbar-controls__stepper-inputs">
                    <button type="button" onClick={() => adjustPaddingX(-1)} aria-label="-">
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      defaultValue={padding.x}
                      key={`pad-x-${group.id}-${padding.x}`}
                      onBlur={e => commitPaddingX(Number(e.target.value) || 0)}
                    />
                    <button type="button" onClick={() => adjustPaddingX(1)} aria-label="+">
                      +
                    </button>
                  </div>
                </label>

                <label className="grid-toolbar-controls__stepper">
                  <span>{t('editor.gridPaddingY')}</span>
                  <div className="grid-toolbar-controls__stepper-inputs">
                    <button type="button" onClick={() => adjustPaddingY(-1)} aria-label="-">
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      defaultValue={padding.y}
                      key={`pad-y-${group.id}-${padding.y}`}
                      onBlur={e => commitPaddingY(Number(e.target.value) || 0)}
                    />
                    <button type="button" onClick={() => adjustPaddingY(1)} aria-label="+">
                      +
                    </button>
                  </div>
                </label>
              </div>,
              document.body,
            )}
        </div>
      )}

      {groupFieldType && (
        <>
          <div className="grid-toolbar-controls__divider" />
          <BlockTypeSelector
            currentType={groupFieldType}
            onSelect={(type: FieldType) => updateGroupFieldType(group.id, type)}
            variant="popover"
          />
        </>
      )}

      <div className="grid-toolbar-controls__divider" />
      <LayerControls selectedIds={selectedRectangleIds} />

      <div className="grid-toolbar-controls__divider" />
      <button
        type="button"
        className="grid-toolbar-controls__ungroup"
        onClick={() => ungroupGridGroup(group.id)}
      >
        {t('editor.gridUngroup')}
      </button>
    </div>
  );
};
