import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import HomeScreen from '@/app/(tabs)/index';
import ProfileScreen from '@/app/(tabs)/profil';
import HistoryScreen from '@/app/(tabs)/riwayat';
import { useBillsStore } from '@/stores/bills';

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  useBillsStore.setState({ bills: {} });
});

function seedKenari() {
  const created = useBillsStore
    .getState()
    .createBill({ title: 'Kedai Mie Kenari', date: '2026-10-03', payerName: 'Raka' });
  if (!created.ok) throw new Error(created.error);
  const id = created.value;
  const store = useBillsStore.getState();
  const dinda = store.addParticipant(id, 'Dinda');
  const item = store.addItem(id, { name: 'Nasi goreng', unitPrice: 28000, qty: 1 });
  if (!dinda.ok || !item.ok) throw new Error('seed failed');
  useBillsStore.getState().toggleEater(id, item.value, dinda.value);
  return id;
}

describe('Beranda', () => {
  it('shows the empty state and opens the new bill screen', async () => {
    await render(<HomeScreen />);
    expect(screen.getByRole('header', { name: 'Patungan' })).toBeOnTheScreen();
    expect(screen.getByText('Belum ada yang perlu ditagih.')).toBeOnTheScreen();
    expect(screen.getByText(/Belum ada tagihan/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Buat tagihan baru' }));
    expect(router.push).toHaveBeenCalledWith('/tagihan/baru');
  });

  it('lists recent bills with their total and the outstanding balance', async () => {
    const id = seedKenari();
    await render(<HomeScreen />);
    // Dinda owes 28.000; Raka is the payer.
    expect(screen.getAllByText('Rp28.000')).toHaveLength(2);
    expect(screen.getByText('1 orang')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /Kedai Mie Kenari/ }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/tagihan/[id]', params: { id } });
  });
});

describe('Riwayat', () => {
  it('shows an empty state', async () => {
    await render(<HistoryScreen />);
    expect(screen.getByRole('header', { name: 'Riwayat' })).toBeOnTheScreen();
    expect(screen.getByText(/akan muncul di sini/)).toBeOnTheScreen();
  });

  it('lists every bill (F-01)', async () => {
    seedKenari();
    await render(<HistoryScreen />);
    expect(screen.getByText('Kedai Mie Kenari')).toBeOnTheScreen();
    expect(screen.getByText('Sabtu, 3 Okt · 2 orang')).toBeOnTheScreen();
  });
});

describe('Profil', () => {
  it('renders the placeholder heading', async () => {
    await render(<ProfileScreen />);
    expect(screen.getByRole('header', { name: 'Profil' })).toBeOnTheScreen();
  });
});
