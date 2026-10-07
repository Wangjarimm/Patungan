// Network calls for online bills: sending outbox operations, fetching bills, joining (F-13 to F-15).

import type { SyncOp } from '@/lib/sync-ops';
import type { Bill } from '@/types/bill';

import type { PatunganClient } from './client';
import { classifyError } from './errors';
import { billToRow, itemToRow, participantToRow, rowsToBill } from './mappers';

export type SendResult =
  | { status: 'done'; joinCode?: string }
  // Offline or server down: keep the op and try again later.
  | { status: 'retry' }
  // The server refused it for good (RLS, constraint): drop it and reload the bill.
  | { status: 'rejected'; message: string };

type PgError = { message: string; code?: string; status?: number } | null;

function outcome(error: PgError, joinCode?: string): SendResult {
  if (!error) return { status: 'done', joinCode };
  const kind = classifyError(error);
  if (kind === 'offline' || kind === 'unavailable') return { status: 'retry' };
  return { status: 'rejected', message: error.message };
}

// Sends one operation using the latest local state of its bill. A missing bill or row means
// it was deleted locally after the op was queued; a later delete op covers the server.
export async function sendOp(
  client: PatunganClient,
  op: SyncOp,
  bill: Bill | undefined,
  myUserId: string,
): Promise<SendResult> {
  try {
    switch (op.kind) {
      case 'upsertBill': {
        if (!bill) return { status: 'done' };
        const { data, error } = await client
          .from('bills')
          .upsert(billToRow(bill), { onConflict: 'id' })
          .select('join_code')
          .single();
        return outcome(error, data?.join_code);
      }
      case 'setPayer': {
        if (!bill) return { status: 'done' };
        const { error } = await client
          .from('bills')
          .update({ payer_participant_id: bill.payerId })
          .eq('id', op.billId);
        return outcome(error);
      }
      case 'upsertParticipant': {
        const participant = bill?.participants.find((p) => p.id === op.participantId);
        if (!bill || !participant) return { status: 'done' };
        const { error } = await client
          .from('participants')
          .upsert(participantToRow(bill, participant), { onConflict: 'id' });
        return outcome(error);
      }
      case 'deleteParticipant': {
        const { error } = await client.from('participants').delete().eq('id', op.participantId);
        return outcome(error);
      }
      case 'setPaid': {
        const participant = bill?.participants.find((p) => p.id === op.participantId);
        if (!participant) return { status: 'done' };
        const paid = participant.paidAt !== null;
        const { error } = await client
          .from('participants')
          .update({
            paid_at: paid ? new Date(participant.paidAt ?? Date.now()).toISOString() : null,
            paid_marked_by: paid ? myUserId : null,
          })
          .eq('id', op.participantId);
        return outcome(error);
      }
      case 'upsertItem': {
        const item = bill?.items.find((i) => i.id === op.itemId);
        if (!bill || !item) return { status: 'done' };
        const { error } = await client
          .from('items')
          .upsert(itemToRow(bill, item), { onConflict: 'id' });
        return outcome(error);
      }
      case 'deleteItem': {
        const { error } = await client.from('items').delete().eq('id', op.itemId);
        return outcome(error);
      }
      case 'addShare': {
        const { error } = await client
          .from('item_shares')
          .upsert(
            { bill_id: op.billId, item_id: op.itemId, participant_id: op.participantId },
            { onConflict: 'item_id,participant_id', ignoreDuplicates: true },
          );
        return outcome(error);
      }
      case 'removeShare': {
        const { error } = await client
          .from('item_shares')
          .delete()
          .eq('item_id', op.itemId)
          .eq('participant_id', op.participantId);
        return outcome(error);
      }
    }
  } catch (error) {
    return outcome({ message: error instanceof Error ? error.message : String(error) });
  }
}

export type FetchResult =
  | { status: 'ok'; bill: Bill }
  // The bill is gone or this account can no longer see it.
  | { status: 'missing' }
  | { status: 'failed' };

export async function fetchBill(
  client: PatunganClient,
  billId: string,
  myUserId: string,
): Promise<FetchResult> {
  try {
    const [bill, participants, items, shares] = await Promise.all([
      client.from('bills').select('*').eq('id', billId).maybeSingle(),
      client.from('participants').select('*').eq('bill_id', billId),
      client.from('items').select('*').eq('bill_id', billId),
      client.from('item_shares').select('*').eq('bill_id', billId),
    ]);
    const error = bill.error ?? participants.error ?? items.error ?? shares.error;
    if (error) return { status: 'failed' };
    if (!bill.data) return { status: 'missing' };
    return {
      status: 'ok',
      bill: rowsToBill(
        {
          bill: bill.data,
          participants: participants.data ?? [],
          items: items.data ?? [],
          shares: shares.data ?? [],
        },
        myUserId,
      ),
    };
  } catch {
    return { status: 'failed' };
  }
}

