import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { validateParticipantName, type Parsed } from '@/lib/validation';
import type { SyncErrorKind } from '@/services/supabase/errors';

// 'disabled': this build has no Supabase settings, so everything stays on the device.
export type ConnectionStatus = 'idle' | 'connecting' | 'online' | 'offline' | 'error' | 'disabled';

type AccountState = {
  // Persisted. Asked on first launch (F-12); also the default payer name.
  displayName: string | null;
  // Persisted. The anonymous account id once known, so ownership works offline too.
  userId: string | null;
  // Runtime only.
  status: ConnectionStatus;
  error: SyncErrorKind | null;
  // Bumped to ask the sync hook to try again.
  syncRequest: number;
  setDisplayName: (name: string) => Parsed<string>;
  setUserId: (userId: string) => void;
  setConnection: (status: ConnectionStatus, error?: SyncErrorKind | null) => void;
  requestSync: () => void;
};

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      displayName: null,
      userId: null,
      status: 'idle',
      error: null,
      syncRequest: 0,

      setDisplayName: (name) => {
        const valid = validateParticipantName(name, []);
        if (valid.ok) set({ displayName: valid.value });
        return valid;
      },
      setUserId: (userId) => set({ userId }),
      setConnection: (status, error = null) => set({ status, error }),
      requestSync: () => set((state) => ({ syncRequest: state.syncRequest + 1 })),
    }),
    {
      name: 'patungan-account',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ displayName: state.displayName, userId: state.userId }),
    },
  ),
);
