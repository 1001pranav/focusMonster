import { create } from 'zustand';

/**
 * Screens read the database through hooks keyed on `version`; any write bumps it so every
 * visible screen reloads.
 */
interface Store {
  version: number;
  changed(): void;
}

export const useStore = create<Store>((set) => ({
  version: 0,
  changed: () => set((s) => ({ version: s.version + 1 })),
}));

export const changed = () => useStore.getState().changed();
