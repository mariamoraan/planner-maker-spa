import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import type {
  BindingGroup,
  GridGroup,
  Rectangle,
  Template,
  TemplatePage,
} from '@/features/template';
import { useTemplateStore } from '@/features/template';

export type DemoCaptureScope = 'selection' | 'page' | 'template';

export interface DemoCaptureEnvelope {
  kind: 'demo-capture';
  scope: DemoCaptureScope;
  capturedAt: string;
  templateId: string;
  pageId?: string;
  pageType?: string;
  data: unknown;
}

export type CaptureDemoSnapshotResult =
  | { ok: true; envelope: DemoCaptureEnvelope; json: string }
  | { ok: false; error: string };

interface CleanPage {
  id: string;
  name: string;
  type: TemplatePage['type'];
  width: number;
  height: number;
  rectangles: Rectangle[];
  gridGroups?: Record<string, GridGroup>;
  bindingGroups?: Record<string, BindingGroup>;
  spreadId?: string;
  spreadFace?: TemplatePage['spreadFace'];
}

interface SelectionPayload {
  rectangles: Rectangle[];
  gridGroups?: Record<string, GridGroup>;
  bindingGroups?: Record<string, BindingGroup>;
}

function resolveTemplateIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/(?:landing-demo\/)?editor\/([^/]+)/);
  return match?.[1] ?? null;
}

function pickReferencedGroups(
  rectangles: Rectangle[],
  gridGroups: Record<string, GridGroup> | undefined,
  bindingGroups: Record<string, BindingGroup> | undefined,
): Pick<SelectionPayload, 'gridGroups' | 'bindingGroups'> {
  const usedGridIds = new Set<string>();
  const usedBindingIds = new Set<string>();

  for (const rect of rectangles) {
    if (rect.gridGroupId) usedGridIds.add(rect.gridGroupId);
    if (rect.bindingGroupId) usedBindingIds.add(rect.bindingGroupId);
  }

  for (const gridId of usedGridIds) {
    const bindingId = gridGroups?.[gridId]?.bindingGroupId;
    if (bindingId) usedBindingIds.add(bindingId);
  }

  const result: Pick<SelectionPayload, 'gridGroups' | 'bindingGroups'> = {};

  if (usedGridIds.size > 0 && gridGroups) {
    const picked = Object.fromEntries(
      [...usedGridIds]
        .map((id) => [id, gridGroups[id]] as const)
        .filter((entry): entry is [string, GridGroup] => Boolean(entry[1])),
    );
    if (Object.keys(picked).length > 0) result.gridGroups = picked;
  }

  if (usedBindingIds.size > 0 && bindingGroups) {
    const picked = Object.fromEntries(
      [...usedBindingIds]
        .map((id) => [id, bindingGroups[id]] as const)
        .filter((entry): entry is [string, BindingGroup] => Boolean(entry[1])),
    );
    if (Object.keys(picked).length > 0) result.bindingGroups = picked;
  }

  return result;
}

function cleanPage(page: TemplatePage): CleanPage {
  const clean: CleanPage = {
    id: page.id,
    name: page.name,
    type: page.type,
    width: page.width,
    height: page.height,
    rectangles: page.rectangles.map((rect) => ({ ...rect })),
  };

  if (page.gridGroups && Object.keys(page.gridGroups).length > 0) {
    clean.gridGroups = page.gridGroups;
  }
  if (page.bindingGroups && Object.keys(page.bindingGroups).length > 0) {
    clean.bindingGroups = page.bindingGroups;
  }
  if (page.spreadId) clean.spreadId = page.spreadId;
  if (page.spreadFace) clean.spreadFace = page.spreadFace;

  return clean;
}

function cleanTemplate(template: Template): Record<string, unknown> {
  const clean: Record<string, unknown> = {
    id: template.id,
    name: template.name,
    images: template.images.map(cleanPage),
  };

  if (template.description !== undefined) clean.description = template.description;
  if (template.paperSize) clean.paperSize = template.paperSize;
  if (template.locale) clean.locale = template.locale;
  if (template.weekStartsOn) clean.weekStartsOn = template.weekStartsOn;
  if (template.startDate) clean.startDate = template.startDate;
  if (template.endDate) clean.endDate = template.endDate;
  if (template.defaultFontId) clean.defaultFontId = template.defaultFontId;
  if (template.customColors?.length) clean.customColors = template.customColors;

  return clean;
}

function buildEnvelope(
  scope: DemoCaptureScope,
  templateId: string,
  page: TemplatePage | null,
  data: unknown,
): DemoCaptureEnvelope {
  return {
    kind: 'demo-capture',
    scope,
    capturedAt: new Date().toISOString(),
    templateId,
    ...(page
      ? {
          pageId: page.id,
          pageType: page.type,
        }
      : {}),
    data,
  };
}

export function captureDemoSnapshot(
  scope: DemoCaptureScope,
  pathname = typeof window !== 'undefined' ? window.location.pathname : '',
): CaptureDemoSnapshotResult {
  const templateId = resolveTemplateIdFromPath(pathname);
  if (!templateId) {
    return { ok: false, error: 'Open an editor page first.' };
  }

  const template = useTemplateStore.getState().getTemplate(templateId);
  if (!template) {
    return { ok: false, error: `Template "${templateId}" not loaded.` };
  }

  const { currentImageId, selectedRectangleIds } = useEditorStore.getState();
  const page =
    (currentImageId
      ? template.images.find((image) => image.id === currentImageId)
      : null) ??
    template.images[0] ??
    null;

  let data: unknown;

  if (scope === 'template') {
    data = cleanTemplate(template);
  } else {
    if (!page) {
      return { ok: false, error: 'No page open in the editor.' };
    }

    if (scope === 'page') {
      data = cleanPage(page);
    } else {
      if (selectedRectangleIds.length === 0) {
        return { ok: false, error: 'Select at least one block first.' };
      }

      const selectedSet = new Set(selectedRectangleIds);
      const rectangles = page.rectangles
        .filter((rect) => selectedSet.has(rect.id))
        .map((rect) => ({ ...rect }));

      if (rectangles.length === 0) {
        return { ok: false, error: 'Selected blocks not found on this page.' };
      }

      const groups = pickReferencedGroups(
        rectangles,
        page.gridGroups,
        page.bindingGroups,
      );

      const selection: SelectionPayload = { rectangles, ...groups };
      data = selection;
    }
  }

  const envelope = buildEnvelope(scope, templateId, page, data);

  return {
    ok: true,
    envelope,
    json: `${JSON.stringify(envelope, null, 2)}\n`,
  };
}

export async function copyDemoSnapshot(
  scope: DemoCaptureScope,
): Promise<CaptureDemoSnapshotResult> {
  const result = captureDemoSnapshot(scope);
  if (!result.ok) return result;

  console.log('[demo-capture]', result.envelope);

  try {
    await navigator.clipboard.writeText(result.json);
  } catch (error) {
    console.warn('[demo-capture] clipboard write failed; copy from console', error);
  }

  return result;
}
