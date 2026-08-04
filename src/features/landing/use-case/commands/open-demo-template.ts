import type { Template } from '@/features/template';
import { DEMO_HOME_TEMPLATES } from '@/features/landing/domain/demo-template-data';
import {
  hydrateFromRemote,
  resetSync,
} from '@/features/template/use-case/commands/template.commands';

export function getDemoTemplate(templateId: string): Template | undefined {
  return DEMO_HOME_TEMPLATES.find(template => template.id === templateId);
}

export function getDemoEntryPageId(template: Template): string | null {
  const monthlyPage = template.images.find(image => image.type === 'monthly-calendar');
  return monthlyPage?.id ?? template.images[0]?.id ?? null;
}

export function openDemoTemplate(templateId: string): boolean {
  const template = getDemoTemplate(templateId);
  if (!template) return false;

  resetSync();
  hydrateFromRemote([template]);
  return true;
}
