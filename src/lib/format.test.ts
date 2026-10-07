import {
  formatDateLong,
  formatDateShort,
  formatDecimal,
  formatMonthYear,
  formatNumber,
  formatPercent,
  formatRupiah,
  parseIsoDate,
  todayIsoDate,
  toIsoDate,
} from './format';

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1.000'],
    [243900, '243.900'],
    [100000000, '100.000.000'],
    [-1500, '-1.500'],
  ])('%d -> %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });

  it('rounds to the nearest Rupiah', () => {
    expect(formatNumber(3333.3333)).toBe('3.333');
    expect(formatNumber(2049.5)).toBe('2.050');
    expect(formatNumber(43890.00000000001)).toBe('43.890');
  });

  it('never prints -0', () => {
    expect(formatNumber(-0.2)).toBe('0');
  });
});

describe('formatRupiah', () => {
  it('uses Rp and dot separators', () => {
    expect(formatRupiah(243900)).toBe('Rp243.900');
    expect(formatRupiah(0)).toBe('Rp0');
    expect(formatRupiah(-5000)).toBe('-Rp5.000');
  });
});

describe('formatDecimal', () => {
  it('uses a decimal comma and at most two decimals', () => {
    expect(formatDecimal(11)).toBe('11');
    expect(formatDecimal(5.5)).toBe('5,5');
    expect(formatDecimal(12.345)).toBe('12,35');
  });
});

describe('formatPercent', () => {
  it('uses a decimal comma', () => {
    expect(formatPercent(5)).toBe('5%');
    expect(formatPercent(7.5)).toBe('7,5%');
    expect(formatPercent(0)).toBe('0%');
  });
});

describe('dates', () => {
  it('round-trips a local date', () => {
    expect(toIsoDate(parseIsoDate('2026-10-03'))).toBe('2026-10-03');
  });

  it('falls back to January 1st for missing date parts', () => {
    expect(toIsoDate(parseIsoDate('2026'))).toBe('2026-01-01');
  });

  it('returns today as a local date', () => {
    expect(todayIsoDate(new Date(2026, 0, 9, 23, 59))).toBe('2026-01-09');
  });

  it('formats in Indonesian', () => {
    expect(formatDateShort('2026-10-03')).toBe('Sabtu, 3 Okt');
    expect(formatDateLong('2026-10-07')).toBe('Rabu, 7 Okt 2026');
    expect(formatMonthYear('2026-08-17')).toBe('Agustus 2026');
  });
});
