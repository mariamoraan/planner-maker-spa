import { useState, useEffect } from 'react';
import { useManageAreas } from '@/features/editor/ui/hooks/use-manage-areas';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import {
  FIELD_FORMAT_REGISTRY,
  getFormatVariant,
  isValidHexColor,
  normalizeHexColor,
  resolveFieldStyle,
  resolvePlannerDefaultFontId,
  upsertCustomColor,
} from '@/features/editor/domain/services/field-style-config';
import type { FieldStyle, FormatVariant, Rectangle } from '@/features/template';
import { useTemplateStore } from '@/features/template';

export const useAreaStyleEditing = (rectangle: Rectangle | null | undefined) => {
  const { updateArea } = useManageAreas();
  const template = useCurrentTemplate();
  const updateTemplate = useTemplateStore(s => s.updateTemplate);
  const plannerFontId = resolvePlannerDefaultFontId(template?.defaultFontId);
  const customColors = template?.customColors ?? [];
  const [hexInput, setHexInput] = useState('');

  useEffect(() => {
    setHexInput('');
  }, [rectangle?.id]);

  if (!rectangle) {
    return null;
  }

  const style = resolveFieldStyle(rectangle, plannerFontId);
  const formatVariant = getFormatVariant(rectangle);
  const formatOptions = FIELD_FORMAT_REGISTRY[rectangle.fieldType];

  const updateStyle = (updates: Partial<FieldStyle>) => {
    updateArea(rectangle.id, {
      style: { ...style, ...updates },
    });
  };

  const rememberCustomColor = (color: string) => {
    if (!template) return;
    const next = upsertCustomColor(customColors, color);
    if (next === customColors || next.join(',') === customColors.join(',')) return;
    updateTemplate(template.id, { customColors: next });
  };

  const handleFormatChange = (variant: FormatVariant) => {
    updateArea(rectangle.id, { formatVariant: variant });
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
};

export type AreaStyleEditing = NonNullable<ReturnType<typeof useAreaStyleEditing>>;
