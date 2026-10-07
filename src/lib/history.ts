// Bill history: sorting, filtering, and sections for the Riwayat screen (F-10).

import type { Bill } from '@/types/bill';

import { formatMonthYear } from './format';
import { summarizeBill, type BillSummary } from './summary';

export type HistoryFilter = 'all' | 'unpaid' | 'settled';

export type HistorySection = {
  key: string;
  title: string;
  // 'unpaid' sections render as cards at the top; 'month' sections as plain rows.
  kind: 'unpaid' | 'month';
  data: BillSummary[];
};

export type History = {
  sections: HistorySection[];
  counts: Record<HistoryFilter, number>;
};

// Newest first: by bill date, then by creation time.
export function sortBillsByRecent(bills: Record<string, Bill>): Bill[] {
  return Object.values(bills).sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  );
}

// Unpaid bills first, then the rest grouped by month, newest first.
export function buildHistory(bills: Record<string, Bill>, filter: HistoryFilter): History {
  const summaries = sortBillsByRecent(bills).map(summarizeBill);
  const unpaid = summaries.filter((s) => s.status === 'unpaid');
  const counts = {
    all: summaries.length,
    unpaid: unpaid.length,
    settled: summaries.filter((s) => s.status === 'settled').length,
  };

  const sections: HistorySection[] = [];
  if (filter !== 'settled' && unpaid.length > 0) {
    sections.push({ key: 'unpaid', title: 'Belum lunas', kind: 'unpaid', data: unpaid });
  }

  if (filter !== 'unpaid') {
    const rest = summaries.filter((s) =>
      filter === 'settled' ? s.status === 'settled' : s.status !== 'unpaid',
    );
    const byMonth = new Map<string, BillSummary[]>();
    for (const summary of rest) {
      const month = summary.bill.date.slice(0, 7);
      byMonth.set(month, [...(byMonth.get(month) ?? []), summary]);
    }
    for (const [month, data] of byMonth) {
      sections.push({ key: month, title: formatMonthYear(`${month}-01`), kind: 'month', data });
    }
  }

  return { sections, counts };
}
