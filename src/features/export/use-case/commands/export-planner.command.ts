import { useExportStore } from '@/features/export/ui/stores/export-store';
import type { Template } from '@/features/template';

export const exportPlanner = (template: Template, startDate: Date, endDate: Date) =>
  useExportStore.getState().startExport(template, startDate, endDate);

export const openGenerator = () => useExportStore.getState().openGenerator();

export const closeGenerator = () => useExportStore.getState().closeGenerator();
