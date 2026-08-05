import './grid-toolbar-controls.scss';

import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { FieldType, GridGroup } from '@/features/template';
import { AreaStyleControls } from '@/features/editor/ui/components/shared/area-style-controls';
import { BlockTypeSelector } from '@/features/editor/ui/components/shared/block-type-selector';
import { LayerControls } from '@/features/editor/ui/components/shared/layer-controls';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';
import { getGridGroupFieldType } from '@/features/editor/domain/services/grid-group';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useGridGroupOps } from '@/features/editor/ui/hooks/use-grid-group-ops';
import { useGridStyleEditing } from '@/features/editor/ui/hooks/use-grid-style-editing';
import { GridIcon, PaddingIcon } from '@/core/icons';

interface GridToolbarControlsProps {
  group: GridGroup;
}

function clampDimension(value: number, min = 1, max = 20): number {
  return Math.min(max, Math.max(min, value));
}

function clampBlockSize(value: number, min = 20, max = 9999): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampPadding(value: number, min = 0): number {
  return Math.max(min, Math.round(value));
}

interface DimensionStepperInputProps {
  value: number;
  min?: number;
  max?: number;
  onCommit: (value: number) => void;
  onAdjust: (delta: number) => void;
  decrementLabel?: string;
  incrementLabel?: string;
}

function DimensionStepperInput({
  value,
  min = 0,
  max,
  onCommit,
  onAdjust,
  decrementLabel = '-',
  incrementLabel = '+',
}: DimensionStepperInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const displayValue = draft ?? String(value);

  const commitDraft = () => {
    if (draft === null || draft.trim() === '') {
      setDraft(null);
      return;
    }

    const parsed = Number(draft);
    if (Number.isFinite(parsed)) {
      onCommit(parsed);
    }
    setDraft(null);
  };

  return (
    <>
      <button type="button" onClick={() => onAdjust(-1)} aria-label={decrementLabel}>
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        className="grid-toolbar-controls__dimension-input"
        value={displayValue}
        aria-valuemin={min}
        aria-valuemax={max}
        onFocus={() => setDraft(String(value))}
        onChange={event => setDraft(event.target.value.replace(/\D/g, ''))}
        onBlur={commitDraft}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
      />
      <button type="button" onClick={() => onAdjust(1)} aria-label={incrementLabel}>
        +
      </button>
    </>
  );
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
  const gridStyleEditing = useGridStyleEditing(group, currentImage?.rectangles ?? []);

  const layoutPopover = useToolbarPopover();
  const paddingPopover = useToolbarPopover();

  const groupFieldType = currentImage
    ? getGridGroupFieldType(group, currentImage.rectangles, currentImage.gridGroups)
    : undefined;
  const representativeRect = currentImage?.rectangles.find(rect => rect.id === group.rectIds[0]);
  const padding = group.settings.padding ?? { x: 0, y: 0 };
  const showPaddingControls = group.settings.align === 'top-left';
  const maxRectWidth = Math.round(group.bounds.width / group.settings.cols);

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

  const adjustRectWidth = (delta: number) => {
    updateGroupSettings(group.id, {
      rectWidth: clampBlockSize(group.settings.rectWidth + delta, 20, maxRectWidth),
    });
  };

  const adjustRectHeight = (delta: number) => {
    updateGroupSettings(group.id, {
      rectHeight: clampBlockSize(group.settings.rectHeight + delta, 20),
    });
  };

  const commitRectWidth = (value: number) => {
    const rectWidth = clampBlockSize(value, 20, maxRectWidth);
    if (rectWidth !== group.settings.rectWidth) {
      updateGroupSettings(group.id, { rectWidth });
    }
  };

  const commitRectHeight = (value: number) => {
    const rectHeight = clampBlockSize(value, 20);
    if (rectHeight !== group.settings.rectHeight) {
      updateGroupSettings(group.id, { rectHeight });
    }
  };

  return (
    <div className="grid-toolbar-controls">
      <p className="grid-toolbar-controls__badge">
        {t('editor.gridGroupBadge', {
          cols: group.cols,
          rows: group.rows,
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
          title={t('editor.gridEditLayout')}
          aria-label={t('editor.gridEditLayout')}
        >
          <GridIcon size={16} />
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

              <label className="grid-toolbar-controls__stepper">
                <span>{t('editor.gridBlockWidth')}</span>
                <div className="grid-toolbar-controls__stepper-inputs">
                  <DimensionStepperInput
                    value={group.settings.rectWidth}
                    min={20}
                    max={maxRectWidth}
                    onCommit={commitRectWidth}
                    onAdjust={adjustRectWidth}
                  />
                </div>
              </label>

              <label className="grid-toolbar-controls__stepper">
                <span>{t('editor.gridBlockHeight')}</span>
                <div className="grid-toolbar-controls__stepper-inputs">
                  <DimensionStepperInput
                    value={group.settings.rectHeight}
                    min={20}
                    onCommit={commitRectHeight}
                    onAdjust={adjustRectHeight}
                  />
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
            title={t('editor.gridEditPadding')}
            aria-label={t('editor.gridEditPadding')}
          >
            <PaddingIcon size={16} />
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

      {representativeRect && gridStyleEditing && (
        <>
          <div className="grid-toolbar-controls__divider" />
          <AreaStyleControls
            rectangle={representativeRect}
            variant="toolbar"
            editing={gridStyleEditing}
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
