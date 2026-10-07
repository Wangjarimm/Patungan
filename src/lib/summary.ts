// Payment status per person and per bill, for the home, history, and result screens.

import type { Bill } from '@/types/bill';

import { calculateBill, type BillResult, type PersonShare } from './calc';

// 'cashier': the payer, already paid at the till. 'none': nothing to pay.
export type ShareStatus = 'cashier' | 'pending' | 'paid' | 'none';

export type Progress = {
  settled: number;
  total: number;
  // Rounded amount still to be transferred to the payer.
  remaining: number;
  statuses: Record<string, ShareStatus>;
};

// 'draft': nobody owes anything yet (no priced items, or only the payer ate).
export type BillStatus = 'unpaid' | 'settled' | 'draft';

export type BillSummary = {
  bill: Bill;
  total: number;
  remaining: number;
  // People who still have to transfer.
  pendingPeople: number;
  status: BillStatus;
};

export type Outstanding = {
  // Sum of rounded shares still owed to payers.
  amount: number;
  // Number of people (per bill) who still owe something.
  people: number;
};

function shareStatus(bill: Bill, share: PersonShare): ShareStatus {
  if (share.participantId === bill.payerId) return 'cashier';
  if (share.rounded === 0) return 'none';
  const participant = bill.participants.find((p) => p.id === share.participantId);
  return participant?.paidAt != null ? 'paid' : 'pending';
}

export function billProgress(bill: Bill, result: BillResult): Progress {
  const statuses: Record<string, ShareStatus> = {};
  let settled = 0;
  let remaining = 0;
  for (const share of result.people) {
    const status = shareStatus(bill, share);
    statuses[share.participantId] = status;
    if (status === 'pending') remaining += share.rounded;
    else settled += 1;
  }
  return { settled, total: result.people.length, remaining, statuses };
}

export function summarizeBill(bill: Bill): BillSummary {
  const result = calculateBill(bill);
  const progress = billProgress(bill, result);
  const statuses = Object.values(progress.statuses);
  const pendingPeople = statuses.filter((s) => s === 'pending').length;
  const owed = statuses.some((s) => s === 'pending' || s === 'paid');
  let status: BillStatus = 'draft';
  if (pendingPeople > 0) status = 'unpaid';
  else if (owed) status = 'settled';
  return {
    bill,
    total: result.totals.rounded,
    remaining: progress.remaining,
    pendingPeople,
    status,
  };
}

export function billTotal(bill: Bill): number {
  return calculateBill(bill).totals.rounded;
}

export function summarizeOutstanding(bills: Bill[]): Outstanding {
  let amount = 0;
  let people = 0;
  for (const bill of bills) {
    const summary = summarizeBill(bill);
    amount += summary.remaining;
    people += summary.pendingPeople;
  }
  return { amount, people };
}
