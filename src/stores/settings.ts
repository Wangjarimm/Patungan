import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// F-11: follow the system by default, or force light or dark.
export type ThemePreference = 'system' | 'light' | 'dark';

type SettingsState = {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      setThemePreference: (themePreference) => set({ themePreference }),
    }),
    {
      name: 'patungan-settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ themePreference: state.themePreference }),
    },
  ),
);
