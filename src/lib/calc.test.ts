import type { BillSettings, Item } from '@/types/bill';

import { calculateBill, roundUpToStep, type CalcInput } from './calc';

const baseSettings: BillSettings = {
  servicePct: 0,
  taxPct: 0,
  taxAfterService: true,
  discountType: 'amount',
  discountValue: 0,
  extraFee: 0,
  roundingStep: 1,
};

function people(...ids: string[]) {
  return ids.map((id) => ({ id }));
}

function item(id: string, unitPrice: number, qty: number, eaterIds: string[]): Item {
  return { id, name: id, unitPrice, qty, eaterIds };
}

function input(
  partial: Omit<Partial<CalcInput>, 'settings'> & { settings?: Partial<BillSettings> },
): CalcInput {
  return {
    participants: partial.participants ?? [],
    items: partial.items ?? [],
    settings: { ...baseSettings, ...partial.settings },
  };
}

function shareOf(result: ReturnType<typeof calculateBill>, id: string) {
  const share = result.people.find((p) => p.participantId === id);
  if (!share) throw new Error(`no share for ${id}`);
  return share;
}

describe('calculateBill: Kedai Mie Kenari reference', () => {
  const everyone = ['raka', 'dinda', 'bima', 'sekar', 'fajar'];
  const kenari = input({
    participants: people(...everyone),
    items: [
      item('Mie goreng spesial', 32000, 2, ['raka', 'bima']),
      item('Nasi goreng kampung', 28000, 1, ['dinda']),
      item('Kwetiau siram', 30000, 1, ['sekar']),
      item('Mie kuah seafood', 35000, 1, ['fajar']),
      item('Pisang goreng keju', 24000, 1, ['dinda', 'sekar']),
      item('Es teh manis', 6000, 5, everyone),
    ],
    settings: { servicePct: 5, taxPct: 10, taxAfterService: true, roundingStep: 100 },
  });
  const result = calculateBill(kenari);

  it.each([
    ['raka', 38000, 1900, 3990, 43890, 43900],
    ['bima', 38000, 1900, 3990, 43890, 43900],
    ['dinda', 46000, 2300, 4830, 53130, 53200],
    ['sekar', 48000, 2400, 5040, 55440, 55500],
    ['fajar', 41000, 2050, 4305, 47355, 47400],
  ])(
    '%s: subtotal %i, service %i, tax %i, exact %i, rounded %i',
    (id, sub, svc, tax, exact, rounded) => {
      const share = shareOf(result, id);
      expect(share.subtotal).toBeCloseTo(sub, 6);
      expect(share.service).toBeCloseTo(svc, 6);
      expect(share.tax).toBeCloseTo(tax, 6);
      expect(share.exact).toBeCloseTo(exact, 6);
      expect(share.rounded).toBe(rounded);
    },
  );

  it('matches the total row', () => {
    expect(result.totals.subtotal).toBe(211000);
    expect(result.totals.service).toBeCloseTo(10550, 6);
    expect(result.totals.tax).toBeCloseTo(22155, 6);
    expect(result.totals.exact).toBeCloseTo(243705, 6);
    expect(result.totals.rounded).toBe(243900);
    expect(result.totals.roundingSurplus).toBeCloseTo(195, 6);
  });

  it('lists the menu lines behind each share', () => {
    expect(shareOf(result, 'sekar').items).toEqual([
      { itemId: 'Kwetiau siram', name: 'Kwetiau siram', divisor: 1, amount: 30000 },
      { itemId: 'Pisang goreng keju', name: 'Pisang goreng keju', divisor: 2, amount: 12000 },
      { itemId: 'Es teh manis', name: 'Es teh manis', divisor: 5, amount: 6000 },
    ]);
  });

  it('has no unassigned items', () => {
    expect(result.unassignedItemIds).toEqual([]);
  });
});

