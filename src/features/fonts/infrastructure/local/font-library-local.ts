import { get, set } from 'idb-keyval';
import type { CustomFontFamily } from '@/features/fonts/domain/entities/custom-font-family';

function metaKey(uid: string): string {
  return `planner-font-library:${uid}`;
}

export async function loadLocalFontLibrary(uid: string): Promise<CustomFontFamily[]> {
  const value = await get<CustomFontFamily[]>(metaKey(uid));
  return Array.isArray(value) ? value : [];
}

export async function saveLocalFontLibrary(
  uid: string,
  fonts: CustomFontFamily[],
): Promise<void> {
  await set(metaKey(uid), fonts);
}

export function mergeFontLibraries(
  remote: CustomFontFamily[],
  local: CustomFontFamily[],
): CustomFontFamily[] {
  const byId = new Map<string, CustomFontFamily>();
  for (const font of remote) {
    byId.set(font.id, font);
  }
  for (const font of local) {
    const existing = byId.get(font.id);
    if (!existing || font.updatedAt >= existing.updatedAt) {
      byId.set(font.id, font);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
