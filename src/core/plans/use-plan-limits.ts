import {
  formatBytesLimit,
  getEffectivePlanLimits,
  type PlanLimits,
} from '@/core/plans';
import { useDevToolsStore } from '@/core/dev-tools/dev-tools-store';
import { useFontLibraryStore } from '@/features/fonts/ui/stores/font-library-store';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';

export function usePlanLimits() {
  const templates = useTemplateStore(state => state.templates);
  const fonts = useFontLibraryStore(state => state.fonts);
  // Subscribe so UI updates immediately when the dev-tools bypass toggles.
  useDevToolsStore(state => state.limitsDisabled);

  const limits: PlanLimits = getEffectivePlanLimits();

  const plannerCount = templates.length;
  const fontCount = fonts.length;
  const canCreatePlanner = plannerCount < limits.maxPlanners;
  const canUploadFont = fontCount < limits.maxFontFamilies;

  const pageCountFor = (templateId: string | null | undefined): number => {
    if (!templateId) return 0;
    return templates.find(t => t.id === templateId)?.images.length ?? 0;
  };

  const canAddPage = (templateId: string | null | undefined): boolean =>
    pageCountFor(templateId) < limits.maxImagesPerPlanner;

  return {
    limits,
    plannerCount,
    fontCount,
    canCreatePlanner,
    canUploadFont,
    pageCountFor,
    canAddPage,
    maxImageLabel: formatBytesLimit(limits.maxImageBytes),
    maxFontLabel: formatBytesLimit(limits.maxFontBytes),
  };
}
