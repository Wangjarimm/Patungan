import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';

import JoinScreen from '@/app/gabung';
import BillScreen from '@/app/tagihan/[id]/index';
import ResultScreen from '@/app/tagihan/[id]/hasil';
import NewBillScreen from '@/app/tagihan/baru';
import { claimName, fetchBill, joinWithNewName, previewJoin } from '@/services/supabase/bills-api';
import { useAccountStore } from '@/stores/account';
import { useBillsStore } from '@/stores/bills';
import { useSyncStore } from '@/stores/sync';
import { makeBill, person } from '@/test-utils/bill';
import { avatarColors } from '@/theme/colors';

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));
jest.mock('@/services/supabase/client', () => ({ supabase: { configured: true } }));
jest.mock('@/services/supabase/use-sync', () => ({ useBillRealtime: jest.fn() }));
jest.mock('@/services/supabase/bills-api', () => ({
  ...jest.requireActual('@/services/supabase/bills-api'),
  previewJoin: jest.fn(),
  claimName: jest.fn(),
  joinWithNewName: jest.fn(),
  fetchBill: jest.fn(),
}));

const mockedParams = jest.mocked(useLocalSearchParams);
const mockedPreview = jest.mocked(previewJoin);
const mockedClaim = jest.mocked(claimName);
const mockedJoinNew = jest.mocked(joinWithNewName);
const mockedFetch = jest.mocked(fetchBill);

const joined = makeBill({
  id: 'joined',
  title: 'Kedai Mie Kenari',
  role: 'participant',
  ownerId: 'raka-account',
  myParticipantId: 'dinda',
  payerId: 'raka',
  joinCode: 'MEK482',
  syncedAt: 1,
  participants: [
    person('raka', 'Raka', { profileId: 'raka-account' }),
    person('dinda', 'Dinda', { profileId: 'me' }),
  ],
  items: [{ id: 'mie', name: 'Mie goreng', unitPrice: 30000, qty: 1, eaterIds: ['raka'] }],
});

const preview = {
  billId: 'joined',
  title: 'Kedai Mie Kenari',
  date: '2026-10-03',
  isOwner: false,
  payerName: 'Raka',
  participantCount: 2,
  myParticipantId: null,
  unclaimed: [{ id: 'dinda', name: 'Dinda', color: avatarColors[1] }],
  colorsInUse: [avatarColors[0], avatarColors[1]],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedParams.mockReturnValue({});
  useAccountStore.setState({ displayName: 'Dinda', userId: 'me', status: 'online' });
  useBillsStore.setState({ bills: {} });
  useSyncStore.setState({ queue: [], inFlight: null, lastRejection: null });
  mockedFetch.mockResolvedValue({ status: 'ok', bill: joined });
});

