import { create } from 'zustand';
import type { Rectangle, TemplateImage } from '@/features/template';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';

export type HistoryAction =
  | { type: 'addRectangle'; imageId: string; rectangle: Rectangle }
  | { type: 'addRectangles'; imageId: string; rectangles: Rectangle[]; indices: number[] }
  | { type: 'deleteRectangle'; imageId: string; rectangle: Rectangle; index: number }
  | { type: 'deleteRectangles'; imageId: string; rectangles: Rectangle[]; indices: number[] }
  | { type: 'moveRectangles'; imageId: string; moves: { id: string; before: { x: number; y: number }; after: { x: number; y: number } }[] }
  | {
      type: 'updateRectangle';
      imageId: string;
      rectangleId: string;
      before: Partial<Rectangle>;
      after: Partial<Rectangle>;
    }
  | {
      type: 'addImage';
      image: Omit<TemplateImage, 'src'>;
      imageData: string;
      index: number;
    }
  | {
      type: 'deleteImage';
      image: Omit<TemplateImage, 'src'>;
      imageData: string;
      index: number;
    }
  | {
      type: 'reorderImages';
      activeId: string;
      overId: string;
      fromIndex: number;
      toIndex: number;
    };

type TemplateHistory = {
  past: HistoryAction[];
  future: HistoryAction[];
};

interface HistoryState {
  histories: Record<string, TemplateHistory>;
  push: (templateId: string, action: HistoryAction) => void;
  undo: (templateId: string) => void;
  redo: (templateId: string) => void;
  canUndo: (templateId: string) => boolean;
  canRedo: (templateId: string) => boolean;
  clear: (templateId: string) => void;
}

const emptyHistory = (): TemplateHistory => ({ past: [], future: [] });

const getHistory = (
  histories: Record<string, TemplateHistory>,
  templateId: string
): TemplateHistory => histories[templateId] ?? emptyHistory();

const removeFromSelection = (ids: string[]) => {
  const store = useEditorStore.getState();
  const remaining = store.selectedRectangleIds.filter(id => !ids.includes(id));
  if (remaining.length !== store.selectedRectangleIds.length) {
    store.setSelectedRectangleIds(remaining);
  }
};

const applyAction = async (templateId: string, action: HistoryAction, direction: 'undo' | 'redo') => {
  const store = useTemplateStore.getState();

  switch (action.type) {
    case 'addRectangle': {
      if (direction === 'undo') {
        store.deleteRectangle(templateId, action.imageId, action.rectangle.id);
        removeFromSelection([action.rectangle.id]);
      } else {
        const template = store.getTemplate(templateId);
        const image = template?.images.find(img => img.id === action.imageId);
        store.insertRectangle(
          templateId,
          action.imageId,
          action.rectangle,
          image?.rectangles.length ?? 0
        );
      }
      break;
    }
    case 'addRectangles': {
      if (direction === 'undo') {
        for (const rectangle of action.rectangles) {
          store.deleteRectangle(templateId, action.imageId, rectangle.id);
        }
        removeFromSelection(action.rectangles.map(r => r.id));
      } else {
        const sorted = action.rectangles
          .map((rectangle, i) => ({ rectangle, index: action.indices[i] }))
          .sort((a, b) => a.index - b.index);
        for (const entry of sorted) {
          store.insertRectangle(templateId, action.imageId, entry.rectangle, entry.index);
        }
      }
      break;
    }
    case 'deleteRectangle': {
      if (direction === 'undo') {
        store.insertRectangle(templateId, action.imageId, action.rectangle, action.index);
      } else {
        store.deleteRectangle(templateId, action.imageId, action.rectangle.id);
        removeFromSelection([action.rectangle.id]);
      }
      break;
    }
    case 'deleteRectangles': {
      if (direction === 'undo') {
        const sorted = action.rectangles
          .map((rectangle, i) => ({ rectangle, index: action.indices[i] }))
          .sort((a, b) => a.index - b.index);
        for (const entry of sorted) {
          store.insertRectangle(templateId, action.imageId, entry.rectangle, entry.index);
        }
      } else {
        for (const rectangle of action.rectangles) {
          store.deleteRectangle(templateId, action.imageId, rectangle.id);
        }
        removeFromSelection(action.rectangles.map(r => r.id));
      }
      break;
    }
    case 'moveRectangles': {
      store.updateRectangles(
        templateId,
        action.imageId,
        action.moves.map(move => ({
          rectangleId: move.id,
          changes: direction === 'undo' ? move.before : move.after,
        })),
      );
      break;
    }
    case 'updateRectangle': {
      const updates = direction === 'undo' ? action.before : action.after;
      store.updateRectangle(templateId, action.imageId, action.rectangleId, updates);
      break;
    }
    case 'addImage': {
      if (direction === 'undo') {
        await store.deleteImage(templateId, action.image.id);
      } else {
        await store.insertImage(
          templateId,
          { ...action.image, src: action.imageData },
          action.imageData,
          action.index
        );
      }
      break;
    }
    case 'deleteImage': {
      if (direction === 'undo') {
        await store.insertImage(
          templateId,
          { ...action.image, src: action.imageData },
          action.imageData,
          action.index
        );
      } else {
        await store.deleteImage(templateId, action.image.id);
      }
      break;
    }
    case 'reorderImages': {
      const fromIndex = direction === 'undo' ? action.toIndex : action.fromIndex;
      const toIndex = direction === 'undo' ? action.fromIndex : action.toIndex;
      const template = store.getTemplate(templateId);
      if (!template) break;

      const activeId = template.images[fromIndex]?.id;
      const overId = template.images[toIndex]?.id;
      if (activeId && overId) {
        store.reorderImages(templateId, activeId, overId);
      }
      break;
    }
  }
};

export const useHistoryStore = create<HistoryState>((set, get) => ({
  histories: {},

  push: (templateId, action) => {
    set(state => {
      const current = getHistory(state.histories, templateId);
      return {
        histories: {
          ...state.histories,
          [templateId]: {
            past: [...current.past, action],
            future: [],
          },
        },
      };
    });
  },

  undo: (templateId) => {
    const { histories } = get();
    const current = getHistory(histories, templateId);
    if (current.past.length === 0) return;

    const action = current.past[current.past.length - 1];
    const past = current.past.slice(0, -1);
    const future = [action, ...current.future];

    set({
      histories: {
        ...histories,
        [templateId]: { past, future },
      },
    });

    void applyAction(templateId, action, 'undo');
  },

  redo: (templateId) => {
    const { histories } = get();
    const current = getHistory(histories, templateId);
    if (current.future.length === 0) return;

    const action = current.future[0];
    const future = current.future.slice(1);
    const past = [...current.past, action];

    set({
      histories: {
        ...histories,
        [templateId]: { past, future },
      },
    });

    void applyAction(templateId, action, 'redo');
  },

  canUndo: (templateId) => getHistory(get().histories, templateId).past.length > 0,

  canRedo: (templateId) => getHistory(get().histories, templateId).future.length > 0,

  clear: (templateId) => {
    set(state => {
      const { [templateId]: _, ...rest } = state.histories;
      return { histories: rest };
    });
  },
}));
