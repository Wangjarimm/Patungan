import type { Bill } from '@/types/bill';

import { buildHistory, sortBillsByRecent } from './history';

let counter = 0;

// A bill where Dinda owes 10.000 to Raka; `paid` marks Dinda as paid; `empty` has no items.
function makeBill(date: string, kind: 'unpaid' | 'settled' | 'draft', createdAt = 0): Bill {
  counter += 1;
  return {
    id: `b${counter}`,
    title: `Tagihan ${counter}`,
    date,
    payerId: 'raka',
    createdAt,
    role: 'owner',
    ownerId: null,
    joinCode: null,
    myParticipantId: null,
    syncedAt: null,
    participants: [
      { id: 'raka', name: 'Raka', color: 'c', paidAt: null, profileId: null },
      {
        id: 'dinda',
        name: 'Dinda',
        color: 'c',
        paidAt: kind === 'settled' ? 1 : null,
        profileId: null,
      },
    ],
    items:
      kind === 'draft'
        ? []
        : [{ id: 'i', name: 'Nasi', unitPrice: 10000, qty: 1, eaterIds: ['dinda'] }],
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
}

function byId(...bills: Bill[]): Record<string, Bill> {
  return Object.fromEntries(bills.map((b) => [b.id, b]));
}

const octUnpaid = makeBill('2026-10-03', 'unpaid');
const sepUnpaid = makeBill('2026-09-12', 'unpaid');
const octSettled = makeBill('2026-10-01', 'settled');
const sepSettled = makeBill('2026-09-30', 'settled');
const sepDraft = makeBill('2026-09-05', 'draft');
const all = byId(sepSettled, octUnpaid, sepDraft, octSettled, sepUnpaid);

describe('sortBillsByRecent', () => {
  it('orders by date, then creation time, newest first', () => {
    const a = makeBill('2026-10-01', 'unpaid', 1);
    const b = makeBill('2026-10-05', 'unpaid', 0);
    const c = makeBill('2026-10-01', 'unpaid', 2);
    expect(sortBillsByRecent(byId(a, b, c)).map((x) => x.id)).toEqual([b.id, c.id, a.id]);
  });
});

describe('buildHistory (F-10)', () => {
  it('counts bills for the filter badges', () => {
    expect(buildHistory(all, 'all').counts).toEqual({ all: 5, unpaid: 2, settled: 2 });
  });

  it('puts every unpaid bill on top, then the rest per month', () => {
    const { sections } = buildHistory(all, 'all');
    expect(sections.map((s) => [s.kind, s.title, s.data.map((d) => d.bill.id)])).toEqual([
      ['unpaid', 'Belum lunas', [octUnpaid.id, sepUnpaid.id]],
      ['month', 'Oktober 2026', [octSettled.id]],
      ['month', 'September 2026', [sepSettled.id, sepDraft.id]],
    ]);
  });

  it('shows only unpaid bills for Belum lunas, matching the badge', () => {
    const { sections, counts } = buildHistory(all, 'unpaid');
    expect(sections).toHaveLength(1);
    expect(sections[0]?.data).toHaveLength(counts.unpaid);
  });

  it('shows only settled bills per month for Lunas', () => {
    const { sections } = buildHistory(all, 'settled');
    expect(sections.map((s) => [s.title, s.data.map((d) => d.bill.id)])).toEqual([
      ['Oktober 2026', [octSettled.id]],
      ['September 2026', [sepSettled.id]],
    ]);
  });

  it('is empty without bills', () => {
    expect(buildHistory({}, 'all')).toEqual({
      sections: [],
      counts: { all: 0, unpaid: 0, settled: 0 },
    });
  });
});
