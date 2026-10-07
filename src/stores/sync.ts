import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { enqueueOps, type SyncOp } from '@/lib/sync-ops';

type SyncState = {
  // Persisted outbox: survives a forced close and is sent once online.
  queue: SyncOp[];
  // Runtime: the op being sent, and a message for the last change the server rejected.
  inFlight: SyncOp | null;
  lastRejection: string | null;
  enqueue: (...ops: SyncOp[]) => void;
  setInFlight: (op: SyncOp | null) => void;
  // Drops an op after it was sent (or rejected for good).
  remove: (op: SyncOp) => void;
  dropBill: (billId: string) => void;
  setRejection: (message: string | null) => void;
};

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      queue: [],
      inFlight: null,
      lastRejection: null,
      enqueue: (...ops) =>
        set((state) => ({ queue: enqueueOps(state.queue, ops, state.inFlight) })),
      setInFlight: (inFlight) => set({ inFlight }),
      remove: (op) => set((state) => ({ queue: state.queue.filter((q) => q !== op) })),
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
