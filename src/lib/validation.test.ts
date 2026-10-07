import {
  clampPercent,
  normalizeName,
  parsePercentInput,
  parseQtyInput,
  parseRupiahInput,
  validateBillTitle,
  validateGroupName,
  validateItemName,
  validateParticipantName,
} from './validation';

describe('normalizeName', () => {
  it('trims and collapses spaces', () => {
    expect(normalizeName('  Kedai   Mie  ')).toBe('Kedai Mie');
  });
});

describe('validateBillTitle', () => {
  it('rejects an empty title with a clear message', () => {
    const result = validateBillTitle('   ');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/nama tempat/i);
  });

  it('accepts and normalizes a title', () => {
    expect(validateBillTitle(' Kedai Mie Kenari ')).toEqual({
      ok: true,
      value: 'Kedai Mie Kenari',
    });
  });

  it('rejects an overly long title', () => {
    expect(validateBillTitle('x'.repeat(61)).ok).toBe(false);
  });
});

describe('validateItemName', () => {
  it('requires a name', () => {
    expect(validateItemName('').ok).toBe(false);
    expect(validateItemName('x'.repeat(61)).ok).toBe(false);
    expect(validateItemName('Es teh')).toEqual({ ok: true, value: 'Es teh' });
  });
});

describe('validateParticipantName', () => {
  const others = [
    { id: '1', name: 'Raka' },
    { id: '2', name: 'Dinda' },
  ];

  it('rejects duplicates regardless of case and spacing', () => {
    expect(validateParticipantName(' raka ', others).ok).toBe(false);
    expect(validateParticipantName('DINDA', others).ok).toBe(false);
  });

  it('allows keeping your own name when renaming', () => {
    expect(validateParticipantName('raka', others, '1')).toEqual({ ok: true, value: 'raka' });
  });

  it('rejects an empty or overly long name', () => {
    expect(validateParticipantName('  ', others).ok).toBe(false);
    expect(validateParticipantName('x'.repeat(31), others).ok).toBe(false);
  });

  it('accepts a new name', () => {
    expect(validateParticipantName('Fajar', others)).toEqual({ ok: true, value: 'Fajar' });
  });
});

describe('parseRupiahInput', () => {
  it.each([
    ['32000', 32000],
    ['32.000', 32000],
    ['Rp 32.000', 32000],
    ['0', 0],
    ['100.000.000', 100000000],
  ])('%s -> %d', (text, value) => {
    expect(parseRupiahInput(text)).toEqual({ ok: true, value });
  });

  it.each(['', '12,5', '-1000', 'abc', '100.000.001'])('rejects %p', (text) => {
    expect(parseRupiahInput(text).ok).toBe(false);
  });

  it('treats empty as zero when allowed', () => {
    expect(parseRupiahInput('', { allowEmpty: true })).toEqual({ ok: true, value: 0 });
  });

  it('uses the field label in errors', () => {
    const result = parseRupiahInput('x', { label: 'Ongkir' });
    expect(!result.ok && result.error).toMatch(/^Ongkir/);
  });
});

describe('parseQtyInput', () => {
  it('requires a whole number of at least 1', () => {
    expect(parseQtyInput('2')).toEqual({ ok: true, value: 2 });
    expect(parseQtyInput('0').ok).toBe(false);
    expect(parseQtyInput('1.5').ok).toBe(false);
    expect(parseQtyInput('').ok).toBe(false);
    expect(parseQtyInput('1000').ok).toBe(false);
  });
});

describe('clampPercent', () => {
  it('clamps to 0..100', () => {
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(7.5)).toBe(7.5);
    expect(clampPercent(Number.NaN)).toBe(0);
  });
});

describe('parsePercentInput', () => {
  it.each([
    ['10', 10],
    ['7,5', 7.5],
    ['7.5', 7.5],
    ['12,25 %', 12.25],
    ['0', 0],
    ['100', 100],
  ])('%s -> %d', (text, value) => {
    expect(parsePercentInput(text)).toEqual({ ok: true, value });
  });

  it.each(['', 'abc', '-5', '100,5', '1,234', '5,'])('rejects %p', (text) => {
    expect(parsePercentInput(text).ok).toBe(false);
  });

  it('treats empty as zero when allowed and uses the label', () => {
    expect(parsePercentInput(' ', { allowEmpty: true })).toEqual({ ok: true, value: 0 });
    const result = parsePercentInput('x', { label: 'Diskon' });
    expect(!result.ok && result.error).toMatch(/^Diskon/);
  });
});

describe('validateGroupName', () => {
  it('requires a name up to 40 characters', () => {
    expect(validateGroupName('  Kos   Melati ')).toEqual({ ok: true, value: 'Kos Melati' });
    expect(validateGroupName('').ok).toBe(false);
    expect(validateGroupName('x'.repeat(41)).ok).toBe(false);
  });
});
