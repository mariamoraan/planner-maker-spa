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

export const GridToolbarControls = ({ group }: GridToolbarControlsProps) => {
  const { t } = useTranslation();
  const currentImage = useCurrentImage();
  const { updateGroupSettings, updateGroupBounds, updateGroupFieldType, ungroupGridGroup } =
    useGridGroupOps();

  const [isSpacingOpen, setIsSpacingOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const spacingTriggerRef = useRef<HTMLButtonElement>(null);
  const spacingContainerRef = useRef<HTMLDivElement>(null);
  const spacingMenuRef = useRef<HTMLDivElement>(null);

  const groupFieldType = currentImage?.rectangles.find(r => r.id === group.rectIds[0])?.fieldType;

  const closeSpacingMenu = () => {
    setIsSpacingOpen(false);
    setMenuPosition(null);
  };

  useEffect(() => {
    closeSpacingMenu();
  }, [group.id]);

  useEffect(() => {
    if (!isSpacingOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (spacingTriggerRef.current?.contains(target)) return;
      if (spacingContainerRef.current?.contains(target)) return;
      if (spacingMenuRef.current?.contains(target)) return;
      closeSpacingMenu();
    };

    const handleScrollOrResize = () => closeSpacingMenu();

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
  }, [isSpacingOpen]);

  const adjustCols = (delta: number) => {
    updateGroupSettings(group.id, { cols: clampDimension(group.settings.cols + delta) });
  };

  const adjustRows = (delta: number) => {
    updateGroupSettings(group.id, { rows: clampDimension(group.settings.rows + delta) });
  };

  const toggleSpacingMenu = () => {
    if (isSpacingOpen) {
      closeSpacingMenu();
      return;
    }

    const rect = spacingTriggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setMenuPosition({ top: rect.bottom + 6, left: rect.left });
    setIsSpacingOpen(true);
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

      <div className="grid-toolbar-controls__divider" />

      {groupFieldType && (
        <BlockTypeSelector
          currentType={groupFieldType}
          onSelect={(type: FieldType) => updateGroupFieldType(group.id, type)}
          variant="popover"
        />
      )}

      <div ref={spacingContainerRef} className="grid-toolbar-controls__popover-anchor">
        <button
          ref={spacingTriggerRef}
          type="button"
          className={clsx('grid-toolbar-controls__menu-trigger', {
            'grid-toolbar-controls__menu-trigger--open': isSpacingOpen,
          })}
          onClick={toggleSpacingMenu}
        >
          {t('editor.gridEditSpacing')}
        </button>
        {isSpacingOpen && menuPosition &&
          createPortal(
            <div
              ref={spacingMenuRef}
              className="grid-toolbar-controls__popover"
              {...blockSelectionZoneProps}
              style={{ top: menuPosition.top, left: menuPosition.left }}
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
