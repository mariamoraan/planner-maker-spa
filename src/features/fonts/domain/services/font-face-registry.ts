import {
  cssFamilyNameForCustomFont,
  type CustomFontFamily,
  type FontFaceAsset,
} from '../entities/custom-font-family';
import type { FontAssetPort } from '../ports/font-asset.port';
import { isDataUrl } from '@/core/functions/image-data-url';

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const [, base64 = ''] = dataUrl.split(',');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function sourceToArrayBuffer(source: string): Promise<ArrayBuffer> {
  if (isDataUrl(source)) {
    return dataUrlToArrayBuffer(source);
  }

  const absolute =
    source.startsWith('/') && typeof window !== 'undefined'
      ? `${window.location.origin}${source}`
      : source;

  const response = await fetch(absolute);
  if (!response.ok) {
    throw new Error(`Failed to fetch font bytes (${response.status})`);
  }
  return response.arrayBuffer();
}

type RegisteredFace = {
  familyCssName: string;
  weight: number;
  style: string;
  fontFace: FontFace;
};

function familySignature(family: CustomFontFamily): string {
  return family.faces
    .map(
      face =>
        `${face.weight}-${face.style}:${face.assetRef.fileKey ?? face.assetRef.url ?? face.assetRef.key}:${face.fileName}`,
    )
    .sort()
    .join('|');
}

/**
 * Session registry: loads custom font bytes and registers them with document.fonts
 * so Konva / Canvas 2D / CSS previews can resolve the family.
 */
class FontFaceRegistry {
  private readonly registered = new Map<string, RegisteredFace[]>();
  private readonly signatures = new Map<string, string>();
  private syncGeneration = 0;

  cssFamilyName(fontId: string): string {
    return cssFamilyNameForCustomFont(fontId);
  }

  isRegistered(fontId: string): boolean {
    return (this.registered.get(fontId)?.length ?? 0) > 0;
  }

  async syncFamilies(
    families: CustomFontFamily[],
    assets: FontAssetPort,
  ): Promise<void> {
    const generation = ++this.syncGeneration;
    const nextIds = new Set(families.map(family => family.id));

    for (const [fontId] of this.registered) {
      if (!nextIds.has(fontId)) {
        this.unregisterFamily(fontId);
      }
    }

    for (const family of families) {
      if (generation !== this.syncGeneration) return;
      await this.registerFamily(family, assets);
    }
  }

  async registerFamily(
    family: CustomFontFamily,
    assets: FontAssetPort,
  ): Promise<void> {
    const signature = familySignature(family);
    if (this.signatures.get(family.id) === signature && this.isRegistered(family.id)) {
      return;
    }

    this.unregisterFamily(family.id);

    const familyCssName = cssFamilyNameForCustomFont(family.id);
    const registered: RegisteredFace[] = [];

    for (const face of family.faces) {
      try {
        const fontFace = await this.loadFace(familyCssName, face, assets);
        document.fonts.add(fontFace);
        await fontFace.load();
        registered.push({
          familyCssName,
          weight: face.weight,
          style: face.style,
          fontFace,
        });
      } catch (error) {
        console.warn(`[font-face-registry] failed to load face for ${family.id}:`, error);
      }
    }

    if (registered.length > 0) {
      this.registered.set(family.id, registered);
      this.signatures.set(family.id, signature);
    }
  }

  unregisterFamily(fontId: string): void {
    const faces = this.registered.get(fontId);
    if (faces) {
      for (const entry of faces) {
        try {
          document.fonts.delete(entry.fontFace);
        } catch {
          // ignore
        }
      }
    }
    this.registered.delete(fontId);
    this.signatures.delete(fontId);
  }

  clear(): void {
    for (const fontId of [...this.registered.keys()]) {
      this.unregisterFamily(fontId);
    }
    this.syncGeneration += 1;
  }

  async ensureLoaded(fontId: string, sample = '400 16px'): Promise<void> {
    const family = cssFamilyNameForCustomFont(fontId);
    if (!this.isRegistered(fontId)) return;
    try {
      await document.fonts.load(`${sample} "${family}"`);
    } catch {
      // ignore — canvas path already has a load fallback
    }
  }

  private async loadFace(
    familyCssName: string,
    face: FontFaceAsset,
    assets: FontAssetPort,
  ): Promise<FontFace> {
    const source = await assets.load(face.assetRef);
    if (!source) {
      throw new Error(`Missing font asset for ${face.fileName}`);
    }
    const buffer = await sourceToArrayBuffer(source);
    return new FontFace(familyCssName, buffer, {
      weight: String(face.weight),
      style: face.style,
      display: 'swap',
    });
  }
}

export const fontFaceRegistry = new FontFaceRegistry();
