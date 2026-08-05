import './grid-toolbar-controls.scss';

import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { FieldType, GridGroup } from '@/features/template';
import { GridGroupPanel } from '@/features/editor/ui/components/canvas/grid-edit-panel';
import { BlockTypeSelector } from '@/features/editor/ui/components/shared/block-type-selector';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useGridGroupOps } from '@/features/editor/ui/hooks/use-grid-group-ops';

interface GridToolbarControlsProps {
  group: GridGroup;
}

function clampDimension(value: number, min = 1, max = 20): number {
  return Math.min(max, Math.max(min, value));
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
  const { updateGroupSettings, updateGroupBounds, updateGroupFieldType, ungroupGridGroup } =
    useGridGroupOps();

  const layoutPopover = useToolbarPopover();
  const spacingPopover = useToolbarPopover();

  const groupFieldType = currentImage?.rectangles.find(r => r.id === group.rectIds[0])?.fieldType;

  useEffect(() => {
    layoutPopover.close();
    spacingPopover.close();
  }, [group.id]);

  const adjustCols = (delta: number) => {
    updateGroupSettings(group.id, { cols: clampDimension(group.settings.cols + delta) });
  };

  const adjustRows = (delta: number) => {
    updateGroupSettings(group.id, { rows: clampDimension(group.settings.rows + delta) });
  };

  return (
    <div className="grid-toolbar-controls">
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
                    value={group.settings.cols}
                    onChange={e =>
                      updateGroupSettings(group.id, {
                        cols: clampDimension(Number(e.target.value) || 1),
                      })
                    }
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
                    value={group.settings.rows}
                    onChange={e =>
                      updateGroupSettings(group.id, {
                        rows: clampDimension(Number(e.target.value) || 1),
                      })
                    }
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

      <div ref={spacingPopover.containerRef} className="grid-toolbar-controls__popover-anchor">
        <button
          ref={spacingPopover.triggerRef}
          type="button"
          className={clsx('grid-toolbar-controls__menu-trigger', {
            'grid-toolbar-controls__menu-trigger--open': spacingPopover.isOpen,
          })}
          onClick={spacingPopover.toggle}
        >
          {t('editor.gridEditSpacing')}
        </button>
        {spacingPopover.isOpen && spacingPopover.menuPosition &&
          createPortal(
            <div
              ref={spacingPopover.menuRef}
              className="grid-toolbar-controls__popover"
              {...blockSelectionZoneProps}
              style={{
                top: spacingPopover.menuPosition.top,
                left: spacingPopover.menuPosition.left,
              }}
            >
              <GridGroupPanel
                settings={group.settings}
                bounds={group.bounds}
                blockCount={group.rectIds.length}
                compact
                onSettingsChange={updates => updateGroupSettings(group.id, updates)}
                onBoundsChange={bounds => updateGroupBounds(group.id, bounds)}
              />
            </div>,
            document.body,
          )}
      </div>

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
