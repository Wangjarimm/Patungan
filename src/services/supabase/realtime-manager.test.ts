import { act, renderHook } from '@testing-library/react-native';

import { useAccountStore } from '@/stores/account';
import { useBillsStore } from '@/stores/bills';
import { makeBill, person } from '@/test-utils/bill';

import type { PatunganClient } from './client';
import { activeBillChannels, REFRESH_DEBOUNCE_MS } from './realtime-manager';
import { refreshBill } from './sync-engine';
import { useBillRealtime } from './use-sync';

// A stand-in for realtime-js 2.117 with the two behaviours behind the original bug:
// channel(topic) returns the existing channel for a known topic, and removeChannel() only
// drops it after the server acknowledges the leave (here: when the test calls ackRemovals).
type Handler = { filter: { event: string; table: string }; callback: (payload: unknown) => void };

class FakeChannel {
  subscribed = false;
  handlers: Handler[] = [];
  constructor(readonly topic: string) {}
  on(type: string, filter: Handler['filter'], callback: Handler['callback']) {
    if (this.subscribed) {
      throw new Error(`cannot add \`${type}\` callbacks for ${this.topic} after \`subscribe()\`.`);
    }
    this.handlers.push({ filter, callback });
    return this;
  }
  subscribe() {
    this.subscribed = true;
    return this;
  }
  emit(table: string, event: string, payload: unknown = { old: {} }) {
    for (const h of this.handlers) {
      if (h.filter.table === table && (h.filter.event === '*' || h.filter.event === event)) {
        h.callback(payload);
      }
    }
  }
}

class FakeRealtime {
  channels: FakeChannel[] = [];
  created: FakeChannel[] = [];
  private pending: FakeChannel[] = [];
  channel(topic: string) {
    const full = `realtime:${topic}`;
    const existing = this.channels.find((c) => c.topic === full);
    if (existing) return existing;
    const channel = new FakeChannel(full);
    this.channels.push(channel);
    this.created.push(channel);
    return channel;
  }
  removeChannel = jest.fn(async (channel: FakeChannel) => {
    this.pending.push(channel);
    return 'ok';
  });
  ackRemovals() {
    this.channels = this.channels.filter((c) => !this.pending.includes(c));
    this.pending = [];
  }
}

let mockRealtime: FakeRealtime;
jest.mock('./client', () => ({
  get supabase() {
    return mockRealtime;
  },
}));
jest.mock('./sync-engine', () => ({
  refreshBill: jest.fn(async () => undefined),
  flushOutbox: jest.fn(),
  refreshAllBills: jest.fn(),
}));

const mockedRefresh = jest.mocked(refreshBill);

const bill = (id: string) =>
  makeBill({
    id,
    ownerId: 'me',
    syncedAt: 1,
    participants: [person(`${id}-p`, 'Raka')],
    items: [{ id: `${id}-i`, name: 'Mie', unitPrice: 1, qty: 1, eaterIds: [] }],
  });

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockRealtime = new FakeRealtime();
  useAccountStore.setState({ status: 'online', userId: 'me' });
  useBillsStore.setState({ bills: { a: bill('a'), b: bill('b') } });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the fake behaves like realtime-js', () => {
  it('throws when callbacks are added to a reused, subscribed topic', () => {
    mockRealtime
      .channel('bill:a')
      .on('postgres_changes', { event: '*', table: 'bills' }, () => {})
      .subscribe();
    expect(() =>
      mockRealtime
        .channel('bill:a')
        .on('postgres_changes', { event: '*', table: 'bills' }, () => {}),
    ).toThrow('cannot add `postgres_changes` callbacks for realtime:bill:a after `subscribe()`.');
  });
});

