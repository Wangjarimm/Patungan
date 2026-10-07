// Join codes (F-13): 6 characters without the look-alikes O, 0, I, and 1.
// Must match generate_join_code() and the bills.join_code check in supabase/migrations.

export const JOIN_CODE_LENGTH = 6;
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const VALID = /^[A-HJ-NP-Z2-9]{6}$/;

// Uppercase and strip spaces, so "mie 482" and "MIE482" are the same code.
export function normalizeJoinCode(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

export function isValidJoinCode(code: string): boolean {
  return VALID.test(code);
}

export type JoinCodeCheck = { ok: true; code: string } | { ok: false; error: string };

export function checkJoinCode(input: string): JoinCodeCheck {
  const code = normalizeJoinCode(input);
  if (code.length === 0) {
    return { ok: false, error: 'Isi kode gabung 6 karakter dari temanmu.' };
  }
  if (code.length !== JOIN_CODE_LENGTH) {
    return { ok: false, error: `Kode gabung harus ${JOIN_CODE_LENGTH} karakter.` };
  }
  if (!isValidJoinCode(code)) {
    return {
      ok: false,
      error: 'Kode gabung tidak memakai huruf O, I, atau angka 0 dan 1. Cek lagi kodenya.',
    };
  }
  return { ok: true, code };
}
