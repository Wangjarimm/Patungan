import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { pickAvatarColor } from '@/lib/avatar';
import { todayIsoDate } from '@/lib/format';
import { createId } from '@/lib/id';
import {
  clampPercent,
  MAX_PRICE,
  MAX_QTY,
  validateBillTitle,
  validateItemName,
  validateParticipantName,
  type Parsed,
} from '@/lib/validation';
import type { Bill, BillSettings, Item } from '@/types/bill';

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
};

export type ItemInput = Pick<Item, 'name' | 'unitPrice' | 'qty'>;

type BillsState = {
  bills: Record<string, Bill>;
  // Each action returns an error message for the user, or the result on success.
  createBill: (input: NewBillInput) => Parsed<string>;
  addParticipant: (billId: string, name: string) => Parsed<string>;
  renameParticipant: (billId: string, participantId: string, name: string) => Parsed<string>;
  removeParticipant: (billId: string, participantId: string) => void;
  setPayer: (billId: string, participantId: string) => void;
  addItem: (billId: string, input: ItemInput) => Parsed<string>;
  updateItem: (billId: string, itemId: string, input: ItemInput) => Parsed<string>;
  removeItem: (billId: string, itemId: string) => void;
  toggleEater: (billId: string, itemId: string, participantId: string) => void;
  toggleAllEaters: (billId: string, itemId: string) => void;
  updateSettings: (billId: string, patch: Partial<BillSettings>) => void;
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

export const useBillsStore = create<BillsState>()(
  persist(
    (set, get) => {
      // Applies `update` to one bill; no-op if the bill does not exist.
      const updateBill = (billId: string, update: (bill: Bill) => Bill) => {
        set((state) => {
          const bill = state.bills[billId];
          if (!bill) return state;
          return { bills: { ...state.bills, [billId]: update(bill) } };
        });
      };

      return {
        bills: {},

        createBill: ({ title, date, payerName }) => {
          const validTitle = validateBillTitle(title);
          if (!validTitle.ok) return validTitle;
          const validPayer = validateParticipantName(payerName, []);
          if (!validPayer.ok) return validPayer;

          const payer = { id: createId(), name: validPayer.value, color: pickAvatarColor([]) };
          const bill: Bill = {
            id: createId(),
            title: validTitle.value,
            date: date ?? todayIsoDate(),
            payerId: payer.id,
            participants: [payer],
            items: [],
            settings: { ...DEFAULT_SETTINGS },
            createdAt: Date.now(),
          };
          set((state) => ({ bills: { ...state.bills, [bill.id]: bill } }));
          return { ok: true, value: bill.id };
        },

        addParticipant: (billId, name) => {
          const bill = get().bills[billId];
          if (!bill) return { ok: false, error: 'Tagihan tidak ditemukan.' };
          const valid = validateParticipantName(name, bill.participants);
          if (!valid.ok) return valid;
          const participant = {
            id: createId(),
            name: valid.value,
            color: pickAvatarColor(bill.participants.map((p) => p.color)),
          };
          updateBill(billId, (b) => ({ ...b, participants: [...b.participants, participant] }));
          return { ok: true, value: participant.id };
        },

        renameParticipant: (billId, participantId, name) => {
          const bill = get().bills[billId];
          if (!bill) return { ok: false, error: 'Tagihan tidak ditemukan.' };
          const valid = validateParticipantName(name, bill.participants, participantId);
          if (!valid.ok) return valid;
          updateBill(billId, (b) => ({
            ...b,
            participants: b.participants.map((p) =>
              p.id === participantId ? { ...p, name: valid.value } : p,
            ),
          }));
          return { ok: true, value: participantId };
        },

        removeParticipant: (billId, participantId) => {
          updateBill(billId, (b) => {
            const participants = b.participants.filter((p) => p.id !== participantId);
            return {
              ...b,
              participants,
              payerId: b.payerId === participantId ? (participants[0]?.id ?? null) : b.payerId,
              items: b.items.map((item) => ({
                ...item,
                eaterIds: item.eaterIds.filter((id) => id !== participantId),
              })),
            };
          });
        },

        setPayer: (billId, participantId) => {
          updateBill(billId, (b) =>
            b.participants.some((p) => p.id === participantId)
              ? { ...b, payerId: participantId }
              : b,
          );
        },

        addItem: (billId, input) => {
          if (!get().bills[billId]) return { ok: false, error: 'Tagihan tidak ditemukan.' };
          const valid = validateItem(input);
          if (!valid.ok) return valid;
          const item: Item = { id: createId(), ...valid.value, eaterIds: [] };
          updateBill(billId, (b) => ({ ...b, items: [...b.items, item] }));
          return { ok: true, value: item.id };
        },

        updateItem: (billId, itemId, input) => {
          const valid = validateItem(input);
          if (!valid.ok) return valid;
          updateBill(billId, (b) => ({
            ...b,
            items: b.items.map((item) => (item.id === itemId ? { ...item, ...valid.value } : item)),
          }));
          return { ok: true, value: itemId };
        },

        removeItem: (billId, itemId) => {
          updateBill(billId, (b) => ({
            ...b,
            items: b.items.filter((item) => item.id !== itemId),
          }));
        },

        toggleEater: (billId, itemId, participantId) => {
          updateBill(billId, (b) => ({
            ...b,
            items: b.items.map((item) => {
              if (item.id !== itemId) return item;
              const eaterIds = item.eaterIds.includes(participantId)
                ? item.eaterIds.filter((id) => id !== participantId)
                : [...item.eaterIds, participantId];
              return { ...item, eaterIds };
            }),
          }));
        },

        toggleAllEaters: (billId, itemId) => {
          updateBill(billId, (b) => {
            const allIds = b.participants.map((p) => p.id);
            return {
              ...b,
              items: b.items.map((item) => {
                if (item.id !== itemId) return item;
                const everyoneSelected = allIds.every((id) => item.eaterIds.includes(id));
                return { ...item, eaterIds: everyoneSelected ? [] : allIds };
              }),
            };
          });
        },

        updateSettings: (billId, patch) => {
          updateBill(billId, (b) => ({
            ...b,
            settings: sanitizeSettings({ ...b.settings, ...patch }),
          }));
        },
      };
    },
    {
      name: 'patungan-bills',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ bills: state.bills }),
    },
  ),
);

// Newest first: by bill date, then by creation time.
export function sortBillsByRecent(bills: Record<string, Bill>): Bill[] {
  return Object.values(bills).sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  );
}
