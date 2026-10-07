import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, type AlertButton } from 'react-native';

import HomeScreen from '@/app/(tabs)/index';
import GroupScreen from '@/app/grup/[id]';
import SaveGroupScreen from '@/app/grup/baru';
import NewBillScreen from '@/app/tagihan/baru';
import { useBillsStore } from '@/stores/bills';
import { useGroupsStore } from '@/stores/groups';
import { seedKenari } from '@/test-utils/seed';

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));

const mockedParams = jest.mocked(useLocalSearchParams);

// Presses the button with `label` in the next confirmation dialog.
function confirmAlerts(label: string) {
  return jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    (buttons as AlertButton[] | undefined)?.find((b) => b.text === label)?.onPress?.();
  });
}

function ok<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function seedGroup(name = 'Kantor lantai 3') {
  const { billId } = seedKenari();
  const participants = useBillsStore.getState().bills[billId]!.participants;
  return ok(
    useGroupsStore.getState().createGroup(
      name,
      participants.map((p) => ({ name: p.name, color: p.color })),
    ),
  );
}

const group = (id: string) => useGroupsStore.getState().groups[id];

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  mockedParams.mockReturnValue({});
  useBillsStore.setState({ bills: {} });
  useGroupsStore.setState({ groups: {} });
});

describe('Simpan sebagai grup (F-09)', () => {
  it('saves the bill participants under a name', async () => {
    const { billId } = seedKenari();
    mockedParams.mockReturnValue({ billId });
    await render(<SaveGroupScreen />);

    expect(screen.getByText('Anggota (5 orang)')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Simpan grup' }));
    expect(screen.getByText(/Isi nama grup dulu/)).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Nama grup'), 'Kantor lantai 3');
    await fireEvent.press(screen.getByRole('button', { name: 'Simpan grup' }));
    const saved = Object.values(useGroupsStore.getState().groups);
    expect(saved).toHaveLength(1);
    expect(saved[0]?.members.map((m) => m.name)).toEqual([
      'Raka',
      'Dinda',
      'Bima',
      'Sekar',
      'Fajar',
    ]);
    expect(router.back).toHaveBeenCalled();
  });
});

describe('Buat tagihan dengan grup (F-09)', () => {
  it('fills every member at once with the chosen payer', async () => {
    const groupId = seedGroup();
    useBillsStore.setState({ bills: {} });
    await render(<NewBillScreen />);

    await fireEvent.changeText(screen.getByLabelText('Nama tempat'), 'Bakso Pak Darto');
    await fireEvent.press(screen.getByRole('radio', { name: 'Grup Kantor lantai 3, 5 orang' }));
    expect(screen.getByText(/Semua 5 anggota Kantor lantai 3/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Lanjut isi pesanan' }));
    expect(screen.getByText('Pilih siapa yang bayar ke kasir.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Sekar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Lanjut isi pesanan' }));

    const bill = Object.values(useBillsStore.getState().bills)[0]!;
    expect(bill.participants.map((p) => p.name)).toEqual(
      group(groupId)!.members.map((m) => m.name),
    );
    expect(bill.participants.find((p) => p.id === bill.payerId)?.name).toBe('Sekar');
  });

  it('preselects the group passed from the group screen', async () => {
    const groupId = seedGroup();
    mockedParams.mockReturnValue({ groupId });
    await render(<NewBillScreen />);
    expect(screen.getByRole('radio', { name: 'Grup Kantor lantai 3, 5 orang' })).toBeChecked();
  });

  it('keeps the plain payer field without groups', async () => {
    await render(<NewBillScreen />);
    expect(screen.queryByText('Pakai grup')).toBeNull();
    expect(screen.getByLabelText('Yang bayar ke kasir')).toBeOnTheScreen();
  });
});

describe('Kelola grup', () => {
  it('renames, adds, and removes members after confirmation', async () => {
    const groupId = seedGroup();
    mockedParams.mockReturnValue({ id: groupId });
    await render(<GroupScreen />);

    const nameField = screen.getByLabelText('Nama grup');
    await fireEvent.changeText(nameField, 'Tim Makan Siang');
    await fireEvent(nameField, 'endEditing');
    expect(group(groupId)?.name).toBe('Tim Makan Siang');

    await fireEvent.changeText(screen.getByLabelText('Anggota baru'), 'dinda');
    await fireEvent.press(screen.getByRole('button', { name: 'Tambah anggota' }));
    expect(screen.getByText(/sudah ada/)).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Anggota baru'), 'Wulan');
    await fireEvent.press(screen.getByRole('button', { name: 'Tambah anggota' }));
    expect(group(groupId)?.members.at(-1)?.name).toBe('Wulan');

    confirmAlerts('Hapus');
    await fireEvent.press(screen.getByRole('button', { name: 'Hapus Bima dari grup' }));
    expect(group(groupId)?.members.map((m) => m.name)).not.toContain('Bima');
  });

  it('keeps a member when removal is cancelled', async () => {
    const groupId = seedGroup();
    mockedParams.mockReturnValue({ id: groupId });
    await render(<GroupScreen />);
    confirmAlerts('Batal');
    await fireEvent.press(screen.getByRole('button', { name: 'Hapus Bima dari grup' }));
    expect(group(groupId)?.members).toHaveLength(5);
  });

  it('deletes the group after confirmation, keeping existing bills', async () => {
    const groupId = seedGroup();
    mockedParams.mockReturnValue({ id: groupId });
    await render(<GroupScreen />);

    confirmAlerts('Hapus grup');
    await fireEvent.press(screen.getByRole('button', { name: 'Hapus grup' }));
    expect(group(groupId)).toBeUndefined();
    expect(Object.values(useBillsStore.getState().bills)).toHaveLength(1);
    expect(router.back).toHaveBeenCalled();
  });

  it('starts a bill with the group', async () => {
    const groupId = seedGroup();
    mockedParams.mockReturnValue({ id: groupId });
    await render(<GroupScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Buat tagihan dengan grup ini' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/tagihan/baru',
      params: { groupId },
    });
  });
});

describe('Beranda grup', () => {
  it('shows saved groups and opens one', async () => {
    const groupId = seedGroup();
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Grup Kantor lantai 3, 5 orang' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/grup/[id]', params: { id: groupId } });
    expect(screen.getByText('+2')).toBeOnTheScreen();
  });

  it('explains how to make a group when there are none', async () => {
    await render(<HomeScreen />);
    expect(screen.getByText(/Simpan peserta sebagai grup/)).toBeOnTheScreen();
  });
});
