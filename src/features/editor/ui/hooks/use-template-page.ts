import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { useTemplateId } from './use-template-id';

/** Resolve a template page by id within the current template (not necessarily the active editor page). */
export const useTemplatePage = (pageId: string | null | undefined) => {
  const templateId = useTemplateId();
  const templates = useTemplateStore(state => state.templates);

  if (!templateId || !pageId) return null;
  const template = templates.find(t => t.id === templateId);
  return template?.images.find(img => img.id === pageId) ?? null;
};
