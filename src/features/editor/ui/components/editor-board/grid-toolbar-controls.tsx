import './grid-toolbar-controls.scss';

import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { FieldType, GridGroup } from '@/features/template';
import { AreaStyleControls } from '@/features/editor/ui/components/shared/area-style-controls';
import { BlockTypeSelector } from '@/features/editor/ui/components/shared/block-type-selector';
import { GridAlignmentPicker } from '@/features/editor/ui/components/shared/grid-alignment-picker';
import { LayerControls } from '@/features/editor/ui/components/shared/layer-controls';
import { SliderStepper } from '@/features/editor/ui/components/shared/slider-stepper';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';
import { getGridGroupFieldType } from '@/features/editor/domain/services/grid-group';
import { normalizeGridSettings } from '@/features/editor/domain/services/grid-edit-types';
import {
  getGridGap,
  maxBlockSize,
  maxGridGap,
  maxGridPadding,
  scaleGridSettingsForGapChange,
} from '@/features/editor/domain/services/grid-layout';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useGridGroupOps } from '@/features/editor/ui/hooks/use-grid-group-ops';
import { useGridStyleEditing } from '@/features/editor/ui/hooks/use-grid-style-editing';
import { GridIcon, GapIcon, PaddingIcon, TrashIcon } from '@/core/icons';

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

