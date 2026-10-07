// Input validation. Error messages are user-facing Indonesian text.

export const MAX_PRICE = 100_000_000;
export const MAX_QTY = 999;
export const MAX_TITLE_LENGTH = 60;
export const MAX_NAME_LENGTH = 30;

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function validateBillTitle(title: string): Parsed<string> {
  const value = normalizeName(title);
  if (value.length === 0) {
    return { ok: false, error: 'Isi nama tempat dulu, misalnya "Kedai Mie Kenari".' };
  }
  if (value.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: `Nama tempat maksimal ${MAX_TITLE_LENGTH} karakter.` };
  }
  return { ok: true, value };
}

export function validateItemName(name: string): Parsed<string> {
  const value = normalizeName(name);
  if (value.length === 0) {
    return { ok: false, error: 'Isi nama menu dulu.' };
  }
  if (value.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: `Nama menu maksimal ${MAX_TITLE_LENGTH} karakter.` };
  }
  return { ok: true, value };
}

// Rejects empty names and names already used by another participant (case-insensitive).
export function validateParticipantName(
  name: string,
  others: { id: string; name: string }[],
  selfId?: string,
): Parsed<string> {
  const value = normalizeName(name);
  if (value.length === 0) {
    return { ok: false, error: 'Isi nama dulu.' };
  }
  if (value.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Nama maksimal ${MAX_NAME_LENGTH} karakter.` };
  }
  const key = value.toLocaleLowerCase('id');
  const taken = others.some(
    (other) => other.id !== selfId && normalizeName(other.name).toLocaleLowerCase('id') === key,
  );
  if (taken) {
    return {
      ok: false,
      error: `Nama "${value}" sudah ada. Pakai nama lain, misalnya tambah inisial.`,
    };
  }
  return { ok: true, value };
}

// Parses a whole-Rupiah amount typed as "32000", "32.000", or "Rp 32.000".
export function parseRupiahInput(
  text: string,
  options: { allowEmpty?: boolean; label?: string } = {},
): Parsed<number> {
  const label = options.label ?? 'Harga';
  const cleaned = text.replace(/^\s*rp/i, '').replace(/[.\s]/g, '');
  if (cleaned.length === 0) {
    return options.allowEmpty
      ? { ok: true, value: 0 }
      : { ok: false, error: `${label} wajib diisi.` };
  }
  if (!/^\d+$/.test(cleaned)) {
    return { ok: false, error: `${label} hanya boleh angka bulat Rupiah, tanpa koma.` };
  }
  const value = Number(cleaned);
  if (value > MAX_PRICE) {
    return { ok: false, error: `${label} maksimal Rp100.000.000.` };
  }
  return { ok: true, value };
}

export function parseQtyInput(text: string): Parsed<number> {
  const cleaned = text.trim();
  if (!/^\d+$/.test(cleaned) || Number(cleaned) < 1) {
    return { ok: false, error: 'Jumlah minimal 1.' };
  }
  const value = Number(cleaned);
  if (value > MAX_QTY) {
    return { ok: false, error: `Jumlah maksimal ${MAX_QTY}.` };
  }
  return { ok: true, value };
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), 100);
}
