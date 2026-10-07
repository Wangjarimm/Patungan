// Bill summaries for the home and result screens. Payment status is not tracked yet (phase 2),
// so every participant other than the payer is still waiting to transfer.

import type { Bill } from '@/types/bill';

import { calculateBill, type BillResult } from './calc';

export type Outstanding = {
  // Sum of rounded shares still owed to payers.
  amount: number;
  // Number of people (per bill) who still owe something.
  people: number;
};

export function billTotal(bill: Bill): number {
  return calculateBill(bill).totals.rounded;
}

export function summarizeOutstanding(bills: Bill[]): Outstanding {
  let amount = 0;
  let people = 0;
  for (const bill of bills) {
    for (const share of calculateBill(bill).people) {
      if (share.participantId !== bill.payerId && share.rounded > 0) {
        amount += share.rounded;
        people += 1;
      }
    }
  }
  return { amount, people };
}

// 'cashier': the payer, already paid at the till. 'none': nothing to pay.
export type ShareStatus = 'cashier' | 'pending' | 'none';

export type Progress = {
  settled: number;
  total: number;
  // Rounded amount still to be transferred to the payer.
  remaining: number;
  statuses: Record<string, ShareStatus>;
};

export function billProgress(bill: Bill, result: BillResult): Progress {
  const statuses: Record<string, ShareStatus> = {};
  let settled = 0;
  let remaining = 0;
  for (const share of result.people) {
    let status: ShareStatus;
    if (share.participantId === bill.payerId) status = 'cashier';
    else if (share.rounded === 0) status = 'none';
    else status = 'pending';
    statuses[share.participantId] = status;
    if (status === 'pending') remaining += share.rounded;
    else settled += 1;
  }
  return { settled, total: result.people.length, remaining, statuses };
}
