import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { pickAvatarColor } from '@/lib/avatar';
import { todayIsoDate } from '@/lib/format';
import { createId } from '@/lib/id';
import { opsForNewBill, type SyncOp } from '@/lib/sync-ops';
import {
  clampPercent,
  MAX_PRICE,
  MAX_QTY,
  normalizeName,
  validateBillTitle,
  validateItemName,
  validateParticipantName,
  type Parsed,
} from '@/lib/validation';
import type { Bill, BillSettings, Item, Participant } from '@/types/bill';

import { useSyncStore } from './sync';

export const BILLS_STORE_VERSION = 3;

type StoredBill = Omit<
  Bill,
  'role' | 'ownerId' | 'joinCode' | 'myParticipantId' | 'syncedAt' | 'participants'
> &
  Partial<Pick<Bill, 'role' | 'ownerId' | 'joinCode' | 'myParticipantId' | 'syncedAt'>> & {
    participants: (Omit<Participant, 'paidAt' | 'profileId'> & Partial<Participant>)[];
  };

// v1 (app 0.1.0) had no payment status; v2 (0.2.0) had no online fields. Older bills stay
// on the device (ownerId null) until the local-to-server migration uploads them.
export function migrateBillsState(
  persisted: unknown,
  version: number,
): { bills: Record<string, Bill> } {
  const state = (persisted ?? {}) as { bills?: Record<string, StoredBill> };
  const bills = state.bills ?? {};
  if (version >= BILLS_STORE_VERSION) return { bills: bills as Record<string, Bill> };
  const migrated: Record<string, Bill> = {};
  for (const [id, bill] of Object.entries(bills)) {
    migrated[id] = {
      ...bill,
      role: bill.role ?? 'owner',
      ownerId: bill.ownerId ?? null,
      joinCode: bill.joinCode ?? null,
      myParticipantId: bill.myParticipantId ?? null,
      syncedAt: bill.syncedAt ?? null,
      participants: bill.participants.map((p): Participant => ({
        ...p,
        paidAt: p.paidAt ?? null,
        profileId: p.profileId ?? null,
      })),
    };
  }
  return { bills: migrated };
}

export const DEFAULT_SETTINGS: BillSettings = {
  servicePct: 0,
  taxPct: 0,
  taxAfterService: true,
  discountType: 'amount',
  discountValue: 0,
  extraFee: 0,
  roundingStep: 100,
};

export type NewBillInput = {
  title: string;
  date?: string;
  payerName: string;
  // From a saved group (F-09): everyone becomes a participant; the payer must be one of them.
  members?: { name: string; color: string }[];
  // Signed-in account: the bill goes online and the participant with this name is "me".
  owner?: { userId: string; displayName: string } | null;
};

export type ItemInput = Pick<Item, 'name' | 'unitPrice' | 'qty'>;

const NOT_FOUND = 'Tagihan tidak ditemukan.';
const OWNER_ONLY = 'Hanya pembuat tagihan yang bisa mengubah ini.';

type BillsState = {
  bills: Record<string, Bill>;
  // Each action returns an error message for the user, or the result on success.
  createBill: (input: NewBillInput) => Parsed<string>;
  addParticipant: (billId: string, name: string) => Parsed<string>;
  renameParticipant: (billId: string, participantId: string, name: string) => Parsed<string>;
  removeParticipant: (billId: string, participantId: string) => void;
  setPayer: (billId: string, participantId: string) => void;
  // Manual payment status; the payer paid at the till and cannot be marked.
  markPaid: (billId: string, participantId: string) => void;
  unmarkPaid: (billId: string, participantId: string) => void;
  addItem: (billId: string, input: ItemInput) => Parsed<string>;
  updateItem: (billId: string, itemId: string, input: ItemInput) => Parsed<string>;
  removeItem: (billId: string, itemId: string) => void;
  toggleEater: (billId: string, itemId: string, participantId: string) => void;
  toggleAllEaters: (billId: string, itemId: string) => void;
  updateSettings: (billId: string, patch: Partial<BillSettings>) => void;
  // From the server: replace a bill with the latest snapshot, record its join code, or forget it.
  applyRemoteBill: (bill: Bill) => void;
  markSynced: (billId: string, joinCode?: string) => void;
  forgetBill: (billId: string) => void;
};

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.round(value), min), max);
}

function sanitizeSettings(settings: BillSettings): BillSettings {
  return {
    ...settings,
    servicePct: clampPercent(settings.servicePct),
    taxPct: clampPercent(settings.taxPct),
    discountValue:
      settings.discountType === 'percent'
        ? clampPercent(settings.discountValue)
        : clampInt(settings.discountValue, 0, MAX_PRICE),
    extraFee: clampInt(settings.extraFee, 0, MAX_PRICE),
  };
}

function validateItem(input: ItemInput): Parsed<ItemInput> {
  const name = validateItemName(input.name);
  if (!name.ok) return name;
  return {
    ok: true,
    value: {
      name: name.value,
      unitPrice: clampInt(input.unitPrice, 0, MAX_PRICE),
      qty: clampInt(input.qty, 1, MAX_QTY),
    },
  };
}

