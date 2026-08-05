/** Re-export template store mutations as commands for CQRS layer */
export {
  useTemplateStore,
} from '@/features/template/ui/stores/template-store';

import { useTemplateStore } from '@/features/template/ui/stores/template-store';

export const createTemplate = (name: string, paperSize: Parameters<ReturnType<typeof useTemplateStore.getState>['createTemplate']>[1], description?: string) =>
  useTemplateStore.getState().createTemplate(name, paperSize, description);

export const updateTemplate = (id: string, updates: Parameters<ReturnType<typeof useTemplateStore.getState>['updateTemplate']>[1]) =>
  useTemplateStore.getState().updateTemplate(id, updates);

export const deleteTemplate = (id: string) =>
  useTemplateStore.getState().deleteTemplate(id);

export const hydrateFromRemote = (templates: Parameters<ReturnType<typeof useTemplateStore.getState>['hydrateFromRemote']>[0]) =>
  useTemplateStore.getState().hydrateFromRemote(templates);

export const setSyncUser = (uid: string | null) =>
  useTemplateStore.getState().setSyncUser(uid);

export const setMigrating = (isMigrating: boolean) =>
  useTemplateStore.getState().setMigrating(isMigrating);

export const resetSync = () =>
  useTemplateStore.getState().resetSync();
