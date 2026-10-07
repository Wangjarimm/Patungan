// Display formatting for Rupiah amounts, percentages, and dates (Indonesian locale).

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];
const MONTH_NAMES_LONG = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

// Rounds to the nearest Rupiah and adds dot thousand separators: 243900 -> "243.900".
export function formatNumber(value: number): string {
  const rounded = Math.round(value);
  // Avoid "-0" for tiny negative noise.
  const safe = Object.is(rounded, -0) ? 0 : rounded;
  const digits = Math.abs(safe)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return safe < 0 ? `-${digits}` : digits;
}

// 243900 -> "Rp243.900"
export function formatRupiah(value: number): string {
  const formatted = formatNumber(value);
  return formatted.startsWith('-') ? `-Rp${formatted.slice(1)}` : `Rp${formatted}`;
}

// 5 -> "5%", 7.5 -> "7,5%"
export function formatPercent(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded.toString().replace('.', ',')}%`;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

// Local calendar date as YYYY-MM-DD.
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayIsoDate(now: Date = new Date()): string {
  return toIsoDate(now);
}

// Parses YYYY-MM-DD as a local date, avoiding the UTC shift of `new Date('YYYY-MM-DD')`.
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

// "Sabtu, 3 Okt"
export function formatDateShort(iso: string): string {
  const date = parseIsoDate(iso);
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

// "Sabtu, 3 Okt 2026"
export function formatDateLong(iso: string): string {
  return `${formatDateShort(iso)} ${parseIsoDate(iso).getFullYear()}`;
}

// "Oktober 2026"
export function formatMonthYear(iso: string): string {
  const date = parseIsoDate(iso);
  return `${MONTH_NAMES_LONG[date.getMonth()]} ${date.getFullYear()}`;
}
