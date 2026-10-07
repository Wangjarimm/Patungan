// Turns Supabase and network failures into a few kinds the UI can explain.

export type SyncErrorKind = 'offline' | 'unavailable' | 'anonymous_disabled' | 'unknown';

type ErrorLike = { message?: string; status?: number; code?: string } | null | undefined;

export function classifyError(error: ErrorLike | unknown): SyncErrorKind {
  const e = (error ?? {}) as { message?: unknown; status?: unknown; code?: unknown };
  const message = typeof e.message === 'string' ? e.message.toLowerCase() : '';
  const status = typeof e.status === 'number' ? e.status : undefined;

  if (message.includes('anonymous sign-ins are disabled')) return 'anonymous_disabled';
  if (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('networkerror') ||
    status === 0
  ) {
    return 'offline';
  }
  // A paused free project or a server outage.
  if (status !== undefined && (status === 503 || status === 540 || status >= 520)) {
    return 'unavailable';
  }
  return 'unknown';
}

export const SYNC_ERROR_MESSAGES: Record<SyncErrorKind, string> = {
  offline: 'Sedang offline. Perubahan disimpan di HP dan dikirim saat online.',
  unavailable: 'Server Patungan sedang tidak bisa dihubungi. Coba lagi sebentar lagi.',
  anonymous_disabled: 'Login tamu belum diaktifkan di server Patungan.',
  unknown: 'Gagal tersambung ke server. Coba lagi.',
};
