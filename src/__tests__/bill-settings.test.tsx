import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import BillSettingsScreen from '@/app/tagihan/[id]/pengaturan';
import { useBillsStore } from '@/stores/bills';

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

function ok<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

// Kedai Mie Kenari from the PRD, with default settings (0% service and tax, round to 100).
function seedKenari() {
  const billId = ok(
    useBillsStore
      .getState()
      .createBill({ title: 'Kedai Mie Kenari', date: '2026-10-03', payerName: 'Raka' }),
  );
  const ids: Record<string, string> = { Raka: useBillsStore.getState().bills[billId]!.payerId! };
  for (const name of ['Dinda', 'Bima', 'Sekar', 'Fajar']) {
    ids[name] = ok(useBillsStore.getState().addParticipant(billId, name));
  }
  const menu: [string, number, number, string[]][] = [
    ['Mie goreng spesial', 32000, 2, ['Raka', 'Bima']],
    ['Nasi goreng kampung', 28000, 1, ['Dinda']],
    ['Kwetiau siram', 30000, 1, ['Sekar']],
    ['Mie kuah seafood', 35000, 1, ['Fajar']],
    ['Pisang goreng keju', 24000, 1, ['Dinda', 'Sekar']],
    ['Es teh manis', 6000, 5, ['Raka', 'Dinda', 'Bima', 'Sekar', 'Fajar']],
  ];
  for (const [name, unitPrice, qty, eaters] of menu) {
    const itemId = ok(useBillsStore.getState().addItem(billId, { name, unitPrice, qty }));
    for (const eater of eaters) {
      useBillsStore.getState().toggleEater(billId, itemId, ids[eater]!);
    }
  }
  return { billId, ids };
}

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
    expect(screen.getByLabelText('service 5%')).toBeOnTheScreen();
    expect(screen.getByLabelText('pajak 10%')).toBeOnTheScreen();
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
});
