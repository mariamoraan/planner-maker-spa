import { useState, useEffect } from 'react';
import type { FieldStyle, FormatVariant, GridGroup, Rectangle } from '@/features/template';
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
import { useGridGroupOps } from '@/features/editor/ui/hooks/use-grid-group-ops';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';

export const useGridStyleEditing = (
  group: GridGroup | null | undefined,
  rectangles: Rectangle[],
) => {
  const { updateGroupStyle, updateGroupFormatVariant } = useGridGroupOps();
  const template = useCurrentTemplate();
  const updateTemplate = useTemplateStore(s => s.updateTemplate);
  const plannerFontId = resolvePlannerDefaultFontId(template?.defaultFontId);
  const customColors = template?.customColors ?? [];
  const [hexInput, setHexInput] = useState('');

  const representativeRect = group
    ? rectangles.find(rect => rect.id === group.rectIds[0])
    : undefined;

  useEffect(() => {
    setHexInput('');
  }, [group?.id]);

  if (!group || !representativeRect) {
    return null;
  }

  const style = resolveFieldStyle(representativeRect, plannerFontId);
  const formatVariant = getFormatVariant(representativeRect);
  const formatOptions = FIELD_FORMAT_REGISTRY[representativeRect.fieldType];

  const updateStyle = (updates: Partial<FieldStyle>) => {
    updateGroupStyle(group.id, updates);
  };

  const rememberCustomColor = (color: string) => {
    if (!template) return;
    const next = upsertCustomColor(customColors, color);
    if (next === customColors || next.join(',') === customColors.join(',')) return;
    updateTemplate(template.id, { customColors: next });
  };

  const handleFormatChange = (variant: FormatVariant) => {
    updateGroupFormatVariant(group.id, variant);
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
