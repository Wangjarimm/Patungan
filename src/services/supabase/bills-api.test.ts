import type { SyncOp } from '@/lib/sync-ops';
import { makeBill, person } from '@/test-utils/bill';

import { claimName, joinErrorMessage, joinWithNewName, previewJoin, sendOp } from './bills-api';
import type { PatunganClient } from './client';
import { avatarColors } from '@/theme/colors';

type Call = { table: string; method: string; args: unknown[]; filters: [string, unknown][] };

// Records every query builder call and resolves with `result`.
function fakeClient(result: { data?: unknown; error?: unknown } = {}) {
  const calls: Call[] = [];
  const response = { data: result.data ?? null, error: result.error ?? null };
  const client = {
    from: (table: string) => {
      const call: Call = { table, method: '', args: [], filters: [] };
      calls.push(call);
      const builder = {
        upsert: (...args: unknown[]) => ((call.method = 'upsert'), (call.args = args), builder),
        update: (...args: unknown[]) => ((call.method = 'update'), (call.args = args), builder),
        delete: () => ((call.method = 'delete'), builder),
        select: () => builder,
        single: () => builder,
        eq: (column: string, value: unknown) => (call.filters.push([column, value]), builder),
        then: (resolve: (value: typeof response) => unknown) =>
          Promise.resolve(response).then(resolve),
      };
      return builder;
    },
    rpc: jest.fn(async () => response),
  } as unknown as PatunganClient;
  return { client, calls };
}

const bill = makeBill({
  id: 'b1',
  payerId: 'p1',
  participants: [person('p1', 'Raka'), person('p2', 'Dinda', { paidAt: 1000 })],
  items: [{ id: 'i1', name: 'Mie', unitPrice: 10000, qty: 1, eaterIds: ['p1'] }],
});

describe('sendOp', () => {
  it('upserts the bill and returns the join code', async () => {
    const { client, calls } = fakeClient({ data: { join_code: 'MEK482' } });
    const result = await sendOp(client, { kind: 'upsertBill', billId: 'b1' }, bill, 'me');
    expect(result).toEqual({ status: 'done', joinCode: 'MEK482' });
    expect(calls[0]).toMatchObject({ table: 'bills', method: 'upsert' });
  });

  it.each<[SyncOp, Partial<Call>]>([
    [
      { kind: 'setPayer', billId: 'b1' },
      { table: 'bills', method: 'update', filters: [['id', 'b1']] },
    ],
    [
      { kind: 'upsertParticipant', billId: 'b1', participantId: 'p2' },
      { table: 'participants', method: 'upsert' },
    ],
    [
      { kind: 'deleteParticipant', billId: 'b1', participantId: 'p2' },
      { table: 'participants', method: 'delete', filters: [['id', 'p2']] },
    ],
    [
      { kind: 'upsertItem', billId: 'b1', itemId: 'i1' },
      { table: 'items', method: 'upsert' },
    ],
    [
      { kind: 'deleteItem', billId: 'b1', itemId: 'i1' },
      { table: 'items', method: 'delete', filters: [['id', 'i1']] },
    ],
    [
      { kind: 'addShare', billId: 'b1', itemId: 'i1', participantId: 'p1' },
      { table: 'item_shares', method: 'upsert' },
    ],
    [
      { kind: 'removeShare', billId: 'b1', itemId: 'i1', participantId: 'p1' },
      {
        table: 'item_shares',
        method: 'delete',
        filters: [
          ['item_id', 'i1'],
          ['participant_id', 'p1'],
        ],
      },
    ],
  ])('%p', async (op, expected) => {
    const { client, calls } = fakeClient();
    await expect(sendOp(client, op, bill, 'me')).resolves.toEqual({ status: 'done' });
    expect(calls[0]).toMatchObject(expected);
  });

  it('records who marked a payment', async () => {
    const { client, calls } = fakeClient();
    await sendOp(client, { kind: 'setPaid', billId: 'b1', participantId: 'p2' }, bill, 'me');
    expect(calls[0]?.args[0]).toEqual({
      paid_at: new Date(1000).toISOString(),
      paid_marked_by: 'me',
    });
  });

  it('skips writes for rows deleted locally after queuing', async () => {
    const { client, calls } = fakeClient();
    const op: SyncOp = { kind: 'upsertItem', billId: 'b1', itemId: 'gone' };
    await expect(sendOp(client, op, bill, 'me')).resolves.toEqual({ status: 'done' });
    await expect(
      sendOp(client, { kind: 'upsertBill', billId: 'x' }, undefined, 'me'),
    ).resolves.toEqual({
      status: 'done',
    });
    expect(calls).toHaveLength(0);
  });

  it('retries when offline or the server is down', async () => {
    const offline = fakeClient({ error: { message: 'Network request failed' } });
    const down = fakeClient({ error: { message: 'unavailable', status: 503 } });
    const op: SyncOp = { kind: 'upsertItem', billId: 'b1', itemId: 'i1' };
    await expect(sendOp(offline.client, op, bill, 'me')).resolves.toEqual({ status: 'retry' });
    await expect(sendOp(down.client, op, bill, 'me')).resolves.toEqual({ status: 'retry' });
  });

  it('gives up on a change the server refuses', async () => {
    const { client } = fakeClient({
      error: { message: 'new row violates row-level security policy', code: '42501' },
    });
    const op: SyncOp = { kind: 'upsertItem', billId: 'b1', itemId: 'i1' };
    await expect(sendOp(client, op, bill, 'me')).resolves.toEqual({
      status: 'rejected',
      message: 'new row violates row-level security policy',
    });
  });
});

