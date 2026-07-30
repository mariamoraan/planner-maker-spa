import { useTemplateStore } from '@/stores/template-store';
import { useTemplateId } from './use-template-id';

export const useCurrentTemplate = () => {
  const templateId = useTemplateId();
  return useTemplateStore(state => {
    if (!templateId) return null;
    return state.templates.find(t => t.id === templateId) ?? null;
  });
};
