import { useTemplateStore } from '@/stores/template-store';
import { useTemplateId } from './use-template-id';

export const useCurrentImage = () => {
  const templateId = useTemplateId();
  return useTemplateStore(state => {
    if (!templateId || !state.currentImageId) return null;
    const template = state.templates.find(t => t.id === templateId);
    return template?.images.find(img => img.id === state.currentImageId) ?? null;
  });
};
