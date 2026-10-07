import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAccountStore } from '@/stores/account';
import { useBillsStore } from '@/stores/bills';
import { useSyncStore } from '@/stores/sync';

import { supabase } from './client';
import { flushOutbox, refreshAllBills, refreshBill } from './sync-engine';

const REFRESH_DEBOUNCE_MS = 250;

// App-wide: send the outbox whenever something is queued while online, and pull all bills
// when the account comes online or the app returns to the foreground.
export function useSyncEngine(): void {
  const status = useAccountStore((state) => state.status);
  const queueLength = useSyncStore((state) => state.queue.length);

  useEffect(() => {
    if (supabase && status === 'online' && queueLength > 0) void flushOutbox(supabase);
  }, [status, queueLength]);

  useEffect(() => {
    if (!supabase || status !== 'online') return;
    const client = supabase;
    void refreshAllBills(client);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshAllBills(client);
    });
    return () => subscription.remove();
  }, [status]);
}

// Per open bill: subscribe to changes of its rows and reload it shortly after each one (F-15).
export function useBillRealtime(billId: string | undefined): void {
  const status = useAccountStore((state) => state.status);
  const online = useBillsStore((state) => {
    const bill = billId ? state.bills[billId] : undefined;
    return bill !== undefined && (bill.role === 'participant' || bill.syncedAt !== null);
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supabase || !billId || !online || status !== 'online') return;
    const client = supabase;
    const reload = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void refreshBill(client, billId), REFRESH_DEBOUNCE_MS);
    };
    // Deletes cannot be filtered by bill on the server, so check them against this bill's rows.
    const reloadIfMine = (payload: { old: Record<string, unknown> }) => {
      const bill = useBillsStore.getState().bills[billId];
      const id = payload.old.id ?? payload.old.item_id;
      if (
        bill &&
        (bill.items.some((i) => i.id === id) || bill.participants.some((p) => p.id === id))
      ) {
        reload();
      }
    };

    const filter = `bill_id=eq.${billId}`;
    const channel = client
      .channel(`bill:${billId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bills', filter: `id=eq.${billId}` },
        reload,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'participants', filter },
        reload,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'participants', filter },
        reload,
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'items', filter }, reload)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'items', filter }, reload)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'item_shares', filter },
        reload,
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'participants' },
        reloadIfMine,
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'items' }, reloadIfMine)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'item_shares' },
        reloadIfMine,
      )
      .subscribe();

    // Catch up on anything missed before the subscription started.
    reload();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      void client.removeChannel(channel);
    };
  }, [billId, online, status]);
}
