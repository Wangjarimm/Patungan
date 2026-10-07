import type { Bill } from '@/types/bill';

import { calculateBill } from './calc';
import { billProgress, billTotal, summarizeBill, summarizeOutstanding } from './summary';

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: 'b1',
    title: 'Kedai',
    date: '2026-10-03',
    payerId: 'raka',
    createdAt: 0,
    role: 'owner',
    ownerId: null,
    joinCode: null,
    myParticipantId: null,
    syncedAt: null,
    participants: [
      { id: 'raka', name: 'Raka', color: 'c', paidAt: null, profileId: null },
      { id: 'dinda', name: 'Dinda', color: 'c', paidAt: null, profileId: null },
      { id: 'bima', name: 'Bima', color: 'c', paidAt: null, profileId: null },
    ],
    items: [
      { id: 'i1', name: 'Mie', unitPrice: 30000, qty: 1, eaterIds: ['raka'] },
      { id: 'i2', name: 'Nasi', unitPrice: 25000, qty: 1, eaterIds: ['dinda'] },
    ],
    settings: {
      servicePct: 0,
      taxPct: 10,
      taxAfterService: true,
      discountType: 'amount',
      discountValue: 0,
      extraFee: 0,
      roundingStep: 100,
    },
    ...overrides,
  };
}

describe('billTotal', () => {
  it('returns the rounded total', () => {
    // 30000 * 1.1 = 33000, 25000 * 1.1 = 27500
    expect(billTotal(makeBill())).toBe(60500);
  });
});

describe('summarizeOutstanding', () => {
  it('sums shares of everyone except the payer, skipping zero shares', () => {
    // Bima ordered nothing, so only Dinda owes.
    expect(summarizeOutstanding([makeBill()])).toEqual({ amount: 27500, people: 1 });
  });

  it('adds up across bills', () => {
    const second = makeBill({ id: 'b2', payerId: 'dinda' });
    expect(summarizeOutstanding([makeBill(), second])).toEqual({
      amount: 27500 + 33000,
      people: 2,
    });
  });

  it('is zero without bills', () => {
    expect(summarizeOutstanding([])).toEqual({ amount: 0, people: 0 });
  });
});

describe('billProgress', () => {
  it('counts the payer and zero shares as settled', () => {
    const bill = makeBill();
    expect(billProgress(bill, calculateBill(bill))).toEqual({
      settled: 2,
      total: 3,
      remaining: 27500,
      statuses: { raka: 'cashier', dinda: 'pending', bima: 'none' },
    });
  });

  it('treats everyone as pending when there is no payer', () => {
    const bill = makeBill({ payerId: null });
    const progress = billProgress(bill, calculateBill(bill));
    expect(progress.statuses.raka).toBe('pending');
    expect(progress.remaining).toBe(60500);
    expect(progress.settled).toBe(1);
  });
});

function paid(bill: Bill, id: string): Bill {
  return {
    ...bill,
    participants: bill.participants.map((p) => (p.id === id ? { ...p, paidAt: 1 } : p)),
  };
}

describe('manual payment status', () => {
  it('marks a paid person as settled and drops them from the remaining amount', () => {
    const bill = paid(makeBill(), 'dinda');
    const progress = billProgress(bill, calculateBill(bill));
    expect(progress.statuses.dinda).toBe('paid');
    expect(progress.settled).toBe(3);
    expect(progress.remaining).toBe(0);
  });

  it('excludes paid people from the outstanding balance', () => {
    expect(summarizeOutstanding([paid(makeBill(), 'dinda')])).toEqual({ amount: 0, people: 0 });
  });

  it('ignores paidAt on the payer and on people with nothing to pay', () => {
    const bill = paid(paid(makeBill(), 'raka'), 'bima');
    const progress = billProgress(bill, calculateBill(bill));
    expect(progress.statuses.raka).toBe('cashier');
    expect(progress.statuses.bima).toBe('none');
  });
});

describe('summarizeBill', () => {
  it('is unpaid while someone still owes', () => {
    expect(summarizeBill(makeBill())).toMatchObject({
      status: 'unpaid',
      total: 60500,
      remaining: 27500,
      pendingPeople: 1,
    });
  });

  it('is settled once everyone who owes has paid', () => {
    expect(summarizeBill(paid(makeBill(), 'dinda'))).toMatchObject({
      status: 'settled',
      remaining: 0,
      pendingPeople: 0,
    });
  });

  it('is a draft when nobody owes anything', () => {
    expect(summarizeBill(makeBill({ items: [] })).status).toBe('draft');
    // Only the payer ate.
    const payerOnly = makeBill({
      items: [{ id: 'i1', name: 'Mie', unitPrice: 30000, qty: 1, eaterIds: ['raka'] }],
    });
    expect(summarizeBill(payerOnly).status).toBe('draft');
  });
});
