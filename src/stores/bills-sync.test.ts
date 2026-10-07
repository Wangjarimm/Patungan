import { makeBill, person } from '@/test-utils/bill';

import { useBillsStore } from './bills';
import { useSyncStore } from './sync';

const store = () => useBillsStore.getState();
const queued = () => useSyncStore.getState().queue.map((op) => op.kind);
const owner = { userId: 'user-1', displayName: 'Raka' };

function ok<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

beforeEach(() => {
  useBillsStore.setState({ bills: {} });
  useSyncStore.setState({ queue: [] });
});

describe('createBill online', () => {
  it('links the matching name to the account and queues the upload', () => {
    const id = ok(store().createBill({ title: 'Kedai', payerName: 'raka', owner }));
    const bill = store().bills[id]!;
    expect(bill).toMatchObject({ role: 'owner', ownerId: 'user-1', syncedAt: null });
    expect(bill.myParticipantId).toBe(bill.participants[0]?.id);
    expect(bill.participants[0]?.profileId).toBe('user-1');
    expect(queued()).toEqual(['upsertBill', 'upsertParticipant', 'setPayer']);
  });

  it('does not guess "me" when no name matches', () => {
    const id = ok(store().createBill({ title: 'Kedai', payerName: 'Dinda', owner }));
    expect(store().bills[id]?.myParticipantId).toBeNull();
    expect(store().bills[id]?.participants[0]?.profileId).toBeNull();
  });

  it('does not guess "me" when several group members could match', () => {
    const id = ok(
      store().createBill({
        title: 'Kedai',
        payerName: 'Dinda',
        owner,
        members: [
          { name: 'Dinda', color: 'c' },
          { name: 'Bima', color: 'c' },
        ],
      }),
    );
    expect(store().bills[id]?.myParticipantId).toBeNull();
  });

  it('keeps bills made without an account on the device only', () => {
    ok(store().createBill({ title: 'Kedai', payerName: 'Raka' }));
    expect(queued()).toEqual([]);
  });
});

describe('adoptLocalBills (local-to-server migration)', () => {
  it('uploads an offline bill and links the matching name', () => {
    const id = ok(store().createBill({ title: 'Kedai', payerName: 'Raka' }));
    expect(queued()).toEqual([]);
    useSyncStore.setState({ queue: [] });

    store().adoptLocalBills(owner);

    const bill = store().bills[id]!;
    expect(bill).toMatchObject({ role: 'owner', ownerId: 'user-1', syncedAt: null });
    expect(bill.myParticipantId).toBe(bill.participants[0]?.id);
    expect(bill.participants[0]?.profileId).toBe('user-1');
    expect(queued()).toEqual(['upsertBill', 'upsertParticipant', 'setPayer']);
  });

  it('adopts without linking when no name matches', () => {
    const id = ok(store().createBill({ title: 'Kedai', payerName: 'Dinda' }));
    store().adoptLocalBills(owner);
    expect(store().bills[id]).toMatchObject({ ownerId: 'user-1', myParticipantId: null });
    expect(store().bills[id]?.participants[0]?.profileId).toBeNull();
  });

  it('does not adopt or queue twice', () => {
    ok(store().createBill({ title: 'Kedai', payerName: 'Raka' }));
    store().adoptLocalBills(owner);
    useSyncStore.setState({ queue: [] });
    store().adoptLocalBills(owner);
    expect(queued()).toEqual([]);
  });
});

describe('edits queue sync operations', () => {
  function onlineBill() {
    const id = ok(store().createBill({ title: 'Kedai', payerName: 'Raka', owner }));
    useSyncStore.setState({ queue: [] });
    return id;
  }

  it('queues each kind of change', () => {
    const id = onlineBill();
    const dinda = ok(store().addParticipant(id, 'Dinda'));
    const item = ok(store().addItem(id, { name: 'Mie', unitPrice: 10000, qty: 1 }));
    store().updateItem(id, item, { name: 'Mie goreng', unitPrice: 12000, qty: 1 });
    store().toggleEater(id, item, dinda);
    store().updateSettings(id, { servicePct: 5 });
    store().markPaid(id, dinda);
    expect(queued()).toEqual([
      'upsertParticipant',
      'upsertItem',
      'addShare',
      'upsertBill',
      'setPaid',
    ]);
  });

  it('queues one share change per person for "Semua orang"', () => {
    const id = onlineBill();
    ok(store().addParticipant(id, 'Dinda'));
    const item = ok(store().addItem(id, { name: 'Es teh', unitPrice: 6000, qty: 2 }));
    useSyncStore.setState({ queue: [] });
    store().toggleAllEaters(id, item);
    expect(queued()).toEqual(['addShare', 'addShare']);
  });

  it('deletes a removed participant, then sends the new payer', () => {
    const id = onlineBill();
    const raka = store().bills[id]!.payerId!;
    ok(store().addParticipant(id, 'Dinda'));
    useSyncStore.setState({ queue: [] });
    store().removeParticipant(id, raka);
    expect(queued()).toEqual(['deleteParticipant', 'setPayer']);
    expect(store().bills[id]?.myParticipantId).toBeNull();
  });

  it('forgets a bill and its pending work', () => {
    const id = ok(store().createBill({ title: 'Kedai', payerName: 'Raka', owner }));
    store().forgetBill(id);
    expect(store().bills[id]).toBeUndefined();
    expect(queued()).toEqual([]);
  });

  it('records the join code once the server confirms', () => {
    const id = onlineBill();
    store().markSynced(id, 'MEK482');
    expect(store().bills[id]).toMatchObject({ joinCode: 'MEK482' });
    expect(store().bills[id]?.syncedAt).toEqual(expect.any(Number));
  });
});

describe('joined bills (participant role)', () => {
  const joined = makeBill({
    id: 'joined',
    role: 'participant',
    ownerId: 'someone-else',
    myParticipantId: 'me',
    payerId: 'raka',
    participants: [person('raka', 'Raka'), person('me', 'Dinda', { profileId: 'user-1' })],
    items: [{ id: 'mie', name: 'Mie', unitPrice: 10000, qty: 1, eaterIds: [] }],
  });

  beforeEach(() => store().applyRemoteBill(joined));

  it('lets me toggle only my own name and queues it', () => {
    store().toggleEater('joined', 'mie', 'me');
    store().toggleEater('joined', 'mie', 'raka');
    expect(store().bills.joined?.items[0]?.eaterIds).toEqual(['me']);
    expect(queued()).toEqual(['addShare']);
  });

  it('refuses owner-only edits', () => {
    expect(store().addItem('joined', { name: 'Es teh', unitPrice: 1, qty: 1 })).toEqual({
      ok: false,
      error: 'Hanya pembuat tagihan yang bisa mengubah ini.',
    });
    expect(store().addParticipant('joined', 'Bima').ok).toBe(false);
    store().removeItem('joined', 'mie');
    store().updateSettings('joined', { servicePct: 50 });
    store().markPaid('joined', 'me');
    store().toggleAllEaters('joined', 'mie');
    expect(store().bills.joined).toEqual(joined);
    expect(queued()).toEqual([]);
  });
});
