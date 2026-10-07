import { useBillsStore } from '@/stores/bills';
import type { BillSettings } from '@/types/bill';

function ok<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

// Seeds the Kedai Mie Kenari reference bill from the PRD into the store.
export function seedKenari(settings: Partial<BillSettings> = {}) {
  const store = () => useBillsStore.getState();
  const billId = ok(
    store().createBill({ title: 'Kedai Mie Kenari', date: '2026-10-03', payerName: 'Raka' }),
  );
  const ids: Record<string, string> = { Raka: store().bills[billId]?.payerId ?? '' };
  for (const name of ['Dinda', 'Bima', 'Sekar', 'Fajar']) {
    ids[name] = ok(store().addParticipant(billId, name));
  }
  const menu: [string, number, number, string[]][] = [
    ['Mie goreng spesial', 32000, 2, ['Raka', 'Bima']],
    ['Nasi goreng kampung', 28000, 1, ['Dinda']],
    ['Kwetiau siram', 30000, 1, ['Sekar']],
    ['Mie kuah seafood', 35000, 1, ['Fajar']],
    ['Pisang goreng keju', 24000, 1, ['Dinda', 'Sekar']],
    ['Es teh manis', 6000, 5, ['Raka', 'Dinda', 'Bima', 'Sekar', 'Fajar']],
  ];
  for (const [name, unitPrice, qty, eaters] of menu) {
    const itemId = ok(store().addItem(billId, { name, unitPrice, qty }));
    for (const eater of eaters) {
      store().toggleEater(billId, itemId, ids[eater] ?? '');
    }
  }
  if (Object.keys(settings).length > 0) {
    store().updateSettings(billId, settings);
  }
  return { billId, ids };
}
