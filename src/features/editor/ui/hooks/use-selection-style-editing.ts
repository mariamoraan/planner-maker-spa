import { useMemo, useState, useEffect } from 'react';
import type { FieldStyle, FormatVariant, Rectangle } from '@/features/template';
import { useTemplateStore } from '@/features/template';
import {
  FIELD_FORMAT_REGISTRY,
  getFormatVariant,
  isValidHexColor,
  normalizeHexColor,
  resolveFieldStyle,
  resolvePlannerDefaultFontId,
  upsertCustomColor,
} from '@/features/editor/domain/services/field-style-config';
import { useManageAreas } from '@/features/editor/ui/hooks/use-manage-areas';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import type { AreaStyleEditing } from '@/features/editor/ui/hooks/use-area-style-editing';

export function useSelectionStyleEditing(
  selectedIds: string[],
): AreaStyleEditing | null {
  const currentImage = useCurrentImage();
  const template = useCurrentTemplate();
  const updateTemplate = useTemplateStore(s => s.updateTemplate);
  const { updatePageGridState } = useManageAreas();
  const plannerFontId = resolvePlannerDefaultFontId(template?.defaultFontId);
  const customColors = template?.customColors ?? [];
  const [hexInput, setHexInput] = useState('');

  const selectedRects = useMemo(() => {
    if (!currentImage || selectedIds.length === 0) return [];
    const idSet = new Set(selectedIds);
    return currentImage.rectangles.filter(rect => idSet.has(rect.id));
  }, [currentImage, selectedIds]);

  const selectionKey = selectedIds.join(',');

  useEffect(() => {
    setHexInput('');
  }, [selectionKey]);

  if (selectedRects.length === 0 || !currentImage) {
    return null;
  }

  const representative = selectedRects[0];
  const style = resolveFieldStyle(representative, plannerFontId);
  const formatVariant = getFormatVariant(representative);
  const sharedFieldType = selectedRects.every(r => r.fieldType === representative.fieldType)
    ? representative.fieldType
    : null;
  const formatOptions = sharedFieldType
    ? FIELD_FORMAT_REGISTRY[sharedFieldType]
    : [];

  const applyToSelection = (mapRect: (rect: Rectangle) => Rectangle) => {
    const idSet = new Set(selectedIds);
    const nextRects = currentImage.rectangles.map(rect =>
      idSet.has(rect.id) ? mapRect(rect) : rect,
    );
    updatePageGridState({
      rectangles: nextRects,
      gridGroups: currentImage.gridGroups,
      bindingGroups: currentImage.bindingGroups,
    });
  };

  const updateStyle = (updates: Partial<FieldStyle>) => {
    applyToSelection(rect => {
      const base = resolveFieldStyle(rect, plannerFontId);
      return { ...rect, style: { ...base, ...updates } };
    });
  };

  const rememberCustomColor = (color: string) => {
    if (!template) return;
    const next = upsertCustomColor(customColors, color);
    if (next === customColors || next.join(',') === customColors.join(',')) return;
    updateTemplate(template.id, { customColors: next });
  };

  const handleFormatChange = (variant: FormatVariant) => {
    applyToSelection(rect => ({ ...rect, formatVariant: variant }));
  };

  const handleColorPreset = (color: string) => {
    setHexInput(color);
    updateStyle({ color });
  };

  const handleHexBlur = () => {
    const value = hexInput.trim();
    if (isValidHexColor(value)) {
      const normalized = normalizeHexColor(value) ?? value;
      updateStyle({ color: normalized });
      rememberCustomColor(normalized);
    } else {
      setHexInput(style.color);
    }
  };

  const handleHexKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleHexBlur();
    }
  };

  const displayHex = hexInput || style.color;

  return {
    style,
    formatVariant,
    formatOptions,
    customColors,
    updateStyle,
    handleFormatChange,
    handleColorPreset,
    handleHexBlur,
    handleHexKeyDown,
    hexInput,
    setHexInput,
    displayHex,
  };
}
