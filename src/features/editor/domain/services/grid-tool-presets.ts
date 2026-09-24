import type { FieldType, TemplateType } from '@/features/template';
import { TEMPLATE_FIELD_TYPES } from '@/features/template';
import {
  BASELINE_GRID_RECT_SIZE,
  getDefaultGridRectSize,
} from '@/features/editor/domain/services/default-block-size';

export interface GridToolPreset {
  cols: number;
  rows: number;
  fieldType: FieldType;
  rectSize: { width: number; height: number };
  align: 'top-left' | 'center';
}

const PAGE_PRESETS: Partial<
  Record<TemplateType, Omit<GridToolPreset, 'fieldType' | 'rectSize'> & { fieldType?: FieldType }>
> = {
  'yearly-calendar': {
    cols: 4,
    rows: 3,
    fieldType: 'month',
    align: 'top-left',
  },
  'monthly-calendar': {
    cols: 7,
    rows: 5,
    fieldType: 'day',
    align: 'top-left',
  },
  'weekly-calendar': {
    cols: 7,
    rows: 1,
    fieldType: 'day',
    align: 'top-left',
  },
};

const DEFAULT_PRESET: Omit<GridToolPreset, 'rectSize'> = {
  cols: 3,
  rows: 3,
  fieldType: 'day',
  align: 'top-left',
};

function resolveFieldType(pageType: TemplateType, selectedFieldType?: FieldType): FieldType {
  const allowed = TEMPLATE_FIELD_TYPES[pageType];
  if (selectedFieldType && allowed.includes(selectedFieldType)) {
    return selectedFieldType;
  }
  if (allowed.length > 0) {
    return allowed.includes('day') ? 'day' : allowed[0];
  }
  return 'day';
}

function resolveRectSize(pageWidth?: number, pageHeight?: number): { width: number; height: number } {
  if (pageWidth != null && pageHeight != null && pageWidth > 0 && pageHeight > 0) {
    return getDefaultGridRectSize(pageWidth, pageHeight);
  }
  return { width: BASELINE_GRID_RECT_SIZE.width, height: BASELINE_GRID_RECT_SIZE.height };
}

export function getGridToolPreset(
  pageType: TemplateType,
  selectedFieldType?: FieldType,
  pageSize?: { width: number; height: number },
): GridToolPreset {
  const pagePreset = PAGE_PRESETS[pageType];
  const fieldType = pagePreset?.fieldType ?? resolveFieldType(pageType, selectedFieldType);
  const rectSize = resolveRectSize(pageSize?.width, pageSize?.height);

  if (pagePreset) {
    return {
      cols: pagePreset.cols,
      rows: pagePreset.rows,
      rectSize,
      align: pagePreset.align,
      fieldType,
    };
  }

  return {
    ...DEFAULT_PRESET,
    rectSize,
    fieldType: resolveFieldType(pageType, selectedFieldType),
  };
}

export function canRedistributeSelection(count: number): boolean {
  return count >= 2;
}
