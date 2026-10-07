import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import NewBillScreen from '@/app/tagihan/baru';
import { todayIsoDate } from '@/lib/format';
import { useBillsStore } from '@/stores/bills';

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  useBillsStore.setState({ bills: {} });
});

describe('Buat tagihan (F-01)', () => {
  it('rejects an empty place name with a clear message', async () => {
    await render(<NewBillScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Lanjut isi pesanan' }));
    expect(screen.getByText(/Isi nama tempat dulu/)).toBeOnTheScreen();
    expect(screen.getByText('Isi nama dulu.')).toBeOnTheScreen();
    expect(useBillsStore.getState().bills).toEqual({});
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('defaults the date to today', async () => {
    await render(<NewBillScreen />);
    expect(screen.getByRole('button', { name: /^Tanggal, / })).toBeOnTheScreen();
  });

  it('creates the bill and opens it', async () => {
    await render(<NewBillScreen />);
    await fireEvent.changeText(screen.getByLabelText('Nama tempat'), 'Kedai Mie Kenari');
    await fireEvent.changeText(screen.getByLabelText('Yang bayar ke kasir'), 'Raka');
    await fireEvent.press(screen.getByRole('button', { name: 'Lanjut isi pesanan' }));

    const bills = Object.values(useBillsStore.getState().bills);
    expect(bills).toHaveLength(1);
    expect(bills[0]).toMatchObject({ title: 'Kedai Mie Kenari', date: todayIsoDate() });
    expect(bills[0]?.participants[0]?.name).toBe('Raka');
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/tagihan/[id]',
      params: { id: bills[0]?.id },
    });
  });
});
