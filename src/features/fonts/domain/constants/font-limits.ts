import { resolvePlanLimits, resolveUserPlan } from '@/core/plans';

/** @deprecated Prefer resolvePlanLimits(resolveUserPlan()).maxFontFamilies */
export const MAX_FONT_FAMILIES_PER_ACCOUNT = resolvePlanLimits(resolveUserPlan()).maxFontFamilies;

/** @deprecated Prefer resolvePlanLimits(resolveUserPlan()).maxFacesPerFamily */
export const MAX_FACES_PER_FAMILY = resolvePlanLimits(resolveUserPlan()).maxFacesPerFamily;

/** @deprecated Prefer resolvePlanLimits(resolveUserPlan()).maxFontBytes */
export const MAX_FONT_FILE_BYTES = resolvePlanLimits(resolveUserPlan()).maxFontBytes;

export const ALLOWED_FONT_EXTENSIONS = ['ttf', 'otf', 'woff', 'woff2'] as const;
export type AllowedFontExtension = (typeof ALLOWED_FONT_EXTENSIONS)[number];

export const ALLOWED_FONT_MIME_TYPES = [
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  'application/font-woff',
  'application/font-woff2',
  'application/x-font-ttf',
  'application/x-font-otf',
  'application/octet-stream',
] as const;
