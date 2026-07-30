import type { Template, TemplateImage, Rectangle, PlannerLocale } from '@/types/planner';
import type { ImageRef } from './image-asset.port';

export type TemplatePageRecord = Omit<TemplateImage, 'src'> & {
  imageRef: ImageRef;
};

export type TemplateRecord = {
  id: string;
  name: string;
  description?: string;
  pageOrder: string[];
  createdAt: Date;
  updatedAt: Date;
  startDate?: Date;
  endDate?: Date;
  locale?: PlannerLocale;
};

export type Unsubscribe = () => void;

export interface TemplateRepositoryPort {
  subscribe(uid: string, onChange: (templates: Template[]) => void): Unsubscribe;
  createTemplate(uid: string, template: Template): Promise<void>;
  updateTemplate(uid: string, templateId: string, updates: Partial<TemplateRecord>): Promise<void>;
  deleteTemplate(uid: string, templateId: string): Promise<void>;
  createPage(uid: string, templateId: string, page: TemplatePageRecord, index: number): Promise<void>;
  updatePage(
    uid: string,
    templateId: string,
    pageId: string,
    updates: Partial<TemplatePageRecord>
  ): Promise<void>;
  deletePage(uid: string, templateId: string, pageId: string): Promise<void>;
  setPageOrder(uid: string, templateId: string, pageOrder: string[]): Promise<void>;
  updatePageRectangles(
    uid: string,
    templateId: string,
    pageId: string,
    rectangles: Rectangle[]
  ): Promise<void>;
}