// Every bill this account owns or joined; RLS does the filtering.
export async function fetchMemberBillIds(client: PatunganClient): Promise<string[] | null> {
  try {
    const { data, error } = await client.from('bills').select('id');
    if (error) return null;
    return data.map((row) => row.id);
  } catch {
    return null;
  }
}

// ---- Joining (F-13, F-14) ---------------------------------------------------

export type JoinPreview = {
  billId: string;
  title: string;
  date: string;
  isOwner: boolean;
  payerName: string | null;
  participantCount: number;
  myParticipantId: string | null;
  unclaimed: { id: string; name: string; color: string }[];
  colorsInUse: string[];
};

export type JoinResult<T> = { ok: true; value: T } | { ok: false; error: string };

const JOIN_ERRORS: Record<string, string> = {
  JOIN_CODE_NOT_FOUND: 'Kode tidak ditemukan. Cek lagi kodenya ke yang membuat tagihan.',
  JOIN_CODE_INVALID: 'Kode gabung tidak valid. Isi 6 karakter tanpa huruf O, I, angka 0, dan 1.',
  NAME_ALREADY_CLAIMED: 'Nama ini sudah dipilih orang lain. Pilih nama lain atau tambah nama baru.',
  ALREADY_JOINED: 'Kamu sudah bergabung ke tagihan ini dengan nama lain.',
  NAME_TAKEN: 'Nama ini sudah ada di tagihan. Pakai nama lain, misalnya tambah inisial.',
  NAME_INVALID: 'Isi nama dulu, maksimal 30 karakter.',
  NOT_AUTHENTICATED: 'Belum tersambung ke server. Buka Profil dan tekan Coba lagi.',
  PARTICIPANT_NOT_FOUND: 'Nama itu sudah dihapus dari tagihan. Muat ulang lalu pilih lagi.',
};

export function joinErrorMessage(error: { message?: string } | null | undefined): string {
  const message = error?.message ?? '';
  const code = Object.keys(JOIN_ERRORS).find((key) => message.includes(key));
  if (code) return JOIN_ERRORS[code] ?? message;
  const kind = classifyError(error);
  if (kind === 'offline') return 'Butuh internet untuk bergabung ke tagihan.';
  if (kind === 'unavailable')
    return 'Server Patungan sedang tidak bisa dihubungi. Coba lagi sebentar lagi.';
  return 'Gagal bergabung. Coba lagi.';
}

type RawPreview = {
  bill_id: string;
  title: string;
  bill_date: string;
  is_owner: boolean;
  payer_name: string | null;
  participant_count: number;
  my_participant_id: string | null;
  unclaimed: { id: string; display_name: string; color: string }[];
  colors_in_use: string[];
};

export async function previewJoin(
  client: PatunganClient,
  code: string,
): Promise<JoinResult<JoinPreview>> {
  try {
    const { data, error } = await client.rpc('join_bill', { p_code: code });
    if (error || !data) return { ok: false, error: joinErrorMessage(error) };
    const raw = data as unknown as RawPreview;
    return {
      ok: true,
      value: {
        billId: raw.bill_id,
        title: raw.title,
        date: raw.bill_date,
        isOwner: raw.is_owner,
        payerName: raw.payer_name,
        participantCount: raw.participant_count,
        myParticipantId: raw.my_participant_id,
        unclaimed: raw.unclaimed.map((p) => ({ id: p.id, name: p.display_name, color: p.color })),
        colorsInUse: raw.colors_in_use,
      },
    };
  } catch (error) {
    return { ok: false, error: joinErrorMessage(error as { message?: string }) };
  }
}

export async function claimName(
  client: PatunganClient,
  participantId: string,
): Promise<JoinResult<string>> {
  try {
    const { data, error } = await client.rpc('claim_participant', {
      p_participant_id: participantId,
    });
    if (error || !data) return { ok: false, error: joinErrorMessage(error) };
    return { ok: true, value: data };
  } catch (error) {
    return { ok: false, error: joinErrorMessage(error as { message?: string }) };
  }
}

export async function joinWithNewName(
  client: PatunganClient,
  code: string,
  name: string,
  color: string,
): Promise<JoinResult<string>> {
  try {
    const { data, error } = await client.rpc('join_as_new_participant', {
      p_code: code,
      p_display_name: name,
      p_color: color,
    });
    if (error || !data) return { ok: false, error: joinErrorMessage(error) };
    return { ok: true, value: (data as unknown as { bill_id: string }).bill_id };
  } catch (error) {
    return { ok: false, error: joinErrorMessage(error as { message?: string }) };
  }
}
