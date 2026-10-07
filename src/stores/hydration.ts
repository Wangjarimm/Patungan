import { useSyncExternalStore } from 'react';

type PersistApi = {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (listener: () => void) => () => void;
  };
};

// True once a persisted Zustand store has been loaded from AsyncStorage.
export function usePersistHydrated(store: PersistApi): boolean {
  return useSyncExternalStore(
    (onChange) => store.persist.onFinishHydration(onChange),
    () => store.persist.hasHydrated(),
  );
}