describe('Gabung pakai kode (F-13, F-14)', () => {
  it('checks the code before asking the server', async () => {
    await render(<JoinScreen />);
    await fireEvent.changeText(screen.getByLabelText('Kode gabung'), 'MIO48');
    await fireEvent.press(screen.getByRole('button', { name: 'Cari tagihan' }));
    expect(screen.getByText(/harus 6 karakter/)).toBeOnTheScreen();
    expect(mockedPreview).not.toHaveBeenCalled();
  });

  it('shows a clear message for a wrong code', async () => {
    mockedPreview.mockResolvedValueOnce({ ok: false, error: 'Kode tidak ditemukan. Cek lagi.' });
    await render(<JoinScreen />);
    await fireEvent.changeText(screen.getByLabelText('Kode gabung'), 'zzzz99');
    await fireEvent.press(screen.getByRole('button', { name: 'Cari tagihan' }));
    await waitFor(() =>
      expect(screen.getByText('Kode tidak ditemukan. Cek lagi.')).toBeOnTheScreen(),
    );
    expect(mockedPreview).toHaveBeenCalledWith({ configured: true }, 'ZZZZ99');
  });

  it('previews the bill, claims a name, and opens it', async () => {
    mockedPreview.mockResolvedValueOnce({ ok: true, value: preview });
    mockedClaim.mockResolvedValueOnce({ ok: true, value: 'joined' });
    await render(<JoinScreen />);

    await fireEvent.changeText(screen.getByLabelText('Kode gabung'), 'mek482');
    await fireEvent.press(screen.getByRole('button', { name: 'Cari tagihan' }));
    await waitFor(() =>
      expect(screen.getByRole('header', { name: 'Kedai Mie Kenari' })).toBeOnTheScreen(),
    );
    expect(screen.getByText(/Dibayar Raka · 2 orang/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Gabung' }));
    expect(screen.getByText(/Pilih namamu dulu/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Dinda' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Gabung' }));

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/tagihan/[id]',
        params: { id: 'joined' },
      }),
    );
    expect(mockedClaim).toHaveBeenCalledWith({ configured: true }, 'dinda');
    expect(useBillsStore.getState().bills.joined?.role).toBe('participant');
  });

  it('joins with a new name and a free avatar color', async () => {
    mockedPreview.mockResolvedValueOnce({ ok: true, value: { ...preview, unclaimed: [] } });
    mockedJoinNew.mockResolvedValueOnce({ ok: true, value: 'joined' });
    await render(<JoinScreen />);

    await fireEvent.changeText(screen.getByLabelText('Kode gabung'), 'MEK482');
    await fireEvent.press(screen.getByRole('button', { name: 'Cari tagihan' }));
    await waitFor(() => expect(screen.getByLabelText('Nama baru')).toBeOnTheScreen());
    await fireEvent.changeText(screen.getByLabelText('Nama baru'), 'Wulan');
    await fireEvent.press(screen.getByRole('button', { name: 'Gabung' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(mockedJoinNew).toHaveBeenCalledWith(
      { configured: true },
      'MEK482',
      'Wulan',
      avatarColors[2],
    );
  });

  it('opens your own bill directly', async () => {
    mockedPreview.mockResolvedValueOnce({ ok: true, value: { ...preview, isOwner: true } });
    await render(<JoinScreen />);
    await fireEvent.changeText(screen.getByLabelText('Kode gabung'), 'MEK482');
    await fireEvent.press(screen.getByRole('button', { name: 'Cari tagihan' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(mockedClaim).not.toHaveBeenCalled();
  });

  it('needs to be online', async () => {
    useAccountStore.setState({ status: 'offline' });
    await render(<JoinScreen />);
    expect(screen.getByText(/Butuh internet untuk bergabung/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cari tagihan' })).toBeDisabled();
  });
});

describe('Joined bill is read-only apart from my own choices', () => {
  beforeEach(() => {
    useBillsStore.setState({ bills: { joined } });
    mockedParams.mockReturnValue({ id: 'joined' });
  });

  it('hides owner controls and lets me tap only my own initial', async () => {
    await render(<BillScreen />);
    expect(screen.getByText(/kamu sebagai Dinda/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Tambah menu' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tambah peserta' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Pajak, service/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Semua orang/ })).toBeNull();
    expect(screen.queryByText('MEK482')).toBeNull();

    expect(screen.getByRole('checkbox', { name: 'Raka' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Dinda' }));
    expect(useBillsStore.getState().bills.joined?.items[0]?.eaterIds).toEqual(['raka', 'dinda']);
    expect(useSyncStore.getState().queue).toEqual([
      { kind: 'addShare', billId: 'joined', itemId: 'mie', participantId: 'dinda' },
    ]);
  });

  it('shows no paid toggle to someone who joined', async () => {
    await render(<ResultScreen />);
    expect(screen.queryByRole('button', { name: 'Tandai lunas' })).toBeNull();
  });
});

describe('Owner sees the join code', () => {
  it('shows the code and copies it', async () => {
    useBillsStore.setState({
      bills: {
        own: { ...joined, id: 'own', role: 'owner', ownerId: 'me', myParticipantId: 'raka' },
      },
    });
    mockedParams.mockReturnValue({ id: 'own' });
    await render(<BillScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /Kode gabung M E K 4 8 2/ }));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('MEK482');
    expect(screen.getByText('Kode disalin.')).toBeOnTheScreen();
  });

  it('explains a code that is not there yet', async () => {
    useBillsStore.setState({
      bills: { own: { ...joined, id: 'own', role: 'owner', ownerId: 'me', joinCode: null } },
    });
    mockedParams.mockReturnValue({ id: 'own' });
    await render(<BillScreen />);
    expect(screen.getByText(/Kode gabung muncul setelah/)).toBeOnTheScreen();
  });
});

describe('New bills go online with an account', () => {
  it('creates the bill as mine, links my name, and queues the upload', async () => {
    useAccountStore.setState({ displayName: 'Raka', userId: 'me' });
    await render(<NewBillScreen />);
    await fireEvent.changeText(screen.getByLabelText('Nama tempat'), 'Kedai Mie Kenari');
    await fireEvent.press(screen.getByRole('button', { name: 'Lanjut isi pesanan' }));
    const bill = Object.values(useBillsStore.getState().bills)[0]!;
    expect(bill).toMatchObject({ ownerId: 'me', role: 'owner' });
    expect(bill.myParticipantId).toBe(bill.payerId);
    expect(useSyncStore.getState().queue.map((op) => op.kind)).toContain('upsertBill');
  });
});