describe('joining', () => {
  it('maps server error codes to clear messages (F-13)', () => {
    expect(joinErrorMessage({ message: 'JOIN_CODE_NOT_FOUND' })).toMatch(/Kode tidak ditemukan/);
    expect(joinErrorMessage({ message: 'NAME_ALREADY_CLAIMED' })).toMatch(
      /sudah dipilih orang lain/,
    );
    expect(joinErrorMessage({ message: 'Network request failed' })).toMatch(/Butuh internet/);
    expect(joinErrorMessage(null)).toBe('Gagal bergabung. Coba lagi.');
  });

  it('reads the preview', async () => {
    const { client } = fakeClient({
      data: {
        bill_id: 'b1',
        title: 'Kedai',
        bill_date: '2026-10-03',
        is_owner: false,
        payer_name: 'Raka',
        participant_count: 2,
        my_participant_id: null,
        unclaimed: [{ id: 'p2', display_name: 'Dinda', color: avatarColors[1] }],
        colors_in_use: [avatarColors[0], avatarColors[1]],
      },
    });
    await expect(previewJoin(client, 'MEK482')).resolves.toEqual({
      ok: true,
      value: {
        billId: 'b1',
        title: 'Kedai',
        date: '2026-10-03',
        isOwner: false,
        payerName: 'Raka',
        participantCount: 2,
        myParticipantId: null,
        unclaimed: [{ id: 'p2', name: 'Dinda', color: avatarColors[1] }],
        colorsInUse: [avatarColors[0], avatarColors[1]],
      },
    });
  });

  it('claims a name or joins with a new one', async () => {
    const claimed = fakeClient({ data: 'b1' });
    await expect(claimName(claimed.client, 'p2')).resolves.toEqual({ ok: true, value: 'b1' });
    const added = fakeClient({ data: { bill_id: 'b1', participant_id: 'p9' } });
    await expect(
      joinWithNewName(added.client, 'MEK482', 'Wulan', avatarColors[2]),
    ).resolves.toEqual({
      ok: true,
      value: 'b1',
    });
  });

  it('reports a wrong code', async () => {
    const { client } = fakeClient({ error: { message: 'JOIN_CODE_NOT_FOUND' } });
    const result = await previewJoin(client, 'ZZZZZZ');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/Kode tidak ditemukan/);
  });
});
