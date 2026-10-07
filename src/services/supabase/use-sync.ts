import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAccountStore } from '@/stores/account';
import { useBillsStore } from '@/stores/bills';
import { useSyncStore } from '@/stores/sync';

import { supabase } from './client';
import { acquireBillChannel } from './realtime-manager';
import { flushOutbox, refreshAllBills } from './sync-engine';

// App-wide: send the outbox whenever something is queued while online, and pull all bills
// when the account comes online or the app returns to the foreground.
export function useSyncEngine(): void {
  const status = useAccountStore((state) => state.status);
  const userId = useAccountStore((state) => state.userId);
  const displayName = useAccountStore((state) => state.displayName);
  const queueLength = useSyncStore((state) => state.queue.length);

  useEffect(() => {
    if (supabase && status === 'online' && queueLength > 0) void flushOutbox(supabase);
  }, [status, queueLength]);

  useEffect(() => {
    if (!supabase || status !== 'online') return;
    const client = supabase;
    // Upload bills made before this account existed; the queue effect then sends them.
    if (userId && displayName) {
      useBillsStore.getState().adoptLocalBills({ userId, displayName });
    }
    void refreshAllBills(client);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshAllBills(client);
    });
    return () => subscription.remove();
  }, [status, userId, displayName]);
}

// Per open screen: hold the bill's shared realtime channel while the screen is mounted (F-15).
// Several screens on one bill share a single channel; see realtime-manager.ts.
export function useBillRealtime(billId: string | undefined): void {
  const status = useAccountStore((state) => state.status);
  const online = useBillsStore((state) => {
    const bill = billId ? state.bills[billId] : undefined;
    return bill !== undefined && (bill.role === 'participant' || bill.syncedAt !== null);
  });

  useEffect(() => {
    if (!supabase || !billId || !online || status !== 'online') return;
    return acquireBillChannel(supabase, billId);
  }, [billId, online, status]);
}
