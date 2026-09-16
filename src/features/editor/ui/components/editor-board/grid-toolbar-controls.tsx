import './grid-toolbar-controls.scss';

import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { FieldType, GridGroup } from '@/features/template';
import { AreaStyleControls } from '@/features/editor/ui/components/shared/area-style-controls';
import { BlockTypeSelector } from '@/features/editor/ui/components/shared/block-type-selector';
import { GridAlignmentPicker } from '@/features/editor/ui/components/shared/grid-alignment-picker';
import { SliderStepper } from '@/features/editor/ui/components/shared/slider-stepper';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';
import { getGridGroupFieldType } from '@/features/editor/domain/services/grid-group';
import { normalizeGridSettings } from '@/features/editor/domain/services/grid-edit-types';
import {
  getGridGap,
  maxGridGap,
  scaleGridSettingsForGapChange,
} from '@/features/editor/domain/services/grid-layout';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useGridGroupOps } from '@/features/editor/ui/hooks/use-grid-group-ops';
import { useGridStyleEditing } from '@/features/editor/ui/hooks/use-grid-style-editing';
import { GridIcon, GapIcon, TrashIcon } from '@/core/icons';

interface GridToolbarControlsProps {
  group: GridGroup;
}

function clampDimension(value: number, min = 1, max = 20): number {
  return Math.min(max, Math.max(min, value));
}

function clampGap(value: number, min = 0): number {
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
  const gridEditFocus = useEditorStore(state => state.gridEditFocus);
  const setGridEditFocus = useEditorStore(state => state.setGridEditFocus);
  const { updateGroupSettings, updateGroupFieldType, ungroupGridGroup, deleteGridGroup } = useGridGroupOps();
  const gridStyleEditing = useGridStyleEditing(group, currentImage?.rectangles ?? []);

  const layoutPopover = useToolbarPopover();
  const gapPopover = useToolbarPopover();

  const settings = normalizeGridSettings(group.settings);
  const groupFieldType = currentImage
    ? getGridGroupFieldType(group, currentImage.rectangles, currentImage.gridGroups)
    : undefined;
  const representativeRect = currentImage?.rectangles.find(rect => rect.id === group.rectIds[0]);
  const gap = getGridGap(group.bounds, settings);
  const maxGapLimits = maxGridGap(group.bounds, settings);
  const isGridMode = gridEditFocus === 'grid';

  useEffect(() => {
    layoutPopover.close();
    gapPopover.close();
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
