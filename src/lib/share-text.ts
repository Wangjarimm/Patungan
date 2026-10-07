// Plain-text bill summary for sharing to WhatsApp or the clipboard (F-07).

import type { Bill } from '@/types/bill';

import type { BillResult } from './calc';
import { formatDateLong, formatPercent, formatRupiah } from './format';

export function buildShareText(bill: Bill, result: BillResult): string {
  const payer = bill.participants.find((p) => p.id === bill.payerId);
  const { settings } = bill;
  const lines: string[] = [`*${bill.title}*`, formatDateLong(bill.date), ''];

  lines.push(`Total: ${formatRupiah(result.totals.rounded)}`);
  if (payer) {
    lines.push(`Dibayar dulu oleh ${payer.name}`);
  }

  lines.push('', 'Bagian tiap orang:');
  for (const share of result.people) {
    const person = bill.participants.find((p) => p.id === share.participantId);
    if (!person) continue;
    const note = person.id === bill.payerId ? ' (sudah bayar ke kasir)' : '';
    lines.push(`- ${person.name}: ${formatRupiah(share.rounded)}${note}`);
  }

  const extras: string[] = [];
  if (result.totals.discount > 0) extras.push(`diskon ${formatRupiah(result.totals.discount)}`);
  if (settings.servicePct > 0) extras.push(`service ${formatPercent(settings.servicePct)}`);
  if (settings.taxPct > 0) extras.push(`pajak ${formatPercent(settings.taxPct)}`);
  if (extras.length > 0) {
    lines.push('', `Sudah termasuk ${extras.join(', ')}, dibagi sesuai porsi pesanan.`);
  }
  if (result.totals.extraFee > 0) {
    lines.push(`Ongkir ${formatRupiah(result.totals.extraFee)} dibagi rata.`);
  }

  if (payer) {
    lines.push('', `Transfer ke ${payer.name} ya. Terima kasih!`);
  }

  return lines.join('\n');
}
