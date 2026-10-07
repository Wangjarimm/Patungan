// Converts between the local Bill shape and database rows. Pure functions, no network.

import type {
  Bill,
  BillSettings,
  DiscountType,
  Item,
  Participant,
  RoundingStep,
} from '@/types/bill';

import type { Database } from './database.types';

type Tables = Database['public']['Tables'];
export type BillRow = Tables['bills']['Row'];
export type ParticipantRow = Tables['participants']['Row'];
export type ItemRow = Tables['items']['Row'];
export type ShareRow = Tables['item_shares']['Row'];

export type BillRows = {
  bill: BillRow;
  participants: ParticipantRow[];
  items: ItemRow[];
  shares: ShareRow[];
};

const ROUNDING_STEPS: RoundingStep[] = [1, 100, 500, 1000];

function toIso(ms: number | null): string | null {
  return ms === null ? null : new Date(ms).toISOString();
}

function toMs(iso: string | null): number | null {
  return iso === null ? null : Date.parse(iso);
}

// Bill columns except the payer, which is sent after the participants exist.
export function billToRow(bill: Bill): Tables['bills']['Insert'] {
  const { settings } = bill;
  return {
    id: bill.id,
    title: bill.title,
    bill_date: bill.date,
    service_pct: settings.servicePct,
    tax_pct: settings.taxPct,
    tax_after_service: settings.taxAfterService,
    discount_type: settings.discountType,
    discount_value: settings.discountValue,
    extra_fee: settings.extraFee,
    rounding_step: settings.roundingStep,
    created_at: new Date(bill.createdAt).toISOString(),
  };
}

export function participantToRow(
  bill: Bill,
  participant: Participant,
): Tables['participants']['Insert'] {
  return {
    id: participant.id,
    bill_id: bill.id,
    display_name: participant.name,
    color: participant.color,
    profile_id: participant.profileId,
    paid_at: toIso(participant.paidAt),
    position: bill.participants.findIndex((p) => p.id === participant.id),
  };
}

export function itemToRow(bill: Bill, item: Item): Tables['items']['Insert'] {
  return {
    id: item.id,
    bill_id: bill.id,
    name: item.name,
    unit_price: item.unitPrice,
    qty: item.qty,
    position: bill.items.findIndex((i) => i.id === item.id),
  };
}

function settingsFromRow(row: BillRow): BillSettings {
  const step = ROUNDING_STEPS.find((s) => s === row.rounding_step) ?? 100;
  const discountType: DiscountType = row.discount_type === 'percent' ? 'percent' : 'amount';
  return {
    servicePct: Number(row.service_pct),
    taxPct: Number(row.tax_pct),
    taxAfterService: row.tax_after_service,
    discountType,
    discountValue: Number(row.discount_value),
    extraFee: Number(row.extra_fee),
    roundingStep: step,
  };
}

// Builds the local Bill from server rows; role and "me" follow from the signed-in account.
export function rowsToBill(rows: BillRows, myUserId: string, now: number = Date.now()): Bill {
  const byPosition = <T extends { position: number; created_at: string }>(a: T, b: T) =>
    a.position - b.position || a.created_at.localeCompare(b.created_at);

  const participants = [...rows.participants].sort(byPosition).map((p): Participant => ({
    id: p.id,
    name: p.display_name,
    color: p.color,
    paidAt: toMs(p.paid_at),
    profileId: p.profile_id,
  }));
  const items = [...rows.items].sort(byPosition).map((i): Item => ({
    id: i.id,
    name: i.name,
    unitPrice: Number(i.unit_price),
    qty: i.qty,
    eaterIds: participants
      .filter((p) => rows.shares.some((s) => s.item_id === i.id && s.participant_id === p.id))
      .map((p) => p.id),
  }));

  return {
    id: rows.bill.id,
    title: rows.bill.title,
    date: rows.bill.bill_date,
    payerId: rows.bill.payer_participant_id,
    participants,
    items,
    settings: settingsFromRow(rows.bill),
    createdAt: Date.parse(rows.bill.created_at),
    role: rows.bill.owner_id === myUserId ? 'owner' : 'participant',
    ownerId: rows.bill.owner_id,
    joinCode: rows.bill.join_code,
    myParticipantId: participants.find((p) => p.profileId === myUserId)?.id ?? null,
    syncedAt: now,
  };
}
