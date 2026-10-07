// One realtime channel per bill, shared by every screen showing that bill (F-15).
//
// Why a manager: realtime-js returns the existing channel when asked for a topic it already
// has, and removeChannel() only drops a channel after the server acknowledges the leave.
// Two screens on the same bill, or closing and reopening a bill quickly, would therefore get
// back an already-subscribed channel and throw "cannot add postgres_changes callbacks after
// subscribe()". So:
// - screens share one channel per bill by reference count;
// - every new channel gets a topic the client does not know yet (checked against
//   getChannels(), so a channel still leaving, or one left over from before a JS reload, is
//   never reused);
// - realtime never takes the app down: failures are logged and the bill is still reloaded the
//   normal way (on open, after edits are sent, and when the app comes back to the foreground).

import type { RealtimeChannel } from '@supabase/supabase-js';

import { useBillsStore } from '@/stores/bills';

import type { PatunganClient } from './client';
import { refreshBill } from './sync-engine';

export const REFRESH_DEBOUNCE_MS = 250;

type Entry = {
  // Null when the channel could not be created; the screen then relies on normal reloads.
  channel: RealtimeChannel | null;
  users: number;
  timer: ReturnType<typeof setTimeout> | null;
};

type ManagerState = { entries: Map<string, Entry>; generation: number };

// Kept on globalThis so a Fast Refresh of this module does not forget channels the Supabase
// client still holds.
const holder = globalThis as typeof globalThis & { __patunganRealtime?: ManagerState };
const state: ManagerState = (holder.__patunganRealtime ??= { entries: new Map(), generation: 0 });

function warn(message: string, error?: unknown): void {
  console.warn(`[realtime] ${message}`, error ?? '');
}

function scheduleRefresh(client: PatunganClient, billId: string): void {
  const entry = state.entries.get(billId);
  if (!entry) return;
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    entry.timer = null;
    void refreshBill(client, billId);
  }, REFRESH_DEBOUNCE_MS);
}

// A topic the client has no channel for, so channel() always creates a fresh one.
function freshTopic(client: PatunganClient, billId: string): string {
  const taken = new Set(client.getChannels().map((c) => c.topic));
  let topic: string;
  do {
    state.generation += 1;
    topic = `bill:${billId}:${state.generation}`;
  } while (taken.has(`realtime:${topic}`));
  return topic;
}

function openChannel(client: PatunganClient, billId: string): RealtimeChannel | null {
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

  let channel: RealtimeChannel | null = null;
  try {
    const filter = `bill_id=eq.${billId}`;
    channel = client.channel(freshTopic(client, billId));
    channel
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
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          warn(`channel for bill ${billId} reported ${status}; reloads still work`, error);
        }
      });
    return channel;
  } catch (error) {
    warn(`could not subscribe to bill ${billId}; falling back to reloads`, error);
    if (channel) void client.removeChannel(channel).catch(() => undefined);
    return null;
  }
}

// Starts (or joins) the live subscription for a bill and returns the release function to call
// when the screen closes. Never throws.
export function acquireBillChannel(client: PatunganClient, billId: string): () => void {
  let entry = state.entries.get(billId);
  const isNew = !entry;
  if (!entry) {
    entry = { channel: openChannel(client, billId), users: 0, timer: null };
    state.entries.set(billId, entry);
  }
  entry.users += 1;
  // Catch up on anything missed before this subscription started (and the fallback if the
  // channel failed).
  if (isNew) scheduleRefresh(client, billId);

  const held = entry;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    held.users -= 1;
    if (held.users > 0) return;
    if (held.timer) clearTimeout(held.timer);
    if (state.entries.get(billId) === held) state.entries.delete(billId);
    if (held.channel) {
      client.removeChannel(held.channel).catch((error: unknown) => {
        warn(`could not remove the channel for bill ${billId}`, error);
      });
    }
  };
}

// For tests and diagnostics.
export function activeBillChannels(): { billId: string; users: number; topic: string | null }[] {
  return [...state.entries].map(([billId, entry]) => ({
    billId,
    users: entry.users,
    topic: entry.channel?.topic ?? null,
  }));
}

// Tests only: forget all channels, as after a full JS reload.
export function resetBillChannelsForTests(): void {
  state.entries.clear();
}
