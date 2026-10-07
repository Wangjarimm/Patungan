// Outbox operations for syncing bills to the server (F-15). Every local change becomes a small
// operation; upserts carry only ids and read the latest local state when sent, so a burst of
// edits to one item sends it once. Pure functions only.

import type { Bill } from '@/types/bill';

export type SyncOp =
  | { kind: 'upsertBill'; billId: string }
  | { kind: 'setPayer'; billId: string }
  | { kind: 'upsertParticipant'; billId: string; participantId: string }
  | { kind: 'deleteParticipant'; billId: string; participantId: string }
  | { kind: 'setPaid'; billId: string; participantId: string }
  | { kind: 'upsertItem'; billId: string; itemId: string }
  | { kind: 'deleteItem'; billId: string; itemId: string }
  | { kind: 'addShare'; billId: string; itemId: string; participantId: string }
  | { kind: 'removeShare'; billId: string; itemId: string; participantId: string };

function shareKey(op: { itemId: string; participantId: string }): string {
  return `${op.itemId}:${op.participantId}`;
}

// Ops with the same key are interchangeable: the newest local state wins when sent.
export function opKey(op: SyncOp): string {
  switch (op.kind) {
    case 'upsertBill':
    case 'setPayer':
      return `${op.kind}:${op.billId}`;
    case 'upsertParticipant':
    case 'deleteParticipant':
    case 'setPaid':
      return `${op.kind}:${op.participantId}`;
    case 'upsertItem':
    case 'deleteItem':
      return `${op.kind}:${op.itemId}`;
    case 'addShare':
    case 'removeShare':
      return `share:${shareKey(op)}`;
  }
}

function touchesItem(op: SyncOp, itemId: string): boolean {
  return (
    (op.kind === 'upsertItem' || op.kind === 'addShare' || op.kind === 'removeShare') &&
    op.itemId === itemId
  );
}

function touchesParticipant(op: SyncOp, participantId: string): boolean {
  return (
    (op.kind === 'upsertParticipant' ||
      op.kind === 'setPaid' ||
      op.kind === 'addShare' ||
      op.kind === 'removeShare') &&
    op.participantId === participantId
  );
}

export function enqueueOp(queue: SyncOp[], op: SyncOp): SyncOp[] {
  switch (op.kind) {
    case 'deleteItem':
      // Pending writes for a deleted item are pointless; the delete covers its shares too.
      return [...queue.filter((q) => !touchesItem(q, op.itemId) && opKey(q) !== opKey(op)), op];
    case 'deleteParticipant':
      return [
        ...queue.filter((q) => !touchesParticipant(q, op.participantId) && opKey(q) !== opKey(op)),
        op,
      ];
    case 'addShare':
    case 'removeShare':
      // Only the last choice for an item and eater matters.
      return [...queue.filter((q) => opKey(q) !== opKey(op)), op];
    default:
      // Already queued: it will read the latest state when sent, so keep its earlier slot.
      return queue.some((q) => opKey(q) === opKey(op)) ? queue : [...queue, op];
  }
}

export function enqueueOps(queue: SyncOp[], ops: SyncOp[]): SyncOp[] {
  return ops.reduce(enqueueOp, queue);
}

// Uploads a whole bill in dependency order: bill, people, menu, eaters, then the payer
// (the payer must already exist on the server) and payment status.
export function opsForNewBill(bill: Bill): SyncOp[] {
  const billId = bill.id;
  return [
    { kind: 'upsertBill', billId },
    ...bill.participants.map((p) => ({
      kind: 'upsertParticipant' as const,
      billId,
      participantId: p.id,
    })),
    ...bill.items.map((i) => ({ kind: 'upsertItem' as const, billId, itemId: i.id })),
    ...bill.items.flatMap((i) =>
      i.eaterIds.map((participantId) => ({
        kind: 'addShare' as const,
        billId,
        itemId: i.id,
        participantId,
      })),
    ),
    { kind: 'setPayer', billId },
    ...bill.participants
      .filter((p) => p.paidAt !== null)
      .map((p) => ({ kind: 'setPaid' as const, billId, participantId: p.id })),
  ];
}

export function pendingBillIds(queue: SyncOp[]): Set<string> {
  return new Set(queue.map((op) => op.billId));
}
