import type { FieldType, TemplateType } from '@/features/template';
import { TEMPLATE_FIELD_TYPES } from '@/features/template';

export interface GridToolPreset {
  cols: number;
  rows: number;
  fieldType: FieldType;
  rectSize: { width: number; height: number };
  align: 'top-left' | 'center';
}

const PAGE_PRESETS: Partial<Record<TemplateType, Omit<GridToolPreset, 'fieldType'> & { fieldType?: FieldType }>> = {
  'monthly-calendar': {
    cols: 7,
    rows: 5,
    fieldType: 'day',
    rectSize: { width: 48, height: 36 },
    align: 'top-left',
  },
  'weekly-calendar': {
    cols: 7,
    rows: 1,
    fieldType: 'day',
    rectSize: { width: 48, height: 36 },
    align: 'top-left',
  },
};

const DEFAULT_PRESET: GridToolPreset = {
  cols: 3,
  rows: 3,
  fieldType: 'day',
  rectSize: { width: 48, height: 36 },
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

export function getGridToolPreset(
  pageType: TemplateType,
  selectedFieldType?: FieldType,
): GridToolPreset {
  const pagePreset = PAGE_PRESETS[pageType];
  const fieldType = pagePreset?.fieldType ?? resolveFieldType(pageType, selectedFieldType);

  if (pagePreset) {
    return {
      cols: pagePreset.cols,
      rows: pagePreset.rows,
      rectSize: pagePreset.rectSize,
      align: pagePreset.align,
      fieldType,
    };
  }

  return {
    ...DEFAULT_PRESET,
    fieldType: resolveFieldType(pageType, selectedFieldType),
  };
}

export function canRedistributeSelection(count: number): boolean {
  return count >= 2;
}
