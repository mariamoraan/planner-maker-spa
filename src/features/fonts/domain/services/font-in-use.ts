import type { CustomFontId } from '@/features/template';
import { isCustomFontId, toCustomFontId } from '@/features/template';
import type { Template } from '@/features/template';

export function isCustomFontInUse(fontId: string, templates: Template[]): boolean {
  const customId: CustomFontId = isCustomFontId(fontId) ? fontId : toCustomFontId(fontId);

  return templates.some(template => {
    if (template.defaultFontId === customId) return true;
    return template.images.some(page =>
      page.rectangles.some(rect => rect.style?.fontId === customId),
    );
  });
}
