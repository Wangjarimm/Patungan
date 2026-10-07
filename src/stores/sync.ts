import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { enqueueOps, type SyncOp } from '@/lib/sync-ops';

type SyncState = {
  // Persisted outbox: survives a forced close and is sent once online.
  queue: SyncOp[];
  // Runtime: a message for the last change the server rejected.
  lastRejection: string | null;
  enqueue: (...ops: SyncOp[]) => void;
  // Drops the first op after it was sent (or rejected for good).
  shift: () => void;
  dropBill: (billId: string) => void;
  setRejection: (message: string | null) => void;
};

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      queue: [],
      lastRejection: null,
      enqueue: (...ops) => set((state) => ({ queue: enqueueOps(state.queue, ops) })),
      shift: () => set((state) => ({ queue: state.queue.slice(1) })),
      dropBill: (billId) =>
        set((state) => ({ queue: state.queue.filter((op) => op.billId !== billId) })),
      setRejection: (lastRejection) => set({ lastRejection }),
    }),
    {
      name: 'patungan-sync',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ queue: state.queue }),
    },
  ),
);
