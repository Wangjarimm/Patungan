import AsyncStorage from '@react-native-async-storage/async-storage';

import { avatarColors } from '@/theme/colors';

import { migrateBillsState, useBillsStore } from './bills';

let mockNextId = 0;
jest.mock('@/lib/id', () => ({ createId: () => `id-${++mockNextId}` }));

const store = () => useBillsStore.getState();

function createKenari() {
  const created = store().createBill({
    title: '  Kedai Mie Kenari ',
    date: '2026-10-03',
    payerName: 'Raka',
  });
  if (!created.ok) throw new Error(created.error);
  return created.value;
}

function bill(id: string) {
  const found = store().bills[id];
  if (!found) throw new Error('bill missing');
  return found;
}

function ok<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

beforeEach(async () => {
  mockNextId = 0;
  useBillsStore.setState({ bills: {} });
  await AsyncStorage.clear();
});

describe('createBill (F-01)', () => {
  it('creates a bill with the payer as first participant', () => {
    const id = createKenari();
    const b = bill(id);
    expect(b.title).toBe('Kedai Mie Kenari');
    expect(b.date).toBe('2026-10-03');
    expect(b.participants).toHaveLength(1);
    expect(b.participants[0]?.name).toBe('Raka');
    expect(b.payerId).toBe(b.participants[0]?.id);
    expect(b.settings.roundingStep).toBe(100);
  });

  it('rejects an empty title', () => {
    const result = store().createBill({ title: ' ', payerName: 'Raka' });
    expect(result.ok).toBe(false);
    expect(store().bills).toEqual({});
  });

  it('rejects an empty payer name', () => {
    expect(store().createBill({ title: 'Kedai', payerName: '' }).ok).toBe(false);
  });

  it('defaults the date to today', () => {
    const id = ok(store().createBill({ title: 'Kedai', payerName: 'Raka' }));
    expect(bill(id).date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('participants (F-02)', () => {
  it('assigns avatar colors automatically', () => {
    const id = createKenari();
    ok(store().addParticipant(id, 'Dinda'));
    ok(store().addParticipant(id, 'Bima'));
    expect(bill(id).participants.map((p) => p.color)).toEqual(avatarColors.slice(0, 3));
  });

  it('rejects duplicate names', () => {
    const id = createKenari();
    expect(store().addParticipant(id, 'raka').ok).toBe(false);
    expect(bill(id).participants).toHaveLength(1);
  });

  it('renames, rejecting a name taken by someone else', () => {
    const id = createKenari();
    const dinda = ok(store().addParticipant(id, 'Dinda'));
    expect(store().renameParticipant(id, dinda, 'Raka').ok).toBe(false);
    ok(store().renameParticipant(id, dinda, 'Dinda Putri'));
    expect(bill(id).participants[1]?.name).toBe('Dinda Putri');
  });

  it('removing a participant detaches them from every item', () => {
    const id = createKenari();
    const dinda = ok(store().addParticipant(id, 'Dinda'));
    const item = ok(store().addItem(id, { name: 'Es teh', unitPrice: 6000, qty: 2 }));
    store().toggleAllEaters(id, item);
    store().removeParticipant(id, dinda);
    expect(bill(id).participants.map((p) => p.name)).toEqual(['Raka']);
    expect(bill(id).items[0]?.eaterIds).not.toContain(dinda);
  });

  it('moves the payer role when the payer is removed', () => {
    const id = createKenari();
    const raka = bill(id).payerId ?? '';
    const dinda = ok(store().addParticipant(id, 'Dinda'));
    store().removeParticipant(id, raka);
    expect(bill(id).payerId).toBe(dinda);
    store().removeParticipant(id, dinda);
    expect(bill(id).payerId).toBeNull();
  });

  it('only sets a payer who is in the bill', () => {
    const id = createKenari();
    const dinda = ok(store().addParticipant(id, 'Dinda'));
    store().setPayer(id, dinda);
    expect(bill(id).payerId).toBe(dinda);
    store().setPayer(id, 'stranger');
    expect(bill(id).payerId).toBe(dinda);
  });
});

describe('items (F-03, F-04)', () => {
  it('adds, updates, and removes items', () => {
    const id = createKenari();
    const item = ok(store().addItem(id, { name: ' Mie goreng ', unitPrice: 32000, qty: 2 }));
    expect(bill(id).items[0]).toMatchObject({ name: 'Mie goreng', unitPrice: 32000, qty: 2 });
    ok(store().updateItem(id, item, { name: 'Mie goreng spesial', unitPrice: 33000, qty: 1 }));
    expect(bill(id).items[0]).toMatchObject({ name: 'Mie goreng spesial', unitPrice: 33000 });
    store().removeItem(id, item);
    expect(bill(id).items).toEqual([]);
  });

  it('rejects an item without a name', () => {
    const id = createKenari();
    expect(store().addItem(id, { name: '', unitPrice: 1000, qty: 1 }).ok).toBe(false);
  });

  it('clamps price and quantity into the allowed range', () => {
    const id = createKenari();
    ok(store().addItem(id, { name: 'x', unitPrice: 200_000_000, qty: 0 }));
    expect(bill(id).items[0]).toMatchObject({ unitPrice: 100_000_000, qty: 1 });
  });

  it('toggles single eaters and everyone', () => {
    const id = createKenari();
    const raka = bill(id).payerId ?? '';
    const dinda = ok(store().addParticipant(id, 'Dinda'));
    const item = ok(store().addItem(id, { name: 'Es teh', unitPrice: 6000, qty: 2 }));

    store().toggleEater(id, item, dinda);
    expect(bill(id).items[0]?.eaterIds).toEqual([dinda]);
    store().toggleEater(id, item, dinda);
    expect(bill(id).items[0]?.eaterIds).toEqual([]);

    store().toggleAllEaters(id, item);
    expect(bill(id).items[0]?.eaterIds).toEqual([raka, dinda]);
    store().toggleAllEaters(id, item);
    expect(bill(id).items[0]?.eaterIds).toEqual([]);
  });
});

describe('settings (F-05)', () => {
  it('merges and sanitizes settings', () => {
    const id = createKenari();
    store().updateSettings(id, { servicePct: 5, taxPct: 120, extraFee: -10, roundingStep: 1000 });
    expect(bill(id).settings).toMatchObject({
      servicePct: 5,
      taxPct: 100,
      extraFee: 0,
      roundingStep: 1000,
    });
    store().updateSettings(id, { discountType: 'percent', discountValue: 150 });
    expect(bill(id).settings.discountValue).toBe(100);
  });
});

describe('persistence (F-08)', () => {
  it('writes bills to AsyncStorage and restores them', async () => {
    const id = createKenari();
    ok(store().addItem(id, { name: 'Es teh', unitPrice: 6000, qty: 5 }));

    const raw = await AsyncStorage.getItem('patungan-bills');
    expect(raw).toContain('Kedai Mie Kenari');

    // Simulate an app restart: memory is empty, storage still holds the saved data.
    useBillsStore.setState({ bills: {} });
    await AsyncStorage.setItem('patungan-bills', raw ?? '');
    expect(store().bills).toEqual({});
    await useBillsStore.persist.rehydrate();
    expect(bill(id).items[0]?.name).toBe('Es teh');
  });
});

describe('manual payment status', () => {
  it('marks and unmarks a participant as paid', () => {
    const id = createKenari();
    const dinda = ok(store().addParticipant(id, 'Dinda'));
    expect(bill(id).participants[1]?.paidAt).toBeNull();

    store().markPaid(id, dinda);
    const paidAt = bill(id).participants[1]?.paidAt;
    expect(typeof paidAt).toBe('number');

    // Marking again keeps the original time.
    store().markPaid(id, dinda);
    expect(bill(id).participants[1]?.paidAt).toBe(paidAt);

    store().unmarkPaid(id, dinda);
    expect(bill(id).participants[1]?.paidAt).toBeNull();
  });

  it('never marks the payer', () => {
    const id = createKenari();
    store().markPaid(id, bill(id).payerId ?? '');
    expect(bill(id).participants[0]?.paidAt).toBeNull();
  });
});

describe('migrateBillsState', () => {
  const v1Bill = {
    id: 'b1',
    title: 'Kedai',
    date: '2026-10-03',
    payerId: 'p1',
    createdAt: 0,
    participants: [{ id: 'p1', name: 'Raka', color: 'c' }],
    items: [],
    settings: {},
  };

  const onlineFields = {
    role: 'owner',
    ownerId: null,
    joinCode: null,
    myParticipantId: null,
    syncedAt: null,
  };

  it('upgrades v1 bills: payment status and online fields', () => {
    const migrated = migrateBillsState({ bills: { b1: v1Bill } }, 1);
    expect(migrated.bills.b1?.participants[0]).toEqual({
      id: 'p1',
      name: 'Raka',
      color: 'c',
      paidAt: null,
      profileId: null,
    });
    expect(migrated.bills.b1).toMatchObject({ title: 'Kedai', ...onlineFields });
  });

  it('upgrades v2 bills as device-only bills, keeping payment status', () => {
    const v2Bill = { ...v1Bill, participants: [{ id: 'p1', name: 'Raka', color: 'c', paidAt: 7 }] };
    const migrated = migrateBillsState({ bills: { b1: v2Bill } }, 2);
    expect(migrated.bills.b1).toMatchObject(onlineFields);
    expect(migrated.bills.b1?.participants[0]).toMatchObject({ paidAt: 7, profileId: null });
  });

  it('leaves current data untouched and handles empty state', () => {
    const current = { bills: { b1: { ...v1Bill, ...onlineFields, participants: [] } } };
    expect(migrateBillsState(current, 3)).toEqual(current);
    expect(migrateBillsState(undefined, 1)).toEqual({ bills: {} });
  });

  it('restores v1 data saved by app 0.1.0', async () => {
    await AsyncStorage.setItem(
      'patungan-bills',
      JSON.stringify({ state: { bills: { b1: v1Bill } }, version: 1 }),
    );
    await useBillsStore.persist.rehydrate();
    expect(bill('b1').participants[0]?.paidAt).toBeNull();
  });
});
