// Moves bills between this device and the server: sends the outbox in order and pulls fresh
// copies of bills. Local edits always win until they are confirmed (F-15, offline NFR).

import { pendingBillIds } from '@/lib/sync-ops';
import { useAccountStore } from '@/stores/account';
import { useBillsStore } from '@/stores/bills';
import { useSyncStore } from '@/stores/sync';

import { fetchBill, fetchMemberBillIds, sendOp } from './bills-api';
import type { PatunganClient } from './client';

const REJECTED_MESSAGE =
  'Sebagian perubahan ditolak server dan dibatalkan. Tagihan dimuat ulang dari server.';
const RETRY_DELAY_MS = 5000;

let flushing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function hasPending(billId: string): boolean {
  const { queue, inFlight } = useSyncStore.getState();
  return pendingBillIds(queue).has(billId) || inFlight?.billId === billId;
}

// Pulls the server copy of one bill unless local changes for it are still waiting to be sent.
export async function refreshBill(client: PatunganClient, billId: string): Promise<void> {
  const userId = useAccountStore.getState().userId;
  if (!userId || hasPending(billId)) return;
  const result = await fetchBill(client, billId, userId);
  if (hasPending(billId)) return;
  const bills = useBillsStore.getState();
  if (result.status === 'ok') {
    bills.applyRemoteBill(result.bill);
  } else if (result.status === 'missing') {
    // Lost access to a joined bill (removed by the owner). Own bills are never dropped here.
    if (bills.bills[billId]?.role === 'participant') bills.forgetBill(billId);
  }
}

// Sends queued operations one by one, in order, until the queue is empty or the network fails.
export async function flushOutbox(client: PatunganClient): Promise<void> {
  if (flushing) return;
  flushing = true;
  const touched = new Set<string>();
  let rejected = false;
  try {
    for (;;) {
      const sync = useSyncStore.getState();
      const op = sync.queue[0];
      const userId = useAccountStore.getState().userId;
      if (!op || !userId) break;

      sync.setInFlight(op);
      const bill = useBillsStore.getState().bills[op.billId];
      const result = await sendOp(client, op, bill, userId);
      useSyncStore.getState().setInFlight(null);

      if (result.status === 'retry') {
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(() => void flushOutbox(client), RETRY_DELAY_MS);
        break;
      }
      useSyncStore.getState().remove(op);
      touched.add(op.billId);
      if (result.status === 'done' && op.kind === 'upsertBill') {
        useBillsStore.getState().markSynced(op.billId, result.joinCode);
      }
      if (result.status === 'rejected') rejected = true;
    }
  } finally {
    flushing = false;
  }

  if (rejected) useSyncStore.getState().setRejection(REJECTED_MESSAGE);
  // Reload bills whose changes are all confirmed: picks up server-side fixes and rejections.
  for (const billId of touched) {
    if (!hasPending(billId)) await refreshBill(client, billId);
  }
}

// Brings every bill this account belongs to up to date, e.g. after coming online.
export async function refreshAllBills(client: PatunganClient): Promise<void> {
  const ids = await fetchMemberBillIds(client);
  if (!ids) return;
  const remote = new Set(ids);
  const { bills, forgetBill } = useBillsStore.getState();
  for (const bill of Object.values(bills)) {
    if (bill.role === 'participant' && !remote.has(bill.id) && !hasPending(bill.id)) {
      forgetBill(bill.id);
    }
  }
  await Promise.all(ids.map((id) => refreshBill(client, id)));
}