function sameName(a: string, b: string): boolean {
  return normalizeName(a).toLocaleLowerCase('id') === normalizeName(b).toLocaleLowerCase('id');
}

// Joined bills always sync; own bills sync once they belong to an account.
function isOnline(bill: Bill): boolean {
  return bill.role === 'participant' || bill.ownerId !== null;
}

function queue(bill: Bill | undefined, ...ops: SyncOp[]) {
  if (bill && isOnline(bill) && ops.length > 0) useSyncStore.getState().enqueue(...ops);
}

function shareOp(bill: Bill, itemId: string, participantId: string, eating: boolean): SyncOp {
  return { kind: eating ? 'addShare' : 'removeShare', billId: bill.id, itemId, participantId };
}

export const useBillsStore = create<BillsState>()(
  persist(
    (set, get) => {
      // Applies `update` to one bill and returns the result; undefined if it does not exist.
      const updateBill = (billId: string, update: (bill: Bill) => Bill): Bill | undefined => {
        let next: Bill | undefined;
        set((state) => {
          const bill = state.bills[billId];
          if (!bill) return state;
          next = update(bill);
          return { bills: { ...state.bills, [billId]: next } };
        });
        return next;
      };

      const ownBill = (billId: string): Parsed<Bill> => {
        const bill = get().bills[billId];
        if (!bill) return { ok: false, error: NOT_FOUND };
        if (bill.role !== 'owner') return { ok: false, error: OWNER_ONLY };
        return { ok: true, value: bill };
      };

      return {
        bills: {},

        createBill: ({ title, date, payerName, members, owner }) => {
          const validTitle = validateBillTitle(title);
          if (!validTitle.ok) return validTitle;

          let participants: Participant[];
          let payerId: string;
          if (members && members.length > 0) {
            participants = members.map((m) => ({
              id: createId(),
              name: m.name,
              color: m.color,
              paidAt: null,
              profileId: null,
            }));
            const payer = participants.find((p) => sameName(p.name, payerName));
            if (!payer) {
              return { ok: false, error: 'Pilih yang bayar ke kasir dari anggota grup.' };
            }
            payerId = payer.id;
          } else {
            const validPayer = validateParticipantName(payerName, []);
            if (!validPayer.ok) return validPayer;
            const payer: Participant = {
              id: createId(),
              name: validPayer.value,
              color: pickAvatarColor([]),
              paidAt: null,
              profileId: null,
            };
            participants = [payer];
            payerId = payer.id;
          }

          // Link "me" only when exactly one name matches the account name.
          const matches = owner
            ? participants.filter((p) => sameName(p.name, owner.displayName))
            : [];
          const me = owner && matches.length === 1 ? matches[0] : undefined;
          if (me && owner) {
            participants = participants.map((p) =>
              p.id === me.id ? { ...p, profileId: owner.userId } : p,
            );
          }

          const bill: Bill = {
            id: createId(),
            title: validTitle.value,
            date: date ?? todayIsoDate(),
            payerId,
            participants,
            items: [],
            settings: { ...DEFAULT_SETTINGS },
            createdAt: Date.now(),
            role: 'owner',
            ownerId: owner?.userId ?? null,
            joinCode: null,
            myParticipantId: me?.id ?? null,
            syncedAt: null,
          };
          set((state) => ({ bills: { ...state.bills, [bill.id]: bill } }));
          queue(bill, ...opsForNewBill(bill));
          return { ok: true, value: bill.id };
        },

        addParticipant: (billId, name) => {
          const own = ownBill(billId);
          if (!own.ok) return own;
          const bill = own.value;
          const valid = validateParticipantName(name, bill.participants);
          if (!valid.ok) return valid;
          const participant: Participant = {
            id: createId(),
            name: valid.value,
            color: pickAvatarColor(bill.participants.map((p) => p.color)),
            paidAt: null,
            profileId: null,
          };
          const next = updateBill(billId, (b) => ({
            ...b,
            participants: [...b.participants, participant],
          }));
          queue(next, { kind: 'upsertParticipant', billId, participantId: participant.id });
          return { ok: true, value: participant.id };
        },

        renameParticipant: (billId, participantId, name) => {
          const own = ownBill(billId);
          if (!own.ok) return own;
          const valid = validateParticipantName(name, own.value.participants, participantId);
          if (!valid.ok) return valid;
          const next = updateBill(billId, (b) => ({
            ...b,
            participants: b.participants.map((p) =>
              p.id === participantId ? { ...p, name: valid.value } : p,
            ),
          }));
          queue(next, { kind: 'upsertParticipant', billId, participantId });
          return { ok: true, value: participantId };
        },

        removeParticipant: (billId, participantId) => {
          if (!ownBill(billId).ok) return;
          const next = updateBill(billId, (b) => {
            const participants = b.participants.filter((p) => p.id !== participantId);
            return {
              ...b,
              participants,
              payerId: b.payerId === participantId ? (participants[0]?.id ?? null) : b.payerId,
              myParticipantId: b.myParticipantId === participantId ? null : b.myParticipantId,
              items: b.items.map((item) => ({
                ...item,
                eaterIds: item.eaterIds.filter((id) => id !== participantId),
              })),
            };
          });
          // The server clears the payer when that person is deleted; then set the new one.
          queue(
            next,
            { kind: 'deleteParticipant', billId, participantId },
            { kind: 'setPayer', billId },
          );
        },

        markPaid: (billId, participantId) => {
          if (!ownBill(billId).ok) return;
          const next = updateBill(billId, (b) => ({
            ...b,
            participants: b.participants.map((p) =>
              p.id === participantId && p.id !== b.payerId && p.paidAt === null
                ? { ...p, paidAt: Date.now() }
                : p,
            ),
          }));
          queue(next, { kind: 'setPaid', billId, participantId });
        },

        unmarkPaid: (billId, participantId) => {
          if (!ownBill(billId).ok) return;
          const next = updateBill(billId, (b) => ({
            ...b,
            participants: b.participants.map((p) =>
              p.id === participantId ? { ...p, paidAt: null } : p,
            ),
          }));
          queue(next, { kind: 'setPaid', billId, participantId });
        },

        setPayer: (billId, participantId) => {
          if (!ownBill(billId).ok) return;
          const next = updateBill(billId, (b) =>
            b.participants.some((p) => p.id === participantId)
              ? { ...b, payerId: participantId }
              : b,
          );
          queue(next, { kind: 'setPayer', billId });
        },

        addItem: (billId, input) => {
          const own = ownBill(billId);
          if (!own.ok) return own;
          const valid = validateItem(input);
          if (!valid.ok) return valid;
          const item: Item = { id: createId(), ...valid.value, eaterIds: [] };
          const next = updateBill(billId, (b) => ({ ...b, items: [...b.items, item] }));
          queue(next, { kind: 'upsertItem', billId, itemId: item.id });
          return { ok: true, value: item.id };
        },

        updateItem: (billId, itemId, input) => {
          const own = ownBill(billId);
          if (!own.ok) return own;
          const valid = validateItem(input);
          if (!valid.ok) return valid;
          const next = updateBill(billId, (b) => ({
            ...b,
            items: b.items.map((item) => (item.id === itemId ? { ...item, ...valid.value } : item)),
          }));
          queue(next, { kind: 'upsertItem', billId, itemId });
          return { ok: true, value: itemId };
        },

        removeItem: (billId, itemId) => {
          if (!ownBill(billId).ok) return;
          const next = updateBill(billId, (b) => ({
            ...b,
            items: b.items.filter((item) => item.id !== itemId),
          }));
          queue(next, { kind: 'deleteItem', billId, itemId });
        },

        toggleEater: (billId, itemId, participantId) => {
          const bill = get().bills[billId];
          if (!bill) return;
          // People who joined can only change their own choices (RLS enforces this too).
          if (bill.role === 'participant' && participantId !== bill.myParticipantId) return;
          let eating = false;
          const next = updateBill(billId, (b) => ({
            ...b,
            items: b.items.map((item) => {
              if (item.id !== itemId) return item;
              eating = !item.eaterIds.includes(participantId);
              const eaterIds = eating
                ? [...item.eaterIds, participantId]
                : item.eaterIds.filter((id) => id !== participantId);
              return { ...item, eaterIds };
            }),
          }));
          if (next) queue(next, shareOp(next, itemId, participantId, eating));
        },

        toggleAllEaters: (billId, itemId) => {
          if (!ownBill(billId).ok) return;
          let changes: SyncOp[] = [];
          const next = updateBill(billId, (b) => {
            const allIds = b.participants.map((p) => p.id);
            return {
              ...b,
              items: b.items.map((item) => {
                if (item.id !== itemId) return item;
                const everyoneSelected = allIds.every((id) => item.eaterIds.includes(id));
                const eaterIds = everyoneSelected ? [] : allIds;
                changes = allIds
                  .filter((id) => item.eaterIds.includes(id) !== eaterIds.includes(id))
                  .map((id) => shareOp(b, itemId, id, eaterIds.includes(id)));
                return { ...item, eaterIds };
              }),
            };
          });
          queue(next, ...changes);
        },

        updateSettings: (billId, patch) => {
          if (!ownBill(billId).ok) return;
          const next = updateBill(billId, (b) => ({
            ...b,
            settings: sanitizeSettings({ ...b.settings, ...patch }),
          }));
          queue(next, { kind: 'upsertBill', billId });
        },

        applyRemoteBill: (bill) => {
          set((state) => ({ bills: { ...state.bills, [bill.id]: bill } }));
        },

        markSynced: (billId, joinCode) => {
          updateBill(billId, (b) => ({
            ...b,
            syncedAt: Date.now(),
            joinCode: joinCode ?? b.joinCode,
          }));
        },

        forgetBill: (billId) => {
          set((state) => {
            const { [billId]: _removed, ...rest } = state.bills;
            return { bills: rest };
          });
          useSyncStore.getState().dropBill(billId);
        },
      };
    },
    {
      name: 'patungan-bills',
      version: BILLS_STORE_VERSION,
      migrate: migrateBillsState,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ bills: state.bills }),
    },
  ),
);
