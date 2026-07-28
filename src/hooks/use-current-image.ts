import { useTemplateStore } from '@/stores/template-store';
import { useTemplateId } from './use-template-id';

export const useCurrentImage = () => {
  const templateId = useTemplateId();
  const getCurrentImage = useTemplateStore(s => s.getCurrentImage);
  return templateId ? getCurrentImage(templateId) : null;
};
