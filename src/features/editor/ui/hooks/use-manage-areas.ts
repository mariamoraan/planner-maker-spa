import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { useHistoryStore } from '@/features/editor/ui/stores/history-store';
import { DEFAULT_COMPOSITE_PARTS, FieldType, Rectangle, type BindingGroup, type GridGroup } from '@/features/template';
import { getDefaultFormatVariant } from '@/features/editor/domain/services/field-style-config';
import { removeGridGroupsFullyCoveredBy } from '@/features/editor/domain/services/grid-group';
import {
  applyLayerOperation,
  type LayerOperation,
} from '@/features/editor/domain/services/layer-order';
import { computeTransferAreas } from '@/features/editor/domain/services/transfer-areas';
import { useCallback } from 'react';
import { useTemplateId } from './use-template-id';

export const useManageAreas = () => {
    const templateId = useTemplateId();
    const currentImageId = useEditorStore(state => state.currentImageId);
    const {
      addRectangle,
      updateRectangle,
      deleteRectangle,
      getCurrentImage,
      getTemplate,
      updateRectangles,
      updateImage,
      reorderRectangles,
    } = useTemplateStore();

    const selectedRectangleIds = useEditorStore(state => state.selectedRectangleIds)
    const setSelectedRectangleIds = useEditorStore(state => state.setSelectedRectangleIds)
    const pushHistory = useHistoryStore(state => state.push)
      
    const addArea = useCallback((rect: Omit<Rectangle, 'id'>, options?: { select?: boolean }) => {
        if (templateId && currentImageId) {
          const id = addRectangle(templateId, currentImageId, rect);
          pushHistory(templateId, {
            type: 'addRectangle',
            imageId: currentImageId,
            rectangle: { ...rect, id },
          });
          if (options?.select !== false) {
            setSelectedRectangleIds([id]);
          }
          return id;
        }
        return null;
    }, [templateId, currentImageId, addRectangle, setSelectedRectangleIds, pushHistory]);

    const addAreas = useCallback((rects: Omit<Rectangle, 'id'>[], options?: { select?: boolean }) => {
        const ids: string[] = [];
        if (!templateId || !currentImageId || rects.length === 0) return ids;

        const currentImage = getCurrentImage(templateId);
        const baseIndex = currentImage?.rectangles.length ?? 0;
        const created: Rectangle[] = [];

        for (let i = 0; i < rects.length; i++) {
          const rect = rects[i];
          const id = addRectangle(templateId, currentImageId, rect);
          created.push({ ...rect, id });
          ids.push(id);
        }

        if (created.length === 1) {
          pushHistory(templateId, {
            type: 'addRectangle',
            imageId: currentImageId,
            rectangle: created[0],
          });
        } else {
          pushHistory(templateId, {
            type: 'addRectangles',
            imageId: currentImageId,
            rectangles: created,
            indices: created.map((_, i) => baseIndex + i),
          });
        }

        if (options?.select !== false) {
          setSelectedRectangleIds(ids);
        }
        return ids;
    }, [templateId, currentImageId, addRectangle, setSelectedRectangleIds, getCurrentImage, pushHistory]);

    const updateArea = useCallback((id: string, updates: Partial<Rectangle>) => {
        if (templateId && currentImageId) {
          const currentImage = getCurrentImage(templateId);
          const rectangle = currentImage?.rectangles.find(r => r.id === id);
          if (!rectangle) return;

          const before: Partial<Rectangle> = {};
          (Object.keys(updates) as (keyof Rectangle)[]).forEach(key => {
            before[key] = rectangle[key] as never;
          });

          pushHistory(templateId, {
            type: 'updateRectangle',
            imageId: currentImageId,
            rectangleId: id,
            before,
            after: updates,
          });
          updateRectangle(templateId, currentImageId, id, updates);
        }
    }, [templateId, currentImageId, updateRectangle, getCurrentImage, pushHistory]);

    const updatePageGridState = useCallback(
      (
        updates: {
          rectangles: Rectangle[];
          gridGroups?: Record<string, GridGroup> | null;
          bindingGroups?: Record<string, BindingGroup> | null;
        },
        options?: { recordHistory?: boolean },
      ) => {
        if (!templateId || !currentImageId) return;

        const recordHistory = options?.recordHistory ?? true;
        if (recordHistory) {
          const currentImage = getCurrentImage(templateId);
          if (!currentImage) return;

          pushHistory(templateId, {
            type: 'updatePageGridState',
            imageId: currentImageId,
            before: {
              rectangles: structuredClone(currentImage.rectangles),
              gridGroups: currentImage.gridGroups
                ? structuredClone(currentImage.gridGroups)
                : null,
              bindingGroups: currentImage.bindingGroups
                ? structuredClone(currentImage.bindingGroups)
                : null,
            },
            after: {
              rectangles: structuredClone(updates.rectangles),
              gridGroups:
                updates.gridGroups !== undefined
                  ? updates.gridGroups
                    ? structuredClone(updates.gridGroups)
                    : null
                  : currentImage.gridGroups
                    ? structuredClone(currentImage.gridGroups)
                    : null,
              bindingGroups:
                updates.bindingGroups !== undefined
                  ? updates.bindingGroups
                    ? structuredClone(updates.bindingGroups)
                    : null
                  : currentImage.bindingGroups
                    ? structuredClone(currentImage.bindingGroups)
                    : null,
            },
          });
        }

        updateImage(templateId, currentImageId, updates);
      },
      [templateId, currentImageId, updateImage, getCurrentImage, pushHistory],
    );

    const deleteAreas = useCallback((ids: string[]) => {
        if (!templateId || !currentImageId || ids.length === 0) return;

        const currentImage = getCurrentImage(templateId);
        if (!currentImage) return;

        const toDelete = ids
          .map(id => {
            const index = currentImage.rectangles.findIndex(r => r.id === id);
            const rectangle = currentImage.rectangles[index];
            return index >= 0 && rectangle ? { rectangle: { ...rectangle }, index } : null;
          })
          .filter((entry): entry is { rectangle: Rectangle; index: number } => entry !== null);

        if (toDelete.length === 0) return;

        const deletedIds = toDelete.map(d => d.rectangle.id);
        const prunedGridGroups = removeGridGroupsFullyCoveredBy(
          deletedIds,
          currentImage.gridGroups,
        );

        if (prunedGridGroups !== null) {
          const idSet = new Set(deletedIds);
          const nextRects = currentImage.rectangles.filter(rect => !idSet.has(rect.id));
          updatePageGridState({
            rectangles: nextRects,
            gridGroups: prunedGridGroups ?? null,
          });
          setSelectedRectangleIds(
            selectedRectangleIds.filter(selectedId => !idSet.has(selectedId)),
          );
          return;
        }

        if (toDelete.length === 1) {
          pushHistory(templateId, {
            type: 'deleteRectangle',
            imageId: currentImageId,
            rectangle: toDelete[0].rectangle,
            index: toDelete[0].index,
          });
        } else {
          pushHistory(templateId, {
            type: 'deleteRectangles',
            imageId: currentImageId,
            rectangles: toDelete.map(d => d.rectangle),
            indices: toDelete.map(d => d.index),
          });
        }

        for (const id of [...deletedIds].sort((a, b) => {
          const indexA = toDelete.find(d => d.rectangle.id === a)?.index ?? 0;
          const indexB = toDelete.find(d => d.rectangle.id === b)?.index ?? 0;
          return indexB - indexA;
        })) {
          deleteRectangle(templateId, currentImageId, id);
        }

        setSelectedRectangleIds(
          selectedRectangleIds.filter(selectedId => !ids.includes(selectedId)),
        );
    }, [templateId, currentImageId, deleteRectangle, selectedRectangleIds, setSelectedRectangleIds, getCurrentImage, pushHistory, updatePageGridState]);

    const deleteArea = useCallback((id: string) => {
        deleteAreas([id]);
    }, [deleteAreas]);

    const moveAreas = useCallback((moves: { id: string; x: number; y: number }[]) => {
        if (!templateId || !currentImageId || moves.length === 0) return;

        const currentImage = getCurrentImage(templateId);
        if (!currentImage) return;

        const moveEntries = moves
          .map(move => {
            const rectangle = currentImage.rectangles.find(r => r.id === move.id);
            if (!rectangle) return null;
            return {
              id: move.id,
              before: { x: rectangle.x, y: rectangle.y },
              after: { x: move.x, y: move.y },
            };
          })
          .filter((entry): entry is { id: string; before: { x: number; y: number }; after: { x: number; y: number } } => entry !== null);

        if (moveEntries.length === 0) return;

        const hasMovement = moveEntries.some(
          entry => entry.before.x !== entry.after.x || entry.before.y !== entry.after.y,
        );
        if (!hasMovement) return;

        if (moveEntries.length === 1) {
          const entry = moveEntries[0];
          pushHistory(templateId, {
            type: 'updateRectangle',
            imageId: currentImageId,
            rectangleId: entry.id,
            before: entry.before,
            after: entry.after,
          });
          updateRectangle(templateId, currentImageId, entry.id, entry.after);
        } else {
          pushHistory(templateId, {
            type: 'moveRectangles',
            imageId: currentImageId,
            moves: moveEntries,
          });
          updateRectangles(
            templateId,
            currentImageId,
            moveEntries.map(move => ({
              rectangleId: move.id,
              changes: move.after,
            })),
          );
        }
      }, [templateId, currentImageId, updateRectangle, updateRectangles, getCurrentImage, pushHistory]);
      
    const updateAreaType = useCallback((id: string, type: FieldType) => {
        if (templateId && currentImageId) {
            const currentImage = getCurrentImage(templateId);
            const rectangle = currentImage?.rectangles.find(r => r.id === id);
            if (!rectangle) return;

            const updates: Partial<Rectangle> = {
              fieldType: type,
              formatVariant: getDefaultFormatVariant(type),
              ...(type === 'composite' && !rectangle.compositeParts?.length
                ? { compositeParts: [...DEFAULT_COMPOSITE_PARTS] }
                : {}),
            };

            pushHistory(templateId, {
              type: 'updateRectangle',
              imageId: currentImageId,
              rectangleId: id,
              before: {
                fieldType: rectangle.fieldType,
                formatVariant: rectangle.formatVariant,
                compositeParts: rectangle.compositeParts,
              },
              after: updates,
            });
            updateRectangle(templateId, currentImageId, id, updates);
        }
    }, [templateId, currentImageId, updateRectangle, getCurrentImage, pushHistory]);

    const reorderLayers = useCallback(
      (operation: LayerOperation, selectedIds: string[]) => {
        if (!templateId || !currentImageId || selectedIds.length === 0) return;

        const currentImage = getCurrentImage(templateId);
        if (!currentImage) return;

        const nextRectangles = applyLayerOperation(
          currentImage.rectangles,
          currentImage.gridGroups,
          selectedIds,
          operation,
        );
        if (!nextRectangles) return;

        const before = currentImage.rectangles.map(rect => rect.id);
        const after = nextRectangles.map(rect => rect.id);

        pushHistory(templateId, {
          type: 'reorderRectangles',
          imageId: currentImageId,
          before,
          after,
        });
        reorderRectangles(templateId, currentImageId, after);
      },
      [templateId, currentImageId, getCurrentImage, pushHistory, reorderRectangles],
    );

    const transferAreas = useCallback(
      (args: {
        fromImageId: string;
        toImageId: string;
        rectangleIds: string[];
        positions: Record<string, { x: number; y: number }>;
      }) => {
        if (!templateId) return null;
        if (args.fromImageId === args.toImageId) return null;

        const template = getTemplate(templateId);
        const fromPage = template?.images.find(img => img.id === args.fromImageId);
        const toPage = template?.images.find(img => img.id === args.toImageId);
        if (!fromPage || !toPage) return null;
        if (!fromPage.spreadId || fromPage.spreadId !== toPage.spreadId) return null;

        const result = computeTransferAreas({
          from: {
            rectangles: fromPage.rectangles,
            gridGroups: fromPage.gridGroups,
            bindingGroups: fromPage.bindingGroups,
            width: fromPage.width,
            height: fromPage.height,
            type: fromPage.type,
          },
          to: {
            rectangles: toPage.rectangles,
            gridGroups: toPage.gridGroups,
            bindingGroups: toPage.bindingGroups,
            width: toPage.width,
            height: toPage.height,
            type: toPage.type,
          },
          rectangleIds: args.rectangleIds,
          positions: args.positions,
        });
        if (!result) return null;

        const fromBefore = {
          rectangles: structuredClone(fromPage.rectangles),
          gridGroups: fromPage.gridGroups ? structuredClone(fromPage.gridGroups) : null,
          bindingGroups: fromPage.bindingGroups
            ? structuredClone(fromPage.bindingGroups)
            : null,
        };
        const toBefore = {
          rectangles: structuredClone(toPage.rectangles),
          gridGroups: toPage.gridGroups ? structuredClone(toPage.gridGroups) : null,
          bindingGroups: toPage.bindingGroups
            ? structuredClone(toPage.bindingGroups)
            : null,
        };

        pushHistory(templateId, {
          type: 'transferAreas',
          fromImageId: args.fromImageId,
          toImageId: args.toImageId,
          fromBefore,
          fromAfter: {
            rectangles: structuredClone(result.fromAfter.rectangles),
            gridGroups: result.fromAfter.gridGroups
              ? structuredClone(result.fromAfter.gridGroups)
              : null,
            bindingGroups: result.fromAfter.bindingGroups
              ? structuredClone(result.fromAfter.bindingGroups)
              : null,
          },
          toBefore,
          toAfter: {
            rectangles: structuredClone(result.toAfter.rectangles),
            gridGroups: result.toAfter.gridGroups
              ? structuredClone(result.toAfter.gridGroups)
              : null,
            bindingGroups: result.toAfter.bindingGroups
              ? structuredClone(result.toAfter.bindingGroups)
              : null,
          },
          selectedIdsAfter: result.pastedIds,
        });

        updateImage(templateId, args.fromImageId, {
          rectangles: result.fromAfter.rectangles,
          gridGroups: result.fromAfter.gridGroups ?? null,
          bindingGroups: result.fromAfter.bindingGroups ?? null,
        });
        updateImage(templateId, args.toImageId, {
          rectangles: result.toAfter.rectangles,
          gridGroups: result.toAfter.gridGroups ?? null,
          bindingGroups: result.toAfter.bindingGroups ?? null,
        });

        setSelectedRectangleIds(result.pastedIds);
        void useTemplateStore.getState().setCurrentImage(args.toImageId);

        return result.pastedIds;
      },
      [templateId, getTemplate, pushHistory, updateImage, setSelectedRectangleIds],
    );

    return {
      addArea,
      addAreas,
      updateArea,
      deleteArea,
      deleteAreas,
      moveAreas,
      updateAreaType,
      updatePageGridState,
      reorderLayers,
      transferAreas,
    }
 
}
