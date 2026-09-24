import { useCallback } from 'react';
import type { BindingSourceKind, Rectangle } from '@/features/template';
import {
  assignRectsToBindingGroup,
  createBindingGroup,
  findLooseSequenceBindingId,
  getBindingGroupMembers,
  removeBindingGroup,
  upsertBindingGroup,
  withYearMonthIndexForPage,
} from '@/features/editor/domain/services/binding-group';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import { useManageAreas } from '@/features/editor/ui/hooks/use-manage-areas';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { useTemplateId } from '@/features/editor/ui/hooks/use-template-id';
import { getSpreadMate } from '@/features/template/domain/services/template-spread';

export function useBindingGroupOps() {
  const currentImage = useCurrentImage();
  const template = useCurrentTemplate();
  const templateId = useTemplateId();
  const { updatePageGridState } = useManageAreas();

  const getFreshImage = useCallback(() => {
    if (!templateId) return currentImage;
    return useTemplateStore.getState().getCurrentImage(templateId) ?? currentImage;
  }, [templateId, currentImage]);

  const siblingBindingGroups = useCallback(() => {
    const image = getFreshImage();
    if (!image) return undefined;
    const images =
      (templateId
        ? useTemplateStore.getState().templates.find(t => t.id === templateId)?.images
        : template?.images) ?? [];
    return getSpreadMate(image, images)?.bindingGroups;
  }, [getFreshImage, template?.images, templateId]);

  const setRectangleBindingSource = useCallback(
    (rectangleId: string, source: BindingSourceKind) => {
      const image = getFreshImage();
      if (!image) return;
      const rect = image.rectangles.find(r => r.id === rectangleId);
      if (!rect) return;

      const existingGroup = rect.bindingGroupId
        ? image.bindingGroups?.[rect.bindingGroupId]
        : undefined;

      if (existingGroup) {
        const members = image.rectangles.filter(
          r => r.bindingGroupId === existingGroup.id,
        );
        if (members.length === 1) {
          if (source === 'page') {
            const { bindingGroupId: _b, sequenceIndex: _s, ...rest } = rect;
            const nextRects = image.rectangles.map(r =>
              r.id === rectangleId ? rest : r,
            );
            updatePageGridState({
              rectangles: nextRects,
              gridGroups: image.gridGroups,
              bindingGroups:
                removeBindingGroup(image.bindingGroups, existingGroup.id) ?? null,
            });
            return;
          }

          if (source === 'monthDays' || source === 'weekDays' || source === 'yearMonths') {
            const looseId = findLooseSequenceBindingId(image, source);
            if (looseId && looseId !== existingGroup.id) {
              const membersOfLoose = getBindingGroupMembers(looseId, image.rectangles);
              const nextIndex = membersOfLoose.length;
              const nextRects = image.rectangles.map(r =>
                r.id === rectangleId
                  ? { ...r, bindingGroupId: looseId, sequenceIndex: nextIndex }
                  : r,
              );
              updatePageGridState({
                rectangles: nextRects,
                gridGroups: image.gridGroups,
                bindingGroups:
                  removeBindingGroup(image.bindingGroups, existingGroup.id) ??
                  image.bindingGroups,
              });
              return;
            }
          }

          const nextGroup = withYearMonthIndexForPage(
            { ...existingGroup, source },
            image.type,
            image.bindingGroups,
            { siblingBindingGroups: siblingBindingGroups() },
          );
          updatePageGridState({
            rectangles: image.rectangles,
            gridGroups: image.gridGroups,
            bindingGroups: upsertBindingGroup(image.bindingGroups, nextGroup),
          });
          return;
        }
      }

      if (source === 'page') {
        const nextRects = image.rectangles.map(r => {
          if (r.id !== rectangleId) return r;
          const { bindingGroupId: _b, sequenceIndex: _s, ...rest } = r;
          return rest;
        });
        let nextBindingGroups = image.bindingGroups;
        if (existingGroup) {
          const stillUsed = nextRects.some(r => r.bindingGroupId === existingGroup.id);
          const gridUses = Object.values(image.gridGroups ?? {}).some(
            g => g.bindingGroupId === existingGroup.id,
          );
          if (!stillUsed && !gridUses) {
            nextBindingGroups = removeBindingGroup(nextBindingGroups, existingGroup.id);
          }
        }
        updatePageGridState({
          rectangles: nextRects,
          gridGroups: image.gridGroups,
          bindingGroups: nextBindingGroups ?? null,
        });
        return;
      }

      const looseId = findLooseSequenceBindingId(image, source);
      if (looseId) {
        const members = getBindingGroupMembers(looseId, image.rectangles);
        const nextIndex = members.some(m => m.id === rectangleId)
          ? (rect.sequenceIndex ?? members.findIndex(m => m.id === rectangleId))
          : members.length;
        const nextRects = image.rectangles.map(r =>
          r.id === rectangleId
            ? {
                ...r,
                bindingGroupId: looseId,
                sequenceIndex: nextIndex >= 0 ? nextIndex : members.length,
              }
            : r,
        );
        let nextBindingGroups = image.bindingGroups;
        if (existingGroup && existingGroup.id !== looseId) {
          const stillUsed = nextRects.some(r => r.bindingGroupId === existingGroup.id);
          const gridUses = Object.values(image.gridGroups ?? {}).some(
            g => g.bindingGroupId === existingGroup.id,
          );
          if (!stillUsed && !gridUses) {
            nextBindingGroups = removeBindingGroup(nextBindingGroups, existingGroup.id);
          }
        }
        updatePageGridState({
          rectangles: nextRects,
          gridGroups: image.gridGroups,
          bindingGroups: nextBindingGroups ?? null,
        });
        return;
      }

      const binding = withYearMonthIndexForPage(
        createBindingGroup(source),
        image.type,
        image.bindingGroups,
        { siblingBindingGroups: siblingBindingGroups() },
      );
      const nextRects = assignRectsToBindingGroup(
        image.rectangles,
        binding.id,
        [rectangleId],
        { setSequenceFromOrder: true },
      );
      let nextBindingGroups = upsertBindingGroup(image.bindingGroups, binding);
      if (existingGroup) {
        const stillUsed = nextRects.some(
          r => r.id !== rectangleId && r.bindingGroupId === existingGroup.id,
        );
        const gridUses = Object.values(image.gridGroups ?? {}).some(
          g => g.bindingGroupId === existingGroup.id,
        );
        if (!stillUsed && !gridUses) {
          nextBindingGroups = removeBindingGroup(nextBindingGroups, existingGroup.id) ?? {};
          nextBindingGroups = upsertBindingGroup(nextBindingGroups, binding);
        }
      }
      updatePageGridState({
        rectangles: nextRects,
        gridGroups: image.gridGroups,
        bindingGroups: nextBindingGroups,
      });
    },
    [getFreshImage, updatePageGridState],
  );

  const setGroupBindingSource = useCallback(
    (bindingGroupId: string, source: BindingSourceKind) => {
      const image = getFreshImage();
      if (!image) return;
      const group = image.bindingGroups?.[bindingGroupId];
      if (!group) return;
      const nextGroup = withYearMonthIndexForPage(
        { ...group, source },
        image.type,
        image.bindingGroups,
        { siblingBindingGroups: siblingBindingGroups() },
      );
      updatePageGridState({
        rectangles: image.rectangles,
        gridGroups: image.gridGroups,
        bindingGroups: upsertBindingGroup(image.bindingGroups, nextGroup),
      });
    },
    [getFreshImage, updatePageGridState],
  );

  const setGridCalendarRole = useCallback(
    (gridGroupId: string, source: BindingSourceKind) => {
      const image = getFreshImage();
      if (!image) return;
      const grid = image.gridGroups?.[gridGroupId];
      if (!grid) return;

      const existingId = grid.bindingGroupId;
      const existing = existingId ? image.bindingGroups?.[existingId] : undefined;

      if (existing) {
        const nextGroup = withYearMonthIndexForPage(
          { ...existing, source },
          image.type,
          image.bindingGroups,
          { siblingBindingGroups: siblingBindingGroups() },
        );
        updatePageGridState({
          rectangles: image.rectangles,
          gridGroups: image.gridGroups,
          bindingGroups: upsertBindingGroup(image.bindingGroups, nextGroup),
        });
        return;
      }

      const binding = withYearMonthIndexForPage(
        createBindingGroup(source),
        image.type,
        image.bindingGroups,
        { siblingBindingGroups: siblingBindingGroups() },
      );
      const nextRects = assignRectsToBindingGroup(
        image.rectangles,
        binding.id,
        grid.rectIds,
      );
      const nextGridGroups = {
        ...image.gridGroups,
        [gridGroupId]: { ...grid, bindingGroupId: binding.id },
      };
      updatePageGridState({
        rectangles: nextRects,
        gridGroups: nextGridGroups,
        bindingGroups: upsertBindingGroup(image.bindingGroups, binding),
      });
    },
    [getFreshImage, updatePageGridState],
  );

  const groupSelectionBinding = useCallback(
    (selectedIds: string[], source: BindingSourceKind) => {
      const image = getFreshImage();
      if (!image || selectedIds.length < 1) return;

      const binding = withYearMonthIndexForPage(
        createBindingGroup(source),
        image.type,
        image.bindingGroups,
        { siblingBindingGroups: siblingBindingGroups() },
      );
      const nextRects = assignRectsToBindingGroup(
        image.rectangles,
        binding.id,
        selectedIds,
        { setSequenceFromOrder: true },
      );
      updatePageGridState({
        rectangles: nextRects,
        gridGroups: image.gridGroups,
        bindingGroups: upsertBindingGroup(image.bindingGroups, binding),
      });
    },
    [getFreshImage, updatePageGridState],
  );

  const clearSelectionBinding = useCallback(
    (selectedIds: string[]) => {
      const image = getFreshImage();
      if (!image || selectedIds.length === 0) return;
      const idSet = new Set(selectedIds);
      const clearedIds = new Set<string>();
      const nextRects: Rectangle[] = image.rectangles.map(rect => {
        if (!idSet.has(rect.id) || !rect.bindingGroupId) return rect;
        clearedIds.add(rect.bindingGroupId);
        const { bindingGroupId: _b, sequenceIndex: _s, ...rest } = rect;
        return rest;
      });

      let nextBindingGroups = image.bindingGroups;
      for (const bindingId of clearedIds) {
        const stillUsed = nextRects.some(r => r.bindingGroupId === bindingId);
        const gridUses = Object.values(image.gridGroups ?? {}).some(
          g => g.bindingGroupId === bindingId,
        );
        if (!stillUsed && !gridUses) {
          nextBindingGroups = removeBindingGroup(nextBindingGroups, bindingId);
        }
      }

      updatePageGridState({
        rectangles: nextRects,
        gridGroups: image.gridGroups,
        bindingGroups: nextBindingGroups ?? null,
      });
    },
    [getFreshImage, updatePageGridState],
  );

  return {
    setRectangleBindingSource,
    setGroupBindingSource,
    setGridCalendarRole,
    groupSelectionBinding,
    clearSelectionBinding,
  };
}
