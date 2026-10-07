import { useAccountStore } from '@/stores/account';
import { useBillsStore } from '@/stores/bills';
import { useSyncStore } from '@/stores/sync';
import { makeBill, person } from '@/test-utils/bill';

import { fetchBill, fetchMemberBillIds, sendOp } from './bills-api';
import type { PatunganClient } from './client';
import { flushOutbox, refreshAllBills, refreshBill } from './sync-engine';

jest.mock('./bills-api', () => ({
  sendOp: jest.fn(),
  fetchBill: jest.fn(),
  fetchMemberBillIds: jest.fn(),
}));

const mockedSend = jest.mocked(sendOp);
const mockedFetch = jest.mocked(fetchBill);
const mockedIds = jest.mocked(fetchMemberBillIds);
const client = {} as PatunganClient;

const own = makeBill({
  id: 'own',
  ownerId: 'me',
  participants: [person('p1', 'Raka', { profileId: 'me' })],
});
const joined = makeBill({ id: 'joined', role: 'participant', ownerId: 'other' });

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  useAccountStore.setState({ userId: 'me', status: 'online' });
  useBillsStore.setState({ bills: { own, joined } });
  useSyncStore.setState({ queue: [], inFlight: null, lastRejection: null });
  mockedFetch.mockResolvedValue({ status: 'failed' });
});

afterEach(() => jest.useRealTimers());

const queue = () => useSyncStore.getState().queue;

describe('flushOutbox', () => {
  it('sends ops in order, records the join code, then reloads the bill', async () => {
    useSyncStore
      .getState()
      .enqueue(
        { kind: 'upsertBill', billId: 'own' },
        { kind: 'upsertParticipant', billId: 'own', participantId: 'p1' },
      );
    mockedSend.mockResolvedValueOnce({ status: 'done', joinCode: 'MEK482' });
    mockedSend.mockResolvedValueOnce({ status: 'done' });

    await flushOutbox(client);

    expect(mockedSend.mock.calls.map(([, op]) => op.kind)).toEqual([
      'upsertBill',
      'upsertParticipant',
    ]);
    expect(queue()).toEqual([]);
    expect(useBillsStore.getState().bills.own?.joinCode).toBe('MEK482');
    expect(mockedFetch).toHaveBeenCalledWith(client, 'own', 'me');
  });

  it('stops and keeps the queue when offline, retrying later', async () => {
    useSyncStore.getState().enqueue({ kind: 'upsertBill', billId: 'own' });
    mockedSend.mockResolvedValueOnce({ status: 'retry' });

    await flushOutbox(client);
    expect(queue()).toHaveLength(1);
    expect(mockedFetch).not.toHaveBeenCalled();

    mockedSend.mockResolvedValueOnce({ status: 'done' });
    await jest.advanceTimersByTimeAsync(5000);
    expect(queue()).toEqual([]);
  });

  it('drops a rejected change, tells the user, and reloads the server copy', async () => {
    useSyncStore.getState().enqueue({ kind: 'upsertItem', billId: 'own', itemId: 'x' });
    mockedSend.mockResolvedValueOnce({ status: 'rejected', message: 'rls' });
    const server = { ...own, title: 'Versi server' };
    mockedFetch.mockResolvedValueOnce({ status: 'ok', bill: server });

    await flushOutbox(client);

    expect(queue()).toEqual([]);
    expect(useSyncStore.getState().lastRejection).toMatch(/ditolak server/);
    expect(useBillsStore.getState().bills.own?.title).toBe('Versi server');
  });

  it('waits for an account before sending', async () => {
    useAccountStore.setState({ userId: null });
    useSyncStore.getState().enqueue({ kind: 'upsertBill', billId: 'own' });
    await flushOutbox(client);
    expect(mockedSend).not.toHaveBeenCalled();
  });
});

describe('refreshBill', () => {
  it('applies the server copy', async () => {
    mockedFetch.mockResolvedValueOnce({ status: 'ok', bill: { ...joined, title: 'Baru' } });
    await refreshBill(client, 'joined');
    expect(useBillsStore.getState().bills.joined?.title).toBe('Baru');
  });

  it('never overwrites local changes that are still waiting to be sent', async () => {
    useSyncStore.getState().enqueue({ kind: 'upsertBill', billId: 'own' });
    await refreshBill(client, 'own');
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('forgets a joined bill this account can no longer see, but never its own', async () => {
    mockedFetch.mockResolvedValue({ status: 'missing' });
    await refreshBill(client, 'joined');
    await refreshBill(client, 'own');
    expect(useBillsStore.getState().bills.joined).toBeUndefined();
    expect(useBillsStore.getState().bills.own).toBeDefined();
  });

  it('keeps everything when the fetch fails', async () => {
    await refreshBill(client, 'joined');
    expect(useBillsStore.getState().bills.joined).toEqual(joined);
  });
});

describe('refreshAllBills', () => {
  it('reloads every bill the account belongs to and drops joined bills it left', async () => {
    mockedIds.mockResolvedValueOnce(['own']);
    await refreshAllBills(client);
    expect(mockedFetch).toHaveBeenCalledWith(client, 'own', 'me');
    expect(useBillsStore.getState().bills.joined).toBeUndefined();
  });

  it('does nothing when the list cannot be loaded', async () => {
    mockedIds.mockResolvedValueOnce(null);
    await refreshAllBills(client);
    expect(useBillsStore.getState().bills.joined).toBeDefined();
  });
});
