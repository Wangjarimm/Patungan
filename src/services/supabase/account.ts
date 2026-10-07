import type { PatunganClient } from './client';
import { classifyError, type SyncErrorKind } from './errors';

export type AccountResult = { ok: true; userId: string } | { ok: false; error: SyncErrorKind };

// Makes sure this device has an anonymous account and a profile with the user's name (F-12).
// Safe to call repeatedly: reuses the stored session and upserts the profile.
export async function ensureAccount(
  client: PatunganClient,
  displayName: string,
): Promise<AccountResult> {
  try {
    const { data: sessionData } = await client.auth.getSession();
    let userId = sessionData.session?.user.id;

    if (!userId) {
      const { data, error } = await client.auth.signInAnonymously();
      if (error || !data.user) return { ok: false, error: classifyError(error) };
      userId = data.user.id;
    }

    const { error } = await client
      .from('profiles')
      .upsert({ id: userId, display_name: displayName }, { onConflict: 'id' });
    if (error) return { ok: false, error: classifyError(error) };

    return { ok: true, userId };
  } catch (error) {
    return { ok: false, error: classifyError(error) };
  }
}
