import type { FontFaceStyle, FontFaceWeight } from '../entities/custom-font-family';
import {
  ALLOWED_FONT_EXTENSIONS,
  type AllowedFontExtension,
} from '../constants/font-limits';
import { formatBytesLimit, resolvePlanLimits, resolveUserPlan } from '@/core/plans';

export function detectFontFaceRole(fileName: string): {
  weight: FontFaceWeight;
  style: FontFaceStyle;
} {
  const lower = fileName.toLowerCase().replace(/\.[^.]+$/, '');
  const isBold = /\b(bold|black|heavy|extrabold|ultrabold|700|800|900)\b/.test(lower)
    || /[-_](bold|black|heavy|bd)([-_.]|$)/.test(lower);
  const isItalic = /\b(italic|oblique|ital)\b/.test(lower)
    || /[-_](italic|oblique|it)([-_.]|$)/.test(lower);

  return {
    weight: isBold ? 700 : 400,
    style: isItalic ? 'italic' : 'normal',
  };
}

export function getFontExtension(fileName: string): AllowedFontExtension | null {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!match) return null;
  const ext = match[1] as AllowedFontExtension;
  return (ALLOWED_FONT_EXTENSIONS as readonly string[]).includes(ext) ? ext : null;
}

export function isAllowedFontFile(file: File): { ok: true } | { ok: false; reason: string } {
  const limits = resolvePlanLimits(resolveUserPlan());
  if (file.size > limits.maxFontBytes) {
    return {
      ok: false,
      reason: `El archivo supera el límite de ${formatBytesLimit(limits.maxFontBytes)}`,
    };
  }
  if (!getFontExtension(file.name)) {
    return { ok: false, reason: 'Formato no válido. Usa .ttf, .otf, .woff o .woff2' };
  }
  return { ok: true };
}

export function suggestFamilyNameFromFiles(files: File[]): string {
  return suggestFamilyNameFromFileNames(files.map(file => file.name));
}

export function suggestFamilyNameFromFileNames(fileNames: string[]): string {
  const first = fileNames[0] ?? 'Mi tipografía';
  return first
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]?(regular|bold|italic|oblique|black|heavy|light|medium|thin)\b/gi, '')
    .replace(/[-_]+/g, ' ')
    .trim() || 'Mi tipografía';
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Failed to read font file'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read font file'));
    reader.readAsDataURL(file);
  });
}