describe('calculateBill: edge cases from the PRD', () => {
  it('handles a bill without items', () => {
    const result = calculateBill(
      input({ participants: people('a', 'b'), settings: { servicePct: 5, taxPct: 10 } }),
    );
    expect(result.totals.exact).toBe(0);
    expect(result.totals.rounded).toBe(0);
    expect(result.people.map((p) => p.rounded)).toEqual([0, 0]);
  });

  it('ignores items without eaters and reports them', () => {
    const result = calculateBill(
      input({
        participants: people('a', 'b'),
        items: [item('x', 10000, 1, ['a']), item('orphan', 50000, 1, [])],
      }),
    );
    expect(result.totals.subtotal).toBe(10000);
    expect(shareOf(result, 'a').exact).toBe(10000);
    expect(result.unassignedItemIds).toEqual(['orphan']);
  });

  it('does not flag a zero-priced item without eaters', () => {
    const result = calculateBill(
      input({ participants: people('a'), items: [item('free', 0, 1, [])] }),
    );
    expect(result.unassignedItemIds).toEqual([]);
  });

  it('caps an amount discount at the subtotal', () => {
    const result = calculateBill(
      input({
        participants: people('a', 'b'),
        items: [item('x', 10000, 1, ['a']), item('y', 30000, 1, ['b'])],
        settings: { discountType: 'amount', discountValue: 999999, servicePct: 5, taxPct: 10 },
      }),
    );
    expect(result.totals.discount).toBe(40000);
    expect(result.totals.base).toBe(0);
    expect(result.totals.exact).toBe(0);
    expect(result.people.map((p) => p.rounded)).toEqual([0, 0]);
  });

  it('handles a 100% discount, still charging the delivery fee', () => {
    const result = calculateBill(
      input({
        participants: people('a', 'b'),
        items: [item('x', 10000, 1, ['a', 'b'])],
        settings: {
          discountType: 'percent',
          discountValue: 100,
          extraFee: 10000,
          roundingStep: 100,
        },
      }),
    );
    expect(result.totals.discount).toBe(10000);
    expect(result.people.map((p) => p.exact)).toEqual([5000, 5000]);
    expect(result.totals.rounded).toBe(10000);
  });

  it('clamps a percent discount to 0..100', () => {
    const over = calculateBill(
      input({
        participants: people('a'),
        items: [item('x', 10000, 1, ['a'])],
        settings: { discountType: 'percent', discountValue: 150 },
      }),
    );
    expect(over.totals.discount).toBe(10000);
    const under = calculateBill(
      input({
        participants: people('a'),
        items: [item('x', 10000, 1, ['a'])],
        settings: { discountType: 'percent', discountValue: -20 },
      }),
    );
    expect(under.totals.discount).toBe(0);
  });

  it('handles 0% service and tax', () => {
    const result = calculateBill(
      input({ participants: people('a', 'b'), items: [item('x', 15000, 2, ['a', 'b'])] }),
    );
    expect(result.totals.service).toBe(0);
    expect(result.totals.tax).toBe(0);
    expect(result.people.map((p) => p.exact)).toEqual([15000, 15000]);
  });

  it('handles a single participant', () => {
    const result = calculateBill(
      input({
        participants: people('solo'),
        items: [item('x', 50000, 1, ['solo'])],
        settings: { servicePct: 5, taxPct: 10, extraFee: 7000, roundingStep: 1000 },
      }),
    );
    // 50000 + 2500 + 5250 + 7000 = 64750
    expect(shareOf(result, 'solo').exact).toBeCloseTo(64750, 6);
    expect(shareOf(result, 'solo').rounded).toBe(65000);
  });

  it('charges the delivery fee to a participant without orders', () => {
    const result = calculateBill(
      input({
        participants: people('a', 'b', 'c'),
        items: [item('x', 30000, 1, ['a'])],
        settings: { extraFee: 9000, roundingStep: 100 },
      }),
    );
    expect(shareOf(result, 'c').subtotal).toBe(0);
    expect(shareOf(result, 'c').extraFee).toBe(3000);
    expect(shareOf(result, 'c').rounded).toBe(3000);
    expect(shareOf(result, 'a').rounded).toBe(33000);
  });

  it('keeps a zero share at zero', () => {
    const result = calculateBill(
      input({
        participants: people('a', 'b'),
        items: [item('x', 30000, 1, ['a'])],
        settings: { roundingStep: 1000 },
      }),
    );
    expect(shareOf(result, 'b').rounded).toBe(0);
  });

  it('splits Rp10.000 three ways (repeating decimal)', () => {
    const result = calculateBill(
      input({
        participants: people('a', 'b', 'c'),
        items: [item('x', 10000, 1, ['a', 'b', 'c'])],
        settings: { roundingStep: 1 },
      }),
    );
    for (const share of result.people) {
      expect(share.exact).toBeCloseTo(3333.3333, 3);
      expect(share.rounded).toBe(3334);
    }
    expect(result.totals.exact).toBeCloseTo(10000, 6);
    expect(result.totals.rounded).toBe(10002);
    expect(result.totals.roundingSurplus).toBeCloseTo(2, 6);
  });
});

