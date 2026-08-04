import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { useTemplateId } from './use-template-id';

export const useCurrentImage = () => {
  const templateId = useTemplateId();
  const currentImageId = useEditorStore(state => state.currentImageId);
  const templates = useTemplateStore(state => state.templates);

  if (!templateId || !currentImageId) return null;
  const template = templates.find(t => t.id === templateId);
  return template?.images.find(img => img.id === currentImageId) ?? null;
};
