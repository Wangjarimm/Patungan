import { checkJoinCode, isValidJoinCode, JOIN_CODE_ALPHABET, normalizeJoinCode } from './join-code';

describe('join code alphabet', () => {
  it('has 32 characters without O, 0, I, and 1', () => {
    expect(JOIN_CODE_ALPHABET).toHaveLength(32);
    expect(new Set(JOIN_CODE_ALPHABET).size).toBe(32);
    for (const ambiguous of ['O', '0', 'I', '1']) {
      expect(JOIN_CODE_ALPHABET).not.toContain(ambiguous);
    }
  });

  it('accepts every alphabet character', () => {
    for (const char of JOIN_CODE_ALPHABET) {
      expect(isValidJoinCode(char.repeat(6))).toBe(true);
    }
  });
});

describe('normalizeJoinCode', () => {
  it('uppercases and removes spaces', () => {
    expect(normalizeJoinCode(' mek 482 ')).toBe('MEK482');
  });
});

describe('checkJoinCode (F-13)', () => {
  it('accepts a valid code typed loosely', () => {
    expect(checkJoinCode('mek482')).toEqual({ ok: true, code: 'MEK482' });
  });

  it('rejects the PRD example MIE482 because it contains an I', () => {
    expect(checkJoinCode('MIE482').ok).toBe(false);
  });

  it.each([
    ['', /Isi kode gabung/],
    ['MEK48', /harus 6 karakter/],
    ['MEK4822', /harus 6 karakter/],
    ['MEO482', /tidak memakai huruf O, I/],
    ['MEK401', /tidak memakai huruf O, I/],
    ['MEK48!', /tidak memakai huruf O, I/],
  ])('rejects %p with a clear message', (input, message) => {
    const result = checkJoinCode(input);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(message);
  });
});
