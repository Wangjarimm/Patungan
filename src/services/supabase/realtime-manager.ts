// One realtime channel per bill, shared by every screen showing that bill (F-15).
//
// Why a manager: realtime-js returns the existing channel when asked for a topic it already
// has, and removeChannel() only drops a channel after the server acknowledges the leave.
// Two screens on the same bill, or closing and reopening a bill quickly, would therefore get
// back an already-subscribed channel and throw "cannot add postgres_changes callbacks after
// subscribe()". Here screens share one channel by reference count, and every new channel gets
// a unique topic so a channel that is still leaving is never reused.

import type { RealtimeChannel } from '@supabase/supabase-js';

import { useBillsStore } from '@/stores/bills';

import type { PatunganClient } from './client';
import { refreshBill } from './sync-engine';

export const REFRESH_DEBOUNCE_MS = 250;

type Entry = {
  channel: RealtimeChannel;
  users: number;
  timer: ReturnType<typeof setTimeout> | null;
};

const entries = new Map<string, Entry>();
let generation = 0;

function scheduleRefresh(client: PatunganClient, billId: string): void {
  const entry = entries.get(billId);
  if (!entry) return;
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    entry.timer = null;
    void refreshBill(client, billId);
  }, REFRESH_DEBOUNCE_MS);
}

function open(client: PatunganClient, billId: string): Entry {
  generation += 1;
  const reload = () => scheduleRefresh(client, billId);
  // Deletes cannot be filtered by bill on the server, so match them to this bill's rows.
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
    .channel(`bill:${billId}:${generation}`)
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

  return { channel, users: 0, timer: null };
}

// Starts (or joins) the live subscription for a bill. Returns the release function; call it
// when the screen closes. The channel is removed when the last screen lets go.
export function acquireBillChannel(client: PatunganClient, billId: string): () => void {
  let entry = entries.get(billId);
  const isNew = !entry;
  if (!entry) {
    entry = open(client, billId);
    entries.set(billId, entry);
  }
  entry.users += 1;
  // Catch up on anything missed before this subscription started.
  if (isNew) scheduleRefresh(client, billId);

  const held = entry;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    held.users -= 1;
    if (held.users > 0) return;
    if (held.timer) clearTimeout(held.timer);
    if (entries.get(billId) === held) entries.delete(billId);
    void client.removeChannel(held.channel);
  };
}

// For tests and diagnostics.
export function activeBillChannels(): { billId: string; users: number; topic: string }[] {
  return [...entries].map(([billId, entry]) => ({
    billId,
    users: entry.users,
    topic: entry.channel.topic,
  }));
}
