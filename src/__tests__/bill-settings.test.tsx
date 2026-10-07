import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import BillSettingsScreen from '@/app/tagihan/[id]/pengaturan';
import { calculateBill } from '@/lib/calc';
import { formatRupiah } from '@/lib/format';
import { useBillsStore } from '@/stores/bills';
import { seedKenari } from '@/test-utils/seed';

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

const mockedParams = jest.mocked(useLocalSearchParams);

const settingsOf = (id: string) => useBillsStore.getState().bills[id]!.settings;

async function press(name: string | RegExp, times = 1) {
  for (let i = 0; i < times; i++) {
    await fireEvent.press(screen.getByRole('button', { name }));
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  useBillsStore.setState({ bills: {} });
});

describe('Pengaturan tagihan (F-05)', () => {
  it('reproduces the Kedai Mie Kenari total live, then saves', async () => {
    const { billId } = seedKenari();
    mockedParams.mockReturnValue({ id: billId });
    await render(<BillSettingsScreen />);

    expect(screen.getByText('Rp211.000')).toBeOnTheScreen();
    await press('Tambah service', 5);
    await press('Tambah pajak', 10);
    expect(screen.getByLabelText('service dalam persen')).toHaveDisplayValue('5');
    expect(screen.getByLabelText('pajak dalam persen')).toHaveDisplayValue('10');
    expect(screen.getByText('Rp243.900')).toBeOnTheScreen();

    // Nothing is saved until Simpan.
    expect(settingsOf(billId).servicePct).toBe(0);
    await press('Simpan');
    expect(settingsOf(billId)).toMatchObject({
      servicePct: 5,
      taxPct: 10,
      taxAfterService: true,
      roundingStep: 100,
    });
    expect(router.back).toHaveBeenCalled();
  });

  it('changes rounding, tax order, discount, and delivery fee', async () => {
    const { billId } = seedKenari();
    mockedParams.mockReturnValue({ id: billId });
    await render(<BillSettingsScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Bulatkan ke 1.000 rupiah' }));
    await fireEvent(screen.getByLabelText('Pajak dihitung setelah service'), 'valueChange', false);
    await fireEvent.press(screen.getByRole('radio', { name: 'Diskon dalam persen' }));
    await fireEvent.changeText(screen.getByLabelText('Diskon (%)'), '10');
    await fireEvent.changeText(screen.getByLabelText('Ongkir atau biaya lain (Rp)'), '15.000');
    await press('Simpan');

    expect(settingsOf(billId)).toMatchObject({
      roundingStep: 1000,
      taxAfterService: false,
      discountType: 'percent',
      discountValue: 10,
      extraFee: 15000,
    });
  });

  it('blocks saving an invalid discount', async () => {
    const { billId } = seedKenari();
    mockedParams.mockReturnValue({ id: billId });
    await render(<BillSettingsScreen />);

    await fireEvent.changeText(screen.getByLabelText('Diskon (Rp)'), '12,5');
    expect(screen.getByText(/angka bulat Rupiah/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled();
  });

  it('changes the payer', async () => {
    const { billId, ids } = seedKenari();
    mockedParams.mockReturnValue({ id: billId });
    await render(<BillSettingsScreen />);

    await press(/^Yang bayar ke kasir, Raka/);
    await fireEvent.press(screen.getByRole('radio', { name: 'Dinda' }));
    expect(screen.getByRole('button', { name: /^Yang bayar ke kasir, Dinda/ })).toBeOnTheScreen();
    await press('Simpan');
    expect(useBillsStore.getState().bills[billId]!.payerId).toBe(ids.Dinda);
  });

  it.each([
    ['5,5', '11', 5.5, 11],
    ['5.5', '11', 5.5, 11],
    ['7,25', '12.5', 7.25, 12.5],
  ])('accepts typed decimals: service %s, tax %s', async (serviceText, taxText, service, tax) => {
    const { billId } = seedKenari();
    mockedParams.mockReturnValue({ id: billId });
    await render(<BillSettingsScreen />);

    await fireEvent.changeText(screen.getByLabelText('service dalam persen'), serviceText);
    await fireEvent.changeText(screen.getByLabelText('pajak dalam persen'), taxText);

    const bill = useBillsStore.getState().bills[billId]!;
    const expected = calculateBill({
      ...bill,
      settings: { ...bill.settings, servicePct: service, taxPct: tax },
    }).totals.rounded;
    expect(screen.getByText(formatRupiah(expected))).toBeOnTheScreen();

    await press('Simpan');
    expect(settingsOf(billId)).toMatchObject({ servicePct: service, taxPct: tax });
  });

  it('steps from a decimal value and shows it with a comma', async () => {
    const { billId } = seedKenari();
    mockedParams.mockReturnValue({ id: billId });
    await render(<BillSettingsScreen />);

    await fireEvent.changeText(screen.getByLabelText('service dalam persen'), '5.5');
    await press('Tambah service');
    expect(screen.getByLabelText('service dalam persen')).toHaveDisplayValue('6,5');
    await press('Kurangi service', 7);
    expect(screen.getByLabelText('service dalam persen')).toHaveDisplayValue('0');
    expect(screen.getByRole('button', { name: 'Kurangi service' })).toBeDisabled();
  });

  it('treats an empty percentage as 0%', async () => {
    const { billId } = seedKenari({ servicePct: 5 });
    mockedParams.mockReturnValue({ id: billId });
    await render(<BillSettingsScreen />);

    await fireEvent.changeText(screen.getByLabelText('service dalam persen'), '');
    await press('Simpan');
    expect(settingsOf(billId).servicePct).toBe(0);
  });

  it.each(['abc', '101', '5,555'])('rejects an invalid percentage %p', async (text) => {
    const { billId } = seedKenari();
    mockedParams.mockReturnValue({ id: billId });
    await render(<BillSettingsScreen />);

    await fireEvent.changeText(screen.getByLabelText('pajak dalam persen'), text);
    expect(screen.getByText(/^Pajak (hanya boleh angka|maksimal 100%)/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled();
  });

  it('shows saved decimal settings when reopened', async () => {
    const { billId } = seedKenari({ servicePct: 5.5, taxPct: 11 });
    mockedParams.mockReturnValue({ id: billId });
    await render(<BillSettingsScreen />);
    expect(screen.getByLabelText('service dalam persen')).toHaveDisplayValue('5,5');
    expect(screen.getByLabelText('pajak dalam persen')).toHaveDisplayValue('11');
  });
});
