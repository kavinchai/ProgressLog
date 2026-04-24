import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUnitStore = create(
  persist(
    (set, get) => ({
      unit: 'lbs',
      toggleUnit: () => set({ unit: get().unit === 'lbs' ? 'kg' : 'lbs' }),
    }),
    { name: 'progresslog-unit' }
  )
);

export default useUnitStore;
