// Cross-bill summaries for the home screen. Payment status is not tracked yet (phase 2),
// so every participant other than the payer is still waiting to transfer.

import type { Bill } from '@/types/bill';

import { calculateBill } from './calc';

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
