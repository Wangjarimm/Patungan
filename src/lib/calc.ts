// Bill calculation, following "Aturan perhitungan" in docs/PRD.md.
// Pure functions only: no UI, storage, or network access.

import type { BillSettings, Item, RoundingStep } from '@/types/bill';

export type CalcInput = {
  participants: { id: string }[];
  items: Item[];
  settings: BillSettings;
};

export type PersonItemShare = {
  itemId: string;
  name: string;
  // Number of eaters the line value is split between.
  divisor: number;
  amount: number;
};

export type PersonShare = {
  participantId: string;
  items: PersonItemShare[];
  // All money fields are unrounded decimals except `rounded`.
  subtotal: number;
  discount: number;
  service: number;
  tax: number;
  extraFee: number;
  exact: number;
  rounded: number;
};

export type BillTotals = {
  subtotal: number;
  discount: number;
  base: number;
  service: number;
  tax: number;
  extraFee: number;
  exact: number;
  rounded: number;
  // Collected on top of the exact total because shares are rounded up; goes to the payer.
  roundingSurplus: number;
};

export type BillResult = {
  people: PersonShare[];
  totals: BillTotals;
  // Items with a price but no (valid) eaters; they are left out of the bill.
  unassignedItemIds: string[];
};

// Values within this distance of a rounding step are treated as landing on it, so
// floating point noise (43900.00000000001) does not push a share up a whole step.
const ROUNDING_TOLERANCE = 1e-6;

export function roundUpToStep(value: number, step: RoundingStep): number {
  const adjusted = value - ROUNDING_TOLERANCE;
  if (adjusted <= 0) {
    return 0;
  }
  return Math.ceil(adjusted / step) * step;
}

// Step 1: line value = unit price x quantity.
export function lineTotal(item: Pick<Item, 'unitPrice' | 'qty'>): number {
  return item.unitPrice * item.qty;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function computeDiscount(settings: BillSettings, subtotal: number): number {
  if (settings.discountType === 'percent') {
    return (clamp(settings.discountValue, 0, 100) / 100) * subtotal;
  }
  return clamp(settings.discountValue, 0, subtotal);
}

export function calculateBill({ participants, items, settings }: CalcInput): BillResult {
  const lines = participants.map((p) => ({ participantId: p.id, items: [] as PersonItemShare[] }));
  const linesById = new Map(lines.map((line) => [line.participantId, line]));
  const unassignedItemIds: string[] = [];

  // Steps 1-2: line value split evenly between the item's eaters.
  for (const item of items) {
    const lineValue = lineTotal(item);
    const eaters = [...new Set(item.eaterIds)].flatMap((id) => {
      const line = linesById.get(id);
      return line ? [line] : [];
    });
    if (eaters.length === 0) {
      if (lineValue > 0) {
        unassignedItemIds.push(item.id);
      }
      continue;
    }
    const amount = lineValue / eaters.length;
    for (const line of eaters) {
      line.items.push({ itemId: item.id, name: item.name, divisor: eaters.length, amount });
    }
  }

  // Step 3: per-person and overall subtotals.
  const withSubtotals = lines.map((line) => ({
    ...line,
    subtotal: line.items.reduce((sum, share) => sum + share.amount, 0),
  }));
  const subtotal = withSubtotals.reduce((sum, line) => sum + line.subtotal, 0);

  // Steps 4-7: discount, base, service, tax.
  const discount = computeDiscount(settings, subtotal);
  const base = subtotal - discount;
  const service = base * (settings.servicePct / 100);
  const tax = (settings.taxAfterService ? base + service : base) * (settings.taxPct / 100);

  // Step 8: delivery fee split evenly; nobody to charge it to without participants.
  const extraFee = participants.length > 0 ? Math.max(settings.extraFee, 0) : 0;
  const feePerPerson = participants.length > 0 ? extraFee / participants.length : 0;

  // Step 9: proportional share plus fee, rounded up per person.
  const people = withSubtotals.map((line): PersonShare => {
    const ratio = subtotal > 0 ? line.subtotal / subtotal : 0;
    const exact = ratio * (base + service + tax) + feePerPerson;
    return {
      participantId: line.participantId,
      items: line.items,
      subtotal: line.subtotal,
      discount: ratio * discount,
      service: ratio * service,
      tax: ratio * tax,
      extraFee: feePerPerson,
      exact,
      rounded: roundUpToStep(exact, settings.roundingStep),
    };
  });

  const exact = base + service + tax + extraFee;
  const rounded = people.reduce((sum, p) => sum + p.rounded, 0);

  return {
    people,
    totals: {
      subtotal,
      discount,
      base,
      service,
      tax,
      extraFee,
      exact,
      rounded,
      roundingSurplus: Math.max(rounded - exact, 0),
    },
    unassignedItemIds,
  };
}
