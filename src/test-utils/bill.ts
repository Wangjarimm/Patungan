import type { Bill, Participant } from '@/types/bill';

// Complete Bill with sensible defaults for tests; override only what a test cares about.
export function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: 'bill-1',
    title: 'Kedai',
    date: '2026-10-03',
    payerId: null,
    participants: [],
    items: [],
    settings: {
      servicePct: 0,
      taxPct: 0,
      taxAfterService: true,
      discountType: 'amount',
      discountValue: 0,
      extraFee: 0,
      roundingStep: 100,
    },
    createdAt: 0,
    role: 'owner',
    ownerId: null,
    joinCode: null,
    myParticipantId: null,
    syncedAt: null,
    ...overrides,
  };
}

export function person(
  id: string,
  name: string,
  overrides: Partial<Participant> = {},
): Participant {
  return { id, name, color: 'c', paidAt: null, profileId: null, ...overrides };
}
