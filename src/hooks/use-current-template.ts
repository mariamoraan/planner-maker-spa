import { useTemplateStore } from '@/stores/template-store';
import { useTemplateId } from './use-template-id';

export const useCurrentTemplate = () => {
  const templateId = useTemplateId();
  const getTemplate = useTemplateStore(s => s.getTemplate);
  return templateId ? getTemplate(templateId) : null;
};