describe('useBillRealtime with the shared channel manager', () => {
  it('survives open, close, and reopen before the old channel finished leaving', async () => {
    const first = await renderHook(() => useBillRealtime('a'));
    await first.unmount();
    // The leave has not been acknowledged yet, so the old channel is still registered.
    expect(mockRealtime.channels).toHaveLength(1);

    const second = await renderHook(() => useBillRealtime('a'));
    expect(mockRealtime.created).toHaveLength(2);
    expect(mockRealtime.created[0]?.topic).not.toBe(mockRealtime.created[1]?.topic);
    expect(mockRealtime.removeChannel).toHaveBeenCalledWith(mockRealtime.created[0]);
    expect(activeBillChannels()).toEqual([
      { billId: 'a', users: 1, topic: mockRealtime.created[1]?.topic },
    ]);

    mockRealtime.ackRemovals();
    await second.unmount();
    expect(mockRealtime.removeChannel).toHaveBeenCalledTimes(2);
    expect(activeBillChannels()).toEqual([]);
  });

  it('shares one channel between two screens on the same bill', async () => {
    const orderScreen = await renderHook(() => useBillRealtime('a'));
    const resultScreen = await renderHook(() => useBillRealtime('a'));
    expect(mockRealtime.created).toHaveLength(1);
    expect(activeBillChannels()[0]?.users).toBe(2);

    await resultScreen.unmount();
    expect(mockRealtime.removeChannel).not.toHaveBeenCalled();
    expect(activeBillChannels()[0]?.users).toBe(1);

    await orderScreen.unmount();
    expect(mockRealtime.removeChannel).toHaveBeenCalledTimes(1);
    expect(activeBillChannels()).toEqual([]);
  });

  it('moves to the new bill when switching bills', async () => {
    const screen = await renderHook(({ id }: { id: string }) => useBillRealtime(id), {
      initialProps: { id: 'a' },
    });
    await screen.rerender({ id: 'b' });

    expect(mockRealtime.removeChannel).toHaveBeenCalledWith(mockRealtime.created[0]);
    expect(activeBillChannels().map((c) => c.billId)).toEqual(['b']);
    expect(mockRealtime.created[1]?.topic).toMatch(/^realtime:bill:b:/);
    await screen.unmount();
    expect(activeBillChannels()).toEqual([]);
  });

  it('reloads the bill once per burst of changes, even with two screens open', async () => {
    await renderHook(() => useBillRealtime('a'));
    await renderHook(() => useBillRealtime('a'));
    await act(async () => jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS));
    mockedRefresh.mockClear();

    const channel = mockRealtime.created[0]!;
    channel.emit('items', 'UPDATE');
    channel.emit('item_shares', 'INSERT');
    channel.emit('participants', 'UPDATE');
    await act(async () => jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS));

    expect(mockedRefresh).toHaveBeenCalledTimes(1);
    expect(mockedRefresh).toHaveBeenCalledWith(mockRealtime, 'a');
  });

  it('reloads on deletes of this bill only', async () => {
    await renderHook(() => useBillRealtime('a'));
    await act(async () => jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS));
    mockedRefresh.mockClear();
    const channel = mockRealtime.created[0]!;

    channel.emit('items', 'DELETE', { old: { id: 'b-i' } });
    await act(async () => jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS));
    expect(mockedRefresh).not.toHaveBeenCalled();

    channel.emit('item_shares', 'DELETE', { old: { item_id: 'a-i', participant_id: 'a-p' } });
    await act(async () => jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS));
    expect(mockedRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe while offline or for a bill not uploaded yet', async () => {
    useAccountStore.setState({ status: 'offline' });
    await renderHook(() => useBillRealtime('a'));
    useAccountStore.setState({ status: 'online' });
    useBillsStore.setState({ bills: { c: { ...bill('c'), syncedAt: null } } });
    await renderHook(() => useBillRealtime('c'));
    expect(mockRealtime.created).toHaveLength(0);
  });

  it('subscribes once a new bill finishes uploading, without reusing a leaving channel', async () => {
    useBillsStore.setState({ bills: { c: { ...bill('c'), syncedAt: null } } });
    const screen = await renderHook(() => useBillRealtime('c'));
    expect(mockRealtime.created).toHaveLength(0);

    await act(async () => useBillsStore.getState().markSynced('c', 'MEK482'));
    expect(mockRealtime.created).toHaveLength(1);
    await screen.unmount();
  });
});
