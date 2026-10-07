import type { Bill } from '@/types/bill';

import { enqueueOps, opKey, opsForNewBill, pendingBillIds, type SyncOp } from './sync-ops';

const B = 'bill-1';
const upsertItem = (itemId: string): SyncOp => ({ kind: 'upsertItem', billId: B, itemId });
const addShare = (itemId: string, participantId: string): SyncOp => ({
  kind: 'addShare',
  billId: B,
  itemId,
  participantId,
});
const removeShare = (itemId: string, participantId: string): SyncOp => ({
  kind: 'removeShare',
  billId: B,
  itemId,
  participantId,
});

describe('enqueueOp', () => {
  it('keeps one upsert per entity in its first position', () => {
    const queue = enqueueOps([], [upsertItem('a'), upsertItem('b'), upsertItem('a')]);
    expect(queue).toEqual([upsertItem('a'), upsertItem('b')]);
  });

  it('keeps only the latest eater choice for an item and person', () => {
    const queue = enqueueOps([], [addShare('a', 'p'), addShare('a', 'q'), removeShare('a', 'p')]);
    expect(queue).toEqual([addShare('a', 'q'), removeShare('a', 'p')]);
  });

  it('drops pending writes for an item that is deleted', () => {
    const queue = enqueueOps(
      [],
      [
        upsertItem('a'),
        addShare('a', 'p'),
        upsertItem('b'),
        { kind: 'deleteItem', billId: B, itemId: 'a' },
      ],
    );
    expect(queue).toEqual([upsertItem('b'), { kind: 'deleteItem', billId: B, itemId: 'a' }]);
  });

  it('drops pending writes for a participant who is removed', () => {
    const queue = enqueueOps(
      [],
      [
        { kind: 'upsertParticipant', billId: B, participantId: 'p' },
        addShare('a', 'p'),
        { kind: 'setPaid', billId: B, participantId: 'p' },
        addShare('a', 'q'),
        { kind: 'deleteParticipant', billId: B, participantId: 'p' },
      ],
    );
    expect(queue).toEqual([
      addShare('a', 'q'),
      { kind: 'deleteParticipant', billId: B, participantId: 'p' },
    ]);
  });

  it('queues a new change even when the same row is being sent right now', () => {
    const sending = upsertItem('a');
    const queue = enqueueOps([sending], [upsertItem('a')], sending);
    expect(queue).toHaveLength(2);
    expect(queue[1]).toEqual(upsertItem('a'));
    expect(queue[1]).not.toBe(sending);
  });

  it('does not duplicate a repeated delete', () => {
    const del: SyncOp = { kind: 'deleteItem', billId: B, itemId: 'a' };
    expect(enqueueOps([], [del, del])).toEqual([del]);
  });
});

describe('opKey', () => {
  it('groups add and remove of the same eater', () => {
    expect(opKey(addShare('a', 'p'))).toBe(opKey(removeShare('a', 'p')));
    expect(opKey(upsertItem('a'))).not.toBe(opKey({ kind: 'deleteItem', billId: B, itemId: 'a' }));
  });

  it.each([
    [{ kind: 'upsertBill', billId: B }, 'upsertBill:bill-1'],
    [{ kind: 'setPayer', billId: B }, 'setPayer:bill-1'],
    [{ kind: 'upsertParticipant', billId: B, participantId: 'p' }, 'upsertParticipant:p'],
    [{ kind: 'setPaid', billId: B, participantId: 'p' }, 'setPaid:p'],
  ] as const)('%p -> %s', (op, key) => {
    expect(opKey(op)).toBe(key);
  });
});

describe('opsForNewBill', () => {
  const bill: Bill = {
    id: B,
    title: 'Kedai',
    date: '2026-10-03',
    payerId: 'p',
    createdAt: 0,
    role: 'owner',
    ownerId: 'u1',
    joinCode: null,
    myParticipantId: 'p',
    syncedAt: null,
    participants: [
      { id: 'p', name: 'Raka', color: 'c', paidAt: null, profileId: 'u1' },
      { id: 'q', name: 'Dinda', color: 'c', paidAt: 5, profileId: null },
    ],
    items: [{ id: 'a', name: 'Mie', unitPrice: 1000, qty: 1, eaterIds: ['p', 'q'] }],
    settings: {
      servicePct: 0,
      taxPct: 0,
      taxAfterService: true,
      discountType: 'amount',
      discountValue: 0,
      extraFee: 0,
      roundingStep: 100,
    },
  };

  it('uploads in dependency order with the payer after the people', () => {
    expect(opsForNewBill(bill).map((op) => op.kind)).toEqual([
      'upsertBill',
      'upsertParticipant',
      'upsertParticipant',
      'upsertItem',
      'addShare',
      'addShare',
      'setPayer',
      'setPaid',
    ]);
  });

  it('lists the bills with pending work', () => {
    expect(pendingBillIds(opsForNewBill(bill))).toEqual(new Set([B]));
  });
});
