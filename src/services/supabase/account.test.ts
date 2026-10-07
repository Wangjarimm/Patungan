import type { PatunganClient } from './client';
import { ensureAccount } from './account';

type Fake = {
  session: { user: { id: string } } | null;
  signIn: { data: { user: { id: string } | null }; error: unknown };
  upsertError: unknown;
};

function fakeClient(fake: Fake) {
  const upsert = jest.fn(async () => ({ error: fake.upsertError }));
  const signInAnonymously = jest.fn(async () => fake.signIn);
  const client = {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: fake.session } })),
      signInAnonymously,
    },
    from: jest.fn(() => ({ upsert })),
  } as unknown as PatunganClient;
  return { client, upsert, signInAnonymously };
}

const base: Fake = {
  session: null,
  signIn: { data: { user: { id: 'user-1' } }, error: null },
  upsertError: null,
};

describe('ensureAccount (F-12)', () => {
  it('signs in anonymously on first run and saves the profile name', async () => {
    const { client, upsert, signInAnonymously } = fakeClient(base);
    await expect(ensureAccount(client, 'Raka')).resolves.toEqual({ ok: true, userId: 'user-1' });
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      { id: 'user-1', display_name: 'Raka' },
      { onConflict: 'id' },
    );
  });

  it('reuses a stored session', async () => {
    const { client, signInAnonymously } = fakeClient({ ...base, session: { user: { id: 'u9' } } });
    await expect(ensureAccount(client, 'Raka')).resolves.toEqual({ ok: true, userId: 'u9' });
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('reports a disabled anonymous login', async () => {
    const { client } = fakeClient({
      ...base,
      signIn: { data: { user: null }, error: { message: 'Anonymous sign-ins are disabled' } },
    });
    await expect(ensureAccount(client, 'Raka')).resolves.toEqual({
      ok: false,
      error: 'anonymous_disabled',
    });
  });

  it('reports a failed profile save', async () => {
    const { client } = fakeClient({ ...base, upsertError: { message: 'x', status: 503 } });
    await expect(ensureAccount(client, 'Raka')).resolves.toEqual({
      ok: false,
      error: 'unavailable',
    });
  });

  it('treats a thrown network error as offline', async () => {
    const { client } = fakeClient(base);
    (client.auth.getSession as jest.Mock).mockRejectedValue(
      new TypeError('Network request failed'),
    );
    await expect(ensureAccount(client, 'Raka')).resolves.toEqual({ ok: false, error: 'offline' });
  });
});
