import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      authenticated: false,
      username:      null,

      login:  (username) => set({ authenticated: true, username }),
      logout: ()         => set({ authenticated: false, username: null }),
    }),
    { name: 'progresslog-auth' }
  )
);

export default useAuthStore;
