import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import type { Template } from '@/features/template';

export const getTemplate = (id: string): Template | null =>
  useTemplateStore.getState().getTemplate(id);

export const listTemplates = (): Template[] =>
  useTemplateStore.getState().templates;

export const getCurrentImage = (templateId: string) =>
  useTemplateStore.getState().getCurrentImage(templateId);
