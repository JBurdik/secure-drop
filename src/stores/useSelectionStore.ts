import { create } from "zustand";
import type { Id } from "../../convex/_generated/dataModel";

export type SelectableItem =
  | { type: "file"; id: Id<"files"> }
  | { type: "folder"; id: Id<"folders"> };

interface SelectionState {
  selectedItems: Map<string, SelectableItem>;
  lastSelectedIndex: number | null;

  // Actions
  selectItem: (item: SelectableItem, index: number) => void;
  toggleItem: (item: SelectableItem, index: number) => void;
  rangeSelect: (
    items: SelectableItem[],
    fromIndex: number,
    toIndex: number
  ) => void;
  clearSelection: () => void;
  selectAll: (items: SelectableItem[]) => void;
  isSelected: (item: SelectableItem) => boolean;
  getSelectedFiles: () => Id<"files">[];
  getSelectedFolders: () => Id<"folders">[];
  getSelectedCount: () => number;
}

function itemKey(item: SelectableItem): string {
  return `${item.type}-${item.id}`;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedItems: new Map(),
  lastSelectedIndex: null,

  selectItem: (item, index) =>
    set({
      selectedItems: new Map([[itemKey(item), item]]),
      lastSelectedIndex: index,
    }),

  toggleItem: (item, index) => {
    const key = itemKey(item);
    const current = new Map(get().selectedItems);
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.set(key, item);
    }
    set({ selectedItems: current, lastSelectedIndex: index });
  },

  rangeSelect: (items, fromIndex, toIndex) => {
    const [start, end] =
      fromIndex < toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
    const selected = new Map<string, SelectableItem>();
    for (let i = start; i <= end; i++) {
      const item = items[i];
      if (item) {
        selected.set(itemKey(item), item);
      }
    }
    set({ selectedItems: selected, lastSelectedIndex: toIndex });
  },

  clearSelection: () => set({ selectedItems: new Map(), lastSelectedIndex: null }),

  selectAll: (items) => {
    const selected = new Map<string, SelectableItem>();
    items.forEach((item) => selected.set(itemKey(item), item));
    set({ selectedItems: selected });
  },

  isSelected: (item) => get().selectedItems.has(itemKey(item)),

  getSelectedFiles: () => {
    const files: Id<"files">[] = [];
    get().selectedItems.forEach((item) => {
      if (item.type === "file") files.push(item.id);
    });
    return files;
  },

  getSelectedFolders: () => {
    const folders: Id<"folders">[] = [];
    get().selectedItems.forEach((item) => {
      if (item.type === "folder") folders.push(item.id);
    });
    return folders;
  },

  getSelectedCount: () => get().selectedItems.size,
}));
