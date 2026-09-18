export const MAX_FONT_FAMILIES_PER_ACCOUNT = 20;
export const MAX_FACES_PER_FAMILY = 4;
export const MAX_FONT_FILE_BYTES = 8 * 1024 * 1024;

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
