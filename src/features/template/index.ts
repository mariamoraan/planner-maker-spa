// Domain entities & value objects
export type { Template } from './domain/entities/template';
export type { TemplatePage, TemplateImage } from './domain/entities/template-page';
export type { Rectangle } from './domain/entities/rectangle';
export type {
  FieldType,
  FormatVariant,
  FieldStyle,
  FontId,
  TextCase,
  TextAlign,
  YearFormatVariant,
  MonthFormatVariant,
  DayFormatVariant,
} from './domain/value-objects/field-style';
export type {
  PlannerLocale,
  WeekStartsOn,
  TemplateType,
} from './domain/value-objects/planner-locale';
export type { ImageRef } from './domain/value-objects/image-ref';

// Constants
export { FIELD_TYPE_CONFIG, TEMPLATE_TYPE_CONFIG } from './domain/constants/field-type-config';
export { TEMPLATE_FIELD_TYPES } from './domain/constants/template-field-types';

// Ports
export type { TemplateRepositoryPort, TemplatePageRecord, TemplateRecord } from './domain/ports/template.port';
export type { ImageAssetPort } from './domain/ports/image-asset.port';
export {
  isCloudImageStorageEnabled,
  buildLocalImageRef,
  buildUploadthingImageRef,
  buildLegacyImageKey,
  pageIdFromImageRefKey,
} from './domain/value-objects/image-ref';

// Services
export { generateId } from './domain/services/id-generator';
export {
  getInsertIndexForType,
  imagesOrderChanged,
  normalizeImageOrder,
  reorderWithinType,
} from './domain/services/template-image-order';
export {
  migrateLocalTemplatesToFirebase,
  migrateLocalImagesToCloud,
  repairDuplicatePageOrder,
} from './domain/services/template-migration';
export {
  detectPlannerLocale,
  DEFAULT_WEEK_STARTS_ON,
  DEFAULT_LOCALE,
  formatMonthName,
  formatWeekdayName,
  resolveWeekStartsOn,
} from './domain/services/locale-config';

// Use cases
export { trackEvent, trackPageView } from './use-case/commands/analytics.commands';

// UI
export { useTemplateStore } from './ui/stores/template-store';
export { useTemplateSync } from './ui/hooks/use-template-sync';
export { useHomeTemplates } from './ui/hooks/use-home-templates';
export { TemplateSyncGate } from './ui/components/template-sync-gate';
