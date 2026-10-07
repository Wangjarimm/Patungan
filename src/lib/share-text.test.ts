import type { Bill } from '@/types/bill';

import { calculateBill } from './calc';
import { buildShareText } from './share-text';

const everyone = ['raka', 'dinda', 'bima', 'sekar', 'fajar'];

const kenari: Bill = {
  id: 'bill-1',
  title: 'Kedai Mie Kenari',
  date: '2026-10-03',
  payerId: 'raka',
  createdAt: 0,
  participants: everyone.map((id) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    color: 'avatar',
  })),
  items: [
    { id: 'i1', name: 'Mie goreng spesial', unitPrice: 32000, qty: 2, eaterIds: ['raka', 'bima'] },
    { id: 'i2', name: 'Nasi goreng kampung', unitPrice: 28000, qty: 1, eaterIds: ['dinda'] },
    { id: 'i3', name: 'Kwetiau siram', unitPrice: 30000, qty: 1, eaterIds: ['sekar'] },
    { id: 'i4', name: 'Mie kuah seafood', unitPrice: 35000, qty: 1, eaterIds: ['fajar'] },
    {
      id: 'i5',
      name: 'Pisang goreng keju',
      unitPrice: 24000,
      qty: 1,
      eaterIds: ['dinda', 'sekar'],
    },
    { id: 'i6', name: 'Es teh manis', unitPrice: 6000, qty: 5, eaterIds: everyone },
  ],
  settings: {
    servicePct: 5,
    taxPct: 10,
    taxAfterService: true,
    discountType: 'amount',
    discountValue: 0,
    extraFee: 0,
    roundingStep: 100,
  },
};

describe('buildShareText', () => {
  const text = buildShareText(kenari, calculateBill(kenari));

  it('includes the total, payer, and every share', () => {
    expect(text).toContain('*Kedai Mie Kenari*');
    expect(text).toContain('Sabtu, 3 Okt 2026');
    expect(text).toContain('Total: Rp243.900');
    expect(text).toContain('Dibayar dulu oleh Raka');
    expect(text).toContain('- Raka: Rp43.900 (sudah bayar ke kasir)');
    expect(text).toContain('- Bima: Rp43.900');
    expect(text).toContain('- Dinda: Rp53.200');
    expect(text).toContain('- Sekar: Rp55.500');
    expect(text).toContain('- Fajar: Rp47.400');
    expect(text).toContain('Transfer ke Raka ya.');
  });

  it('mentions service and tax', () => {
    expect(text).toContain('Sudah termasuk service 5%, pajak 10%');
  });

  it('mentions discount and delivery fee when present', () => {
    const bill: Bill = {
      ...kenari,
      settings: { ...kenari.settings, discountValue: 10000, extraFee: 15000 },
    };
    const withExtras = buildShareText(bill, calculateBill(bill));
    expect(withExtras).toContain('diskon Rp10.000');
    expect(withExtras).toContain('Ongkir Rp15.000 dibagi rata.');
  });

  it('works without a payer', () => {
    const bill: Bill = { ...kenari, payerId: null };
    const noPayer = buildShareText(bill, calculateBill(bill));
    expect(noPayer).not.toContain('Dibayar dulu');
    expect(noPayer).not.toContain('Transfer ke');
  });
});
