import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import BillScreen from '@/app/tagihan/[id]/index';
import MenuItemScreen from '@/app/tagihan/[id]/menu';
import ParticipantScreen from '@/app/tagihan/[id]/peserta';
import { useBillsStore } from '@/stores/bills';

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(),
}));

const mockedParams = jest.mocked(useLocalSearchParams);

function ok<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function seed() {
  const store = useBillsStore.getState();
  const billId = ok(
    store.createBill({ title: 'Kedai Mie Kenari', date: '2026-10-03', payerName: 'Raka' }),
  );
  const dinda = ok(useBillsStore.getState().addParticipant(billId, 'Dinda'));
  const mie = ok(
    useBillsStore.getState().addItem(billId, { name: 'Mie goreng', unitPrice: 32000, qty: 2 }),
  );
  const teh = ok(
    useBillsStore.getState().addItem(billId, { name: 'Es teh', unitPrice: 6000, qty: 2 }),
  );
  const bill = useBillsStore.getState().bills[billId];
  const raka = bill?.payerId ?? '';
  return { billId, raka, dinda, mie, teh };
}

const bill = (id: string) => {
  const found = useBillsStore.getState().bills[id];
  if (!found) throw new Error('missing bill');
  return found;
};

beforeEach(() => {
  jest.clearAllMocks();
  useBillsStore.setState({ bills: {} });
});

describe('Isi pesanan', () => {
  it('shows participants, items, and warns about items without eaters (F-04)', async () => {
    const { billId } = seed();
    mockedParams.mockReturnValue({ id: billId });
    await render(<BillScreen />);

    expect(screen.getByRole('header', { name: 'Kedai Mie Kenari' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Raka, yang bayar ke kasir' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Dinda' })).toBeOnTheScreen();
    expect(screen.getByText('2 × 32.000')).toBeOnTheScreen();
    expect(screen.getByText('64.000')).toBeOnTheScreen();
    expect(screen.getAllByText(/Belum ada yang makan/)).toHaveLength(2);
    expect(screen.getByText('2 menu belum ada yang makan dan belum dihitung.')).toBeOnTheScreen();
    // Nothing assigned yet, so nothing is counted.
    expect(screen.getByText('Rp0')).toBeOnTheScreen();
  });

  it('toggles eaters by tapping initials and updates the total', async () => {
    const { billId, raka, dinda, mie } = seed();
    mockedParams.mockReturnValue({ id: billId });
    await render(<BillScreen />);

    const toggles = screen.getAllByRole('checkbox', { name: 'Raka' });
    await fireEvent.press(toggles[0]!);
    expect(bill(billId).items.find((i) => i.id === mie)?.eaterIds).toEqual([raka]);
    expect(screen.getByText('Rp64.000')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Semua orang makan Es teh' }));
    expect(bill(billId).items[1]?.eaterIds).toEqual([raka, dinda]);
    expect(screen.getByText('Rp76.000')).toBeOnTheScreen();
    expect(screen.queryByText(/belum dihitung/)).toBeNull();
  });

  it('opens the menu form and participant form', async () => {
    const { billId, mie } = seed();
    mockedParams.mockReturnValue({ id: billId });
    await render(<BillScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Tambah menu' }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/tagihan/[id]/menu',
      params: { id: billId },
    });
    await fireEvent.press(screen.getByRole('button', { name: /^Mie goreng, 2 kali/ }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/tagihan/[id]/menu',
      params: { id: billId, itemId: mie },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Tambah peserta' }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/tagihan/[id]/peserta',
      params: { id: billId },
    });
  });

  it('handles a missing bill', async () => {
    mockedParams.mockReturnValue({ id: 'nope' });
    await render(<BillScreen />);
    expect(screen.getByRole('header', { name: 'Tagihan tidak ditemukan' })).toBeOnTheScreen();
  });
});

describe('Form menu (F-03)', () => {
  it('validates name and price', async () => {
    const { billId } = seed();
    mockedParams.mockReturnValue({ id: billId });
    await render(<MenuItemScreen />);

    await fireEvent.changeText(screen.getByLabelText('Harga satuan (Rp)'), '12,5');
    await fireEvent.press(screen.getByRole('button', { name: 'Tambah ke pesanan' }));
    expect(screen.getByText('Isi nama menu dulu.')).toBeOnTheScreen();
    expect(screen.getByText(/angka bulat Rupiah/)).toBeOnTheScreen();
    expect(bill(billId).items).toHaveLength(2);
  });

  it('adds an item with quantity from the stepper', async () => {
    const { billId } = seed();
    mockedParams.mockReturnValue({ id: billId });
    await render(<MenuItemScreen />);

    await fireEvent.changeText(screen.getByLabelText('Nama menu'), 'Pisang goreng keju');
    await fireEvent.changeText(screen.getByLabelText('Harga satuan (Rp)'), '24.000');
    await fireEvent.press(screen.getByRole('button', { name: 'Tambah jumlah' }));
    expect(screen.getByText('Rp48.000')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tambah ke pesanan' }));

    expect(bill(billId).items[2]).toMatchObject({
      name: 'Pisang goreng keju',
      unitPrice: 24000,
      qty: 2,
    });
    expect(router.back).toHaveBeenCalled();
  });

  it('does not go below quantity 1', async () => {
    const { billId } = seed();
    mockedParams.mockReturnValue({ id: billId });
    await render(<MenuItemScreen />);
    expect(screen.getByRole('button', { name: 'Kurangi jumlah' })).toBeDisabled();
  });

  it('edits an existing item', async () => {
    const { billId, mie } = seed();
    mockedParams.mockReturnValue({ id: billId, itemId: mie });
    await render(<MenuItemScreen />);

    expect(screen.getByDisplayValue('Mie goreng')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('32.000')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Harga satuan (Rp)'), '33000');
    await fireEvent.press(screen.getByRole('button', { name: 'Simpan' }));
    expect(bill(billId).items[0]).toMatchObject({ unitPrice: 33000, qty: 2 });
  });
});

describe('Form peserta (F-02)', () => {
  it('adds several people in a row and rejects duplicates', async () => {
    const { billId } = seed();
    mockedParams.mockReturnValue({ id: billId });
    await render(<ParticipantScreen />);

    const input = screen.getByLabelText('Nama');
    await fireEvent.changeText(input, 'Bima');
    await fireEvent.press(screen.getByRole('button', { name: 'Tambah' }));
    expect(screen.getByText(/Bima ditambahkan/)).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Nama'), 'dinda');
    await fireEvent.press(screen.getByRole('button', { name: 'Tambah' }));
    expect(screen.getByText(/sudah ada/)).toBeOnTheScreen();

    expect(bill(billId).participants.map((p) => p.name)).toEqual(['Raka', 'Dinda', 'Bima']);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('renames a participant', async () => {
    const { billId, dinda } = seed();
    mockedParams.mockReturnValue({ id: billId, participantId: dinda });
    await render(<ParticipantScreen />);

    await fireEvent.changeText(screen.getByLabelText('Nama'), 'Dinda Putri');
    await fireEvent.press(screen.getByRole('button', { name: 'Simpan' }));
    expect(bill(billId).participants[1]?.name).toBe('Dinda Putri');
    expect(router.back).toHaveBeenCalled();
  });
});
