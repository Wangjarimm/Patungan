import { calculateBill } from '@/lib/calc';
import { makeBill, person } from '@/test-utils/bill';

import { billToRow, itemToRow, participantToRow, rowsToBill, type BillRows } from './mappers';
import { avatarColors } from '@/theme/colors';

const ME = 'user-me';
const OTHER = 'user-other';

function kenariRows(ownerId: string): BillRows {
  const people = ['raka', 'dinda', 'bima', 'sekar', 'fajar'];
  const participant = (id: string, position: number, profileId: string | null = null) => ({
    id,
    bill_id: 'b1',
    display_name: id.charAt(0).toUpperCase() + id.slice(1),
    color: avatarColors[0],
    profile_id: profileId,
    paid_at: id === 'fajar' ? '2026-10-03T10:00:00.000Z' : null,
    paid_marked_by: null,
    position,
    created_at: '2026-10-03T09:00:00.000Z',
  });
  const item = (id: string, unit: number, qty: number, position: number) => ({
    id,
    bill_id: 'b1',
    name: id,
    unit_price: unit,
    qty,
    position,
    created_at: '2026-10-03T09:00:00.000Z',
  });
  const share = (item_id: string, participant_id: string) => ({
    bill_id: 'b1',
    item_id,
    participant_id,
  });
  return {
    bill: {
      id: 'b1',
      owner_id: ownerId,
      title: 'Kedai Mie Kenari',
      bill_date: '2026-10-03',
      join_code: 'MEK482',
      payer_participant_id: 'raka',
      service_pct: 5,
      tax_pct: 10,
      tax_after_service: true,
      discount_type: 'amount',
      discount_value: 0,
      extra_fee: 0,
      rounding_step: 100,
      created_at: '2026-10-03T09:00:00.000Z',
      updated_at: '2026-10-03T09:00:00.000Z',
    },
    // Out of order on purpose: position decides.
    participants: [
      participant('sekar', 3),
      participant('raka', 0, ownerId),
      participant('dinda', 1, ownerId === ME ? null : ME),
      participant('bima', 2),
      participant('fajar', 4),
    ],
    items: [
      item('Es teh manis', 6000, 5, 5),
      item('Mie goreng spesial', 32000, 2, 0),
      item('Nasi goreng kampung', 28000, 1, 1),
      item('Kwetiau siram', 30000, 1, 2),
      item('Mie kuah seafood', 35000, 1, 3),
      item('Pisang goreng keju', 24000, 1, 4),
    ],
    shares: [
      share('Mie goreng spesial', 'raka'),
      share('Mie goreng spesial', 'bima'),
      share('Nasi goreng kampung', 'dinda'),
      share('Kwetiau siram', 'sekar'),
      share('Mie kuah seafood', 'fajar'),
      share('Pisang goreng keju', 'dinda'),
      share('Pisang goreng keju', 'sekar'),
      ...people.map((p) => share('Es teh manis', p)),
    ],
  };
}

describe('rowsToBill', () => {
  it('rebuilds the Kedai Mie Kenari bill so the totals match the PRD', () => {
    const bill = rowsToBill(kenariRows(ME), ME, 123);
    expect(bill.participants.map((p) => p.id)).toEqual(['raka', 'dinda', 'bima', 'sekar', 'fajar']);
    expect(bill.items[0]).toMatchObject({ name: 'Mie goreng spesial', eaterIds: ['raka', 'bima'] });
    expect(bill.items.at(-1)?.eaterIds).toHaveLength(5);
    expect(calculateBill(bill).totals.rounded).toBe(243900);
    expect(bill).toMatchObject({
      role: 'owner',
      ownerId: ME,
      joinCode: 'MEK482',
      payerId: 'raka',
      myParticipantId: 'raka',
      syncedAt: 123,
      date: '2026-10-03',
    });
    expect(bill.participants.find((p) => p.id === 'fajar')?.paidAt).toBe(
      Date.parse('2026-10-03T10:00:00.000Z'),
    );
  });

  it('marks a bill owned by someone else as joined, with my claimed name', () => {
    const bill = rowsToBill(kenariRows(OTHER), ME);
    expect(bill.role).toBe('participant');
    expect(bill.myParticipantId).toBe('dinda');
  });

  it('falls back to safe settings for unexpected values', () => {
    const rows = kenariRows(ME);
    rows.bill.rounding_step = 7;
    rows.bill.discount_type = 'weird';
    const bill = rowsToBill(rows, ME);
    expect(bill.settings.roundingStep).toBe(100);
    expect(bill.settings.discountType).toBe('amount');
  });
});

describe('local to row', () => {
  const bill = makeBill({
    id: 'b1',
    createdAt: Date.parse('2026-10-03T09:00:00.000Z'),
    participants: [person('p1', 'Raka', { profileId: ME }), person('p2', 'Dinda', { paidAt: 0 })],
    items: [
      { id: 'i1', name: 'Mie', unitPrice: 1000, qty: 1, eaterIds: [] },
      { id: 'i2', name: 'Teh', unitPrice: 500, qty: 2, eaterIds: [] },
    ],
  });

  it('maps bill settings to columns, leaving out the payer', () => {
    const row = billToRow(bill);
    expect(row).toMatchObject({
      id: 'b1',
      title: 'Kedai',
      bill_date: '2026-10-03',
      service_pct: 0,
      rounding_step: 100,
      created_at: '2026-10-03T09:00:00.000Z',
    });
    expect(row).not.toHaveProperty('payer_participant_id');
    expect(row).not.toHaveProperty('owner_id');
  });

  it('keeps list order as position', () => {
    expect(participantToRow(bill, bill.participants[1]!)).toMatchObject({
      id: 'p2',
      bill_id: 'b1',
      display_name: 'Dinda',
      position: 1,
      paid_at: '1970-01-01T00:00:00.000Z',
      profile_id: null,
    });
    expect(itemToRow(bill, bill.items[1]!)).toMatchObject({ id: 'i2', position: 1, qty: 2 });
  });
});
