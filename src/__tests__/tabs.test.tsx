import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import HomeScreen from '@/app/(tabs)/index';
import ProfileScreen from '@/app/(tabs)/profil';
import HistoryScreen from '@/app/(tabs)/riwayat';
import { useBillsStore } from '@/stores/bills';
import { useSettingsStore } from '@/stores/settings';
import { darkColors, lightColors } from '@/theme/colors';

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);
const mockRootState = jest.fn((): unknown => undefined);
jest.mock('expo-router', () => {
  const navigationRef = { getRootState: () => mockRootState() };
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismissTo: jest.fn() },
    useNavigationContainerRef: () => navigationRef,
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  useBillsStore.setState({ bills: {} });
});

// A bill where Dinda owes `price` to Raka; `paid` marks Dinda as paid.
function seedBill(title = 'Kedai Mie Kenari', date = '2026-10-03', price = 28000, paid = false) {
  const created = useBillsStore.getState().createBill({ title, date, payerName: 'Raka' });
  if (!created.ok) throw new Error(created.error);
  const id = created.value;
  const store = useBillsStore.getState();
  const dinda = store.addParticipant(id, 'Dinda');
  const item = store.addItem(id, { name: 'Nasi goreng', unitPrice: price, qty: 1 });
  if (!dinda.ok || !item.ok) throw new Error('seed failed');
  useBillsStore.getState().toggleEater(id, item.value, dinda.value);
  if (paid) useBillsStore.getState().markPaid(id, dinda.value);
  return id;
}
const seedKenari = () => seedBill();

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
    expect(screen.getByText('Rp28.000')).toBeOnTheScreen();
    expect(screen.getByText('1 orang')).toBeOnTheScreen();
    expect(screen.getByText('28.000')).toBeOnTheScreen();
    expect(screen.getByText('Menunggu Rp28.000')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /Kedai Mie Kenari/ }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/tagihan/[id]', params: { id } });
  });

  it('goes back to a bill already in the stack instead of pushing a second copy', async () => {
    const id = seedKenari();
    mockRootState.mockReturnValue({
      index: 2,
      routes: [
        { key: 'tabs', name: '(tabs)' },
        { key: 'bill', name: 'tagihan/[id]/index', params: { id } },
        { key: 'menu', name: 'tagihan/[id]/menu', params: { id } },
      ],
    });
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /Kedai Mie Kenari/ }));
    expect(router.push).not.toHaveBeenCalled();
    expect(router.dismissTo).toHaveBeenCalledWith({ pathname: '/tagihan/[id]', params: { id } });
    mockRootState.mockReturnValue(undefined);
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

describe('Riwayat filters (F-10)', () => {
  beforeEach(() => {
    seedBill('Kedai Mie Kenari', '2026-10-03', 28000);
    seedBill('Martabak Bang Udin', '2026-10-01', 31500);
    seedBill('Bakso Pak Darto', '2026-09-30', 20000, true);
  });

  it('shows unpaid bills on top and settled bills per month, with a badge count', async () => {
    await render(<HistoryScreen />);
    expect(screen.getByRole('radio', { name: 'Belum lunas, 2 tagihan' })).toBeOnTheScreen();
    expect(screen.getByText('2')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Belum lunas' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'September 2026' })).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Oktober 2026' })).toBeNull();
    expect(screen.getByText('Menunggu Rp31.500')).toBeOnTheScreen();
    // One "Lunas" is the filter pill, the other the settled bill's status.
    expect(screen.getAllByText('Lunas')).toHaveLength(2);
  });

  it('filters to unpaid only', async () => {
    await render(<HistoryScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Belum lunas, 2 tagihan' }));
    expect(screen.getByText('Kedai Mie Kenari')).toBeOnTheScreen();
    expect(screen.getByText('Martabak Bang Udin')).toBeOnTheScreen();
    expect(screen.queryByText('Bakso Pak Darto')).toBeNull();
  });

  it('filters to settled only', async () => {
    await render(<HistoryScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Lunas' }));
    expect(screen.getByText('Bakso Pak Darto')).toBeOnTheScreen();
    expect(screen.queryByText('Kedai Mie Kenari')).toBeNull();
  });

  it('explains an empty filter', async () => {
    useBillsStore.setState({ bills: {} });
    seedBill('Kedai Mie Kenari', '2026-10-03', 28000);
    await render(<HistoryScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Lunas' }));
    expect(screen.getByText(/Belum ada tagihan yang lunas/)).toBeOnTheScreen();
  });
});

describe('Profil tema (F-11)', () => {
  beforeEach(() => useSettingsStore.setState({ themePreference: 'system' }));

  it('defaults to following the system', async () => {
    await render(<ProfileScreen />);
    expect(screen.getByRole('header', { name: 'Profil' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Ikuti sistem' })).toBeChecked();
  });

  it('switches the whole screen to the chosen theme and remembers it', async () => {
    await render(<ProfileScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Gelap' }));
    expect(useSettingsStore.getState().themePreference).toBe('dark');
    expect(screen.getByRole('header', { name: 'Profil' })).toHaveStyle({ color: darkColors.text });

    await fireEvent.press(screen.getByRole('radio', { name: 'Terang' }));
    expect(screen.getByRole('header', { name: 'Profil' })).toHaveStyle({ color: lightColors.text });
  });

  it('links to the source code with the app version', async () => {
    await render(<ProfileScreen />);
    expect(screen.getByRole('link', { name: /^Kode sumber di GitHub, versi / })).toBeOnTheScreen();
  });
});
