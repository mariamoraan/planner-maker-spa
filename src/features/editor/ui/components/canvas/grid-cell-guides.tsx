import React, { useMemo } from 'react';
import { Group, Rect } from 'react-konva';
import {
  cellSlotOrigin,
  cellSlotSize,
  gridConfigFromGroup,
  type GridBounds,
} from '@/features/editor/domain/services/grid-layout';
import {
  normalizeGridSettings,
  type GridEditSettings,
} from '@/features/editor/domain/services/grid-edit-types';
import type { GridGroup } from '@/features/template';
import { EDITOR_CHROME_INK } from '@/features/editor/domain/constants/editor-chrome';

const GRID_STROKE = EDITOR_CHROME_INK;

interface GridCellGuidesProps {
  gridGroups: Record<string, GridGroup> | undefined;
  scale: number;
  offset: { x: number; y: number };
  /** When set, only this group's cell slots are drawn. */
  onlyGroupId?: string | null;
  previewGroupId?: string | null;
  previewBounds?: GridBounds | null;
  previewSettings?: GridEditSettings | null;
}

function toStage(value: number, scale: number, offsetValue: number): number {
  return offsetValue + value * scale;
}

export const GridCellGuides: React.FC<GridCellGuidesProps> = ({
  gridGroups,
  scale,
  offset,
  onlyGroupId = null,
  previewGroupId = null,
  previewBounds = null,
  previewSettings = null,
}) => {
  const groups = useMemo(() => {
    if (!gridGroups) return [];
    if (onlyGroupId) {
      const group = gridGroups[onlyGroupId];
      return group ? [group] : [];
    }
    return Object.values(gridGroups);
  }, [gridGroups, onlyGroupId]);

  if (groups.length === 0) return null;

  return (
    <Group listening={false}>
      {groups.map(group => {
        const bounds =
          group.id === previewGroupId && previewBounds
            ? previewBounds
            : group.bounds;
        const settings =
          group.id === previewGroupId && previewSettings
            ? previewSettings
            : normalizeGridSettings(group.settings);
        const config = gridConfigFromGroup(bounds, settings);
        const gap = settings.gap ?? { x: 0, y: 0 };
        const slotSize = cellSlotSize(bounds, settings.cols, settings.rows, gap);
        const cellCount = settings.cols * settings.rows;

        return Array.from({ length: cellCount }, (_, index) => {
          const col = index % settings.cols;
          const row = Math.floor(index / settings.cols);
          const origin = cellSlotOrigin(col, row, config);
          return (
            <Rect
              key={`${group.id}-slot-${index}`}
              x={toStage(origin.x, scale, offset.x)}
              y={toStage(origin.y, scale, offset.y)}
              width={slotSize.width * scale}
              height={slotSize.height * scale}
              fillEnabled={false}
              stroke={GRID_STROKE}
              strokeWidth={1.5}
              cornerRadius={0}
              listening={false}
            />
          );
        });
      })}
    </Group>
  );
};