function clampGap(value: number, min = 0): number {
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
  const gridEditFocus = useEditorStore(state => state.gridEditFocus);
  const setGridEditFocus = useEditorStore(state => state.setGridEditFocus);
  const { updateGroupSettings, updateGroupFieldType, ungroupGridGroup, deleteGridGroup } = useGridGroupOps();
  const gridStyleEditing = useGridStyleEditing(group, currentImage?.rectangles ?? []);

  const layoutPopover = useToolbarPopover();
  const paddingPopover = useToolbarPopover();
  const gapPopover = useToolbarPopover();
  const blockSizePopover = useToolbarPopover();

  const settings = normalizeGridSettings(group.settings);
  const groupFieldType = currentImage
    ? getGridGroupFieldType(group, currentImage.rectangles, currentImage.gridGroups)
    : undefined;
  const representativeRect = currentImage?.rectangles.find(rect => rect.id === group.rectIds[0]);
  const padding = settings.padding ?? { x: 0, y: 0 };
  const gap = getGridGap(group.bounds, settings);
  const slotSize = maxBlockSize(
    group.bounds,
    settings.cols,
    settings.rows,
    settings.gap ?? { x: gap.gapX, y: gap.gapY },
  );
  const maxRectWidth = slotSize.width;
  const maxGapLimits = maxGridGap(group.bounds, settings);
  const maxPaddingLimits = maxGridPadding(group.bounds, settings);
  const isGridMode = gridEditFocus === 'grid';

  useEffect(() => {
    layoutPopover.close();
    paddingPopover.close();
    gapPopover.close();
    blockSizePopover.close();
  }, [group.id]);

  const adjustCols = (delta: number) => {
    updateGroupSettings(group.id, { cols: clampDimension(settings.cols + delta) });
  };

  const adjustRows = (delta: number) => {
    updateGroupSettings(group.id, { rows: clampDimension(settings.rows + delta) });
  };

  const commitCols = (value: number) => {
    const cols = clampDimension(value);
    if (cols !== settings.cols) {
      updateGroupSettings(group.id, { cols });
    }
  };

  const commitRows = (value: number) => {
    const rows = clampDimension(value);
    if (rows !== settings.rows) {
      updateGroupSettings(group.id, { rows });
    }
  };

  const applyPaddingChange = (targetPadding: { x: number; y: number }) => {
    updateGroupSettings(group.id, { padding: targetPadding });
  };

  const commitPaddingX = (value: number) => {
    const x = clampPadding(Math.min(maxPaddingLimits.x, value));
    if (x !== padding.x) {
      applyPaddingChange({ x, y: padding.y });
    }
  };

  const commitPaddingY = (value: number) => {
    const y = clampPadding(Math.min(maxPaddingLimits.y, value));
    if (y !== padding.y) {
      applyPaddingChange({ x: padding.x, y });
    }
  };

  const applyGapChange = (targetGap: { gapX: number; gapY: number }) => {
    const next = scaleGridSettingsForGapChange(group.bounds, settings, targetGap);
    updateGroupSettings(group.id, {
      gap: next.gap,
      rectWidth: next.rectWidth,
      rectHeight: next.rectHeight,
      padding: next.padding,
    });
  };

  const commitGapX = (value: number) => {
    const gapX = clampGap(Math.min(maxGapLimits.x, value));
    if (gapX !== gap.gapX) {
      applyGapChange({ gapX, gapY: gap.gapY });
    }
  };

  const commitGapY = (value: number) => {
    const gapY = clampGap(Math.min(maxGapLimits.y, value));
    if (gapY !== gap.gapY) {
      applyGapChange({ gapX: gap.gapX, gapY });
    }
  };

  const adjustRectWidth = (delta: number) => {
    updateGroupSettings(group.id, {
      rectWidth: clampBlockSize(settings.rectWidth + delta, 20, maxRectWidth),
    });
  };

  const adjustRectHeight = (delta: number) => {
    updateGroupSettings(group.id, {
      rectHeight: clampBlockSize(settings.rectHeight + delta, 20),
    });
  };

  const commitRectWidth = (value: number) => {
    const rectWidth = clampBlockSize(value, 20, maxRectWidth);
    if (rectWidth !== settings.rectWidth) {
      updateGroupSettings(group.id, { rectWidth });
    }
  };

  const commitRectHeight = (value: number) => {
    const rectHeight = clampBlockSize(value, 20);
    if (rectHeight !== settings.rectHeight) {
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

      <div
        className="grid-toolbar-controls__focus-toggle"
        role="group"
        aria-label={t('editor.gridEditFocusLabel')}
      >
        <button
          type="button"
          className={clsx('grid-toolbar-controls__focus-btn', {
            'grid-toolbar-controls__focus-btn--active': isGridMode,
          })}
          onClick={() => setGridEditFocus('grid')}
          aria-pressed={isGridMode}
        >
          {t('editor.gridEditFocusGrid')}
        </button>
        <button
          type="button"
          className={clsx('grid-toolbar-controls__focus-btn', {
            'grid-toolbar-controls__focus-btn--active': !isGridMode,
          })}
          onClick={() => setGridEditFocus('block')}
          aria-pressed={!isGridMode}
        >
          {t('editor.gridEditFocusBlock')}
        </button>
      </div>

      <div className="grid-toolbar-controls__divider" />

      {isGridMode ? (
        <>
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
                        defaultValue={settings.cols}
                        key={`cols-${group.id}-${settings.cols}`}
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
                        defaultValue={settings.rows}
                        key={`rows-${group.id}-${settings.rows}`}
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

          <div ref={paddingPopover.containerRef} className="grid-toolbar-controls__popover-anchor">
            <button
              ref={paddingPopover.triggerRef}
              type="button"
              className={clsx('grid-toolbar-controls__menu-trigger', {
                'grid-toolbar-controls__menu-trigger--open': paddingPopover.isOpen,
              })}
              onClick={paddingPopover.toggle}
              title={t('editor.gridCellPadding')}
              aria-label={t('editor.gridCellPadding')}
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
                  <SliderStepper
                    label={t('editor.gridPaddingX')}
                    value={padding.x}
                    min={0}
                    max={maxPaddingLimits.x}
                    onChange={x => applyPaddingChange({ x, y: padding.y })}
                    onCommit={commitPaddingX}
                  />
                  <SliderStepper
                    label={t('editor.gridPaddingY')}
                    value={padding.y}
                    min={0}
                    max={maxPaddingLimits.y}
                    onChange={y => applyPaddingChange({ x: padding.x, y })}
                    onCommit={commitPaddingY}
                  />
                </div>,
                document.body,
              )}
          </div>

          <div ref={gapPopover.containerRef} className="grid-toolbar-controls__popover-anchor">
            <button
              ref={gapPopover.triggerRef}
              type="button"
              className={clsx('grid-toolbar-controls__menu-trigger', {
                'grid-toolbar-controls__menu-trigger--open': gapPopover.isOpen,
              })}
              onClick={gapPopover.toggle}
              title={t('editor.gridGap')}
              aria-label={t('editor.gridGap')}
            >
              <GapIcon size={16} />
            </button>
            {gapPopover.isOpen && gapPopover.menuPosition &&
              createPortal(
                <div
                  ref={gapPopover.menuRef}
                  className="grid-toolbar-controls__popover grid-toolbar-controls__popover--gap"
                  {...blockSelectionZoneProps}
                  style={{
                    top: gapPopover.menuPosition.top,
                    left: gapPopover.menuPosition.left,
                  }}
                >
                  {settings.cols >= 2 && (
                    <SliderStepper
                      label={t('editor.gridGapX')}
                      value={gap.gapX}
                      min={0}
                      max={maxGapLimits.x}
                      onChange={gapX => applyGapChange({ gapX, gapY: gap.gapY })}
                      onCommit={commitGapX}
                    />
                  )}
                  {settings.rows >= 2 && (
                    <SliderStepper
                      label={t('editor.gridGapY')}
                      value={gap.gapY}
                      min={0}
                      max={maxGapLimits.y}
                      onChange={gapY => applyGapChange({ gapX: gap.gapX, gapY })}
                      onCommit={commitGapY}
                    />
                  )}
                </div>,
                document.body,
              )}
          </div>
        </>
      ) : (
        <>
          <GridAlignmentPicker
            alignH={settings.alignH}
            alignV={settings.alignV}
            label={t('editor.gridAlignment')}
            variant="dropdown"
            onChange={(alignH, alignV) => updateGroupSettings(group.id, { alignH, alignV })}
          />

          <div ref={blockSizePopover.containerRef} className="grid-toolbar-controls__popover-anchor">
            <button
              ref={blockSizePopover.triggerRef}
              type="button"
              className={clsx('grid-toolbar-controls__menu-trigger', {
                'grid-toolbar-controls__menu-trigger--open': blockSizePopover.isOpen,
              })}
              onClick={blockSizePopover.toggle}
              title={t('editor.gridBlockSize')}
              aria-label={t('editor.gridBlockSize')}
            >
              <GridIcon size={16} />
            </button>
            {blockSizePopover.isOpen && blockSizePopover.menuPosition &&
              createPortal(
                <div
                  ref={blockSizePopover.menuRef}
                  className="grid-toolbar-controls__popover grid-toolbar-controls__popover--layout"
                  {...blockSelectionZoneProps}
                  style={{
                    top: blockSizePopover.menuPosition.top,
                    left: blockSizePopover.menuPosition.left,
                  }}
                >
                  <label className="grid-toolbar-controls__stepper">
                    <span>{t('editor.gridBlockWidth')}</span>
                    <div className="grid-toolbar-controls__stepper-inputs">
                      <DimensionStepperInput
                        value={settings.rectWidth}
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
                        value={settings.rectHeight}
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
        </>
      )}

      <div className="grid-toolbar-controls__divider" />
      <LayerControls selectedIds={selectedRectangleIds} />

      <div className="grid-toolbar-controls__divider" />
      <button
        type="button"
        className="grid-toolbar-controls__delete"
        onClick={() => deleteGridGroup(group.id)}
        title={t('editor.gridDelete')}
        aria-label={t('editor.gridDelete')}
      >
        <TrashIcon size={16} />
      </button>
      {isGridMode && (
        <button
          type="button"
          className="grid-toolbar-controls__ungroup"
          onClick={() => ungroupGridGroup(group.id)}
        >
          {t('editor.gridUngroup')}
        </button>
      )}
    </div>
  );
};
