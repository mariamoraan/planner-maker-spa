import type { CustomFontFamily } from '../entities/custom-font-family';

export type Unsubscribe = () => void;

export interface FontLibraryPort {
  subscribe(
    uid: string,
    onChange: (fonts: CustomFontFamily[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe;
  createFont(uid: string, font: CustomFontFamily): Promise<void>;
  updateFont(
    uid: string,
    fontId: string,
    updates: Partial<Pick<CustomFontFamily, 'name' | 'faces'>>,
  ): Promise<void>;
  deleteFont(uid: string, fontId: string): Promise<void>;
}