describe('calculateBill: settings', () => {
  const twoPeople = {
    participants: people('a', 'b'),
    items: [item('x', 60000, 1, ['a']), item('y', 40000, 1, ['b'])],
  };

  it('applies tax before service when taxAfterService is false', () => {
    const result = calculateBill(
      input({ ...twoPeople, settings: { servicePct: 5, taxPct: 10, taxAfterService: false } }),
    );
    expect(result.totals.service).toBeCloseTo(5000, 6);
    expect(result.totals.tax).toBeCloseTo(10000, 6);
    expect(result.totals.exact).toBeCloseTo(115000, 6);
  });

  it('spreads an amount discount proportionally before service and tax', () => {
    const result = calculateBill(
      input({
        ...twoPeople,
        settings: { discountType: 'amount', discountValue: 20000, servicePct: 5, taxPct: 10 },
      }),
    );
    // B = 80000, V = 4000, T = 8400
    expect(shareOf(result, 'a').discount).toBeCloseTo(12000, 6);
    expect(shareOf(result, 'b').discount).toBeCloseTo(8000, 6);
    expect(shareOf(result, 'a').exact).toBeCloseTo(55440, 6);
    expect(shareOf(result, 'b').exact).toBeCloseTo(36960, 6);
  });

  it('applies a percent discount on the subtotal', () => {
    const result = calculateBill(
      input({ ...twoPeople, settings: { discountType: 'percent', discountValue: 25 } }),
    );
    expect(result.totals.discount).toBe(25000);
    expect(shareOf(result, 'a').exact).toBeCloseTo(45000, 6);
  });

  it.each([
    [1, 33334],
    [100, 33400],
    [500, 33500],
    [1000, 34000],
  ] as const)('rounds up to step %i', (roundingStep, expected) => {
    const result = calculateBill(
      input({
        participants: people('a', 'b', 'c'),
        items: [item('x', 100000, 1, ['a', 'b', 'c'])],
        settings: { roundingStep },
      }),
    );
    expect(shareOf(result, 'a').rounded).toBe(expected);
  });

  it('ignores eaters that are not participants', () => {
    const result = calculateBill(
      input({ participants: people('a'), items: [item('x', 10000, 1, ['a', 'ghost'])] }),
    );
    expect(shareOf(result, 'a').exact).toBe(10000);
  });
});

describe('F-06 invariant: shares add up to the bill total', () => {
  it('within Rp1 before rounding, for an awkward bill', () => {
    const result = calculateBill(
      input({
        participants: people('a', 'b', 'c', 'd', 'e', 'f', 'g'),
        items: [
          item('x', 17333, 3, ['a', 'b', 'c']),
          item('y', 9999, 7, ['a', 'b', 'c', 'd', 'e', 'f', 'g']),
          item('z', 41111, 1, ['d', 'g']),
        ],
        settings: {
          servicePct: 7.5,
          taxPct: 11,
          discountType: 'amount',
          discountValue: 12345,
          extraFee: 10001,
        },
      }),
    );
    const sum = result.people.reduce((acc, p) => acc + p.exact, 0);
    const expected =
      result.totals.base + result.totals.service + result.totals.tax + result.totals.extraFee;
    expect(Math.abs(sum - expected)).toBeLessThanOrEqual(1);
    expect(Math.abs(sum - result.totals.exact)).toBeLessThanOrEqual(1);
  });

  it('each share equals its own breakdown', () => {
    const result = calculateBill(
      input({
        participants: people('a', 'b'),
        items: [item('x', 33333, 1, ['a']), item('y', 12345, 2, ['a', 'b'])],
        settings: { servicePct: 5, taxPct: 10, discountValue: 5000, extraFee: 3000 },
      }),
    );
    for (const p of result.people) {
      expect(p.subtotal - p.discount + p.service + p.tax + p.extraFee).toBeCloseTo(p.exact, 6);
    }
  });
});

describe('rounding tolerance', () => {
  it('keeps a share that is mathematically exactly Rp43.900 at Rp43.900', () => {
    // 43900 / 82900 * 82900 evaluates to 43900.00000000001 in floating point.
    const result = calculateBill(
      input({
        participants: people('raka', 'bima'),
        items: [item('a', 43900, 1, ['raka']), item('b', 39000, 1, ['bima'])],
        settings: { roundingStep: 100 },
      }),
    );
    expect(shareOf(result, 'raka').rounded).toBe(43900);
  });

  it('keeps a taxed share that is exactly Rp7.700 at Rp7.700', () => {
    // 7000 / 12000 * 13200 evaluates to 7700.000000000001 in floating point.
    const result = calculateBill(
      input({
        participants: people('a', 'b'),
        items: [item('x', 7000, 1, ['a']), item('y', 5000, 1, ['b'])],
        settings: { taxPct: 10, roundingStep: 100 },
      }),
    );
    expect(shareOf(result, 'a').rounded).toBe(7700);
  });

  it('roundUpToStep absorbs float noise but still rounds real remainders up', () => {
    expect(roundUpToStep(43900.000000001, 100)).toBe(43900);
    expect(roundUpToStep(43899.999999999, 100)).toBe(43900);
    expect(roundUpToStep(43900.01, 100)).toBe(44000);
    expect(roundUpToStep(43890, 100)).toBe(43900);
    expect(roundUpToStep(3333.3333333, 1)).toBe(3334);
    expect(roundUpToStep(0, 1000)).toBe(0);
    expect(roundUpToStep(1e-9, 1000)).toBe(0);
  });
});
