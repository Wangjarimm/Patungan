import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';

import WelcomeScreen from '@/app/selamat-datang';
import { AccountCard } from '@/components/AccountCard';
import { ensureAccount } from '@/services/supabase/account';
import { useAccountSync } from '@/services/supabase/use-account-sync';
import { useAccountStore } from '@/stores/account';

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);
// A configured client; the network calls themselves are replaced by ensureAccount below.
jest.mock('@/services/supabase/client', () => ({ supabase: { configured: true } }));
jest.mock('@/services/supabase/account', () => ({ ensureAccount: jest.fn() }));

const mockedEnsure = jest.mocked(ensureAccount);
const account = () => useAccountStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  useAccountStore.setState({
    displayName: null,
    userId: null,
    status: 'idle',
    error: null,
    syncRequest: 0,
  });
});

describe('account store', () => {
  it('validates and normalizes the name', () => {
    expect(account().setDisplayName('  ').ok).toBe(false);
    expect(account().displayName).toBeNull();
    expect(account().setDisplayName('  Raka  Pratama ')).toEqual({
      ok: true,
      value: 'Raka Pratama',
    });
    expect(account().displayName).toBe('Raka Pratama');
  });

  it('persists only the name and account id', () => {
    const { partialize } = useAccountStore.persist.getOptions();
    useAccountStore.setState({ displayName: 'Raka', userId: 'u1', status: 'online' });
    expect(partialize?.(useAccountStore.getState())).toEqual({ displayName: 'Raka', userId: 'u1' });
  });
});

describe('useAccountSync (F-12)', () => {
  it('waits for a name before creating the account', async () => {
    renderHook(() => useAccountSync());
    expect(mockedEnsure).not.toHaveBeenCalled();
  });

  it('creates the anonymous account once a name is set', async () => {
    mockedEnsure.mockResolvedValue({ ok: true, userId: 'user-1' });
    useAccountStore.setState({ displayName: 'Raka' });
    renderHook(() => useAccountSync());
    await waitFor(() => expect(account().status).toBe('online'));
    expect(account().userId).toBe('user-1');
    expect(mockedEnsure).toHaveBeenCalledWith({ configured: true }, 'Raka');
  });

  it('marks the device offline without losing the name', async () => {
    mockedEnsure.mockResolvedValue({ ok: false, error: 'offline' });
    useAccountStore.setState({ displayName: 'Raka' });
    renderHook(() => useAccountSync());
    await waitFor(() => expect(account().status).toBe('offline'));
    expect(account().displayName).toBe('Raka');
  });

  it('syncs the new name to the profile and retries on request', async () => {
    mockedEnsure.mockResolvedValue({ ok: true, userId: 'user-1' });
    useAccountStore.setState({ displayName: 'Raka' });
    renderHook(() => useAccountSync());
    await waitFor(() => expect(mockedEnsure).toHaveBeenCalledTimes(1));

    await act(async () => {
      account().setDisplayName('Raka P');
    });
    await waitFor(() => expect(mockedEnsure).toHaveBeenLastCalledWith(expect.anything(), 'Raka P'));

    await act(async () => account().requestSync());
    await waitFor(() => expect(mockedEnsure).toHaveBeenCalledTimes(3));
  });
});

describe('Selamat datang', () => {
  it('asks for a name and rejects an empty one', async () => {
    await render(<WelcomeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mulai' }));
    expect(screen.getByText('Isi nama dulu.')).toBeOnTheScreen();
    expect(account().displayName).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Siapa namamu?'), 'Raka');
    await fireEvent.press(screen.getByRole('button', { name: 'Mulai' }));
    expect(account().displayName).toBe('Raka');
  });
});

describe('AccountCard', () => {
  beforeEach(() => useAccountStore.setState({ displayName: 'Raka' }));

  it('shows the guest account and lets the name be changed', async () => {
    await render(<AccountCard />);
    expect(screen.getByRole('header', { name: 'Raka' })).toBeOnTheScreen();
    expect(screen.getByText('Akun tamu di HP ini')).toBeOnTheScreen();

    const field = screen.getByLabelText('Namamu');
    await fireEvent.changeText(field, 'Raka Pratama');
    await fireEvent(field, 'endEditing');
    expect(account().displayName).toBe('Raka Pratama');
  });

  it('rejects an empty name', async () => {
    await render(<AccountCard />);
    const field = screen.getByLabelText('Namamu');
    await fireEvent.changeText(field, ' ');
    await fireEvent(field, 'endEditing');
    expect(screen.getByText('Isi nama dulu.')).toBeOnTheScreen();
    expect(account().displayName).toBe('Raka');
  });

  it.each([
    ['online', null, /Tersambung/],
    ['offline', 'offline', /Offline/],
    ['disabled', null, /server belum diatur/],
    ['error', 'unavailable', /tidak bisa dihubungi/],
  ] as const)('explains the %s status', async (status, error, text) => {
    useAccountStore.setState({ status, error });
    await render(<AccountCard />);
    expect(screen.getByText(text)).toBeOnTheScreen();
  });

  it('offers a retry when the connection failed', async () => {
    useAccountStore.setState({ status: 'error', error: 'unknown' });
    await render(<AccountCard />);
    await fireEvent.press(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(account().syncRequest).toBe(1);
  });
});
