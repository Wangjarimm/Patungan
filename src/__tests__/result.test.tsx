import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { Share } from 'react-native';

import ResultScreen from '@/app/tagihan/[id]/hasil';
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
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

const mockedParams = jest.mocked(useLocalSearchParams);

beforeEach(() => {
  jest.clearAllMocks();
  useBillsStore.setState({ bills: {} });
});

async function renderKenari() {
  const { billId } = seedKenari({ servicePct: 5, taxPct: 10, roundingStep: 100 });
  mockedParams.mockReturnValue({ id: billId });
  await render(<ResultScreen />);
  return billId;
}

describe('Bagian tiap orang (F-06)', () => {
  it('shows every rounded share from the Kedai Mie Kenari reference', async () => {
    await renderKenari();
    for (const [name, amount] of [
      ['Raka', 'Rp43.900'],
      ['Bima', 'Rp43.900'],
      ['Dinda', 'Rp53.200'],
      ['Sekar', 'Rp55.500'],
      ['Fajar', 'Rp47.400'],
    ]) {
      expect(screen.getByRole('button', { name: `${name}, ${amount}` })).toBeOnTheScreen();
    }
  });

  it('shows progress with the payer settled and the remaining amount', async () => {
    await renderKenari();
    // 243.900 - Raka's 43.900 paid at the till.
    expect(screen.getByLabelText('1 dari 5 sudah beres, sisa Rp200.000')).toBeOnTheScreen();
    expect(screen.getByText('bayar ke kasir')).toBeOnTheScreen();
    expect(screen.getAllByText('Belum transfer')).toHaveLength(4);
  });

  it('opens the first pending person with a full breakdown', async () => {
    await renderKenari();
    // Dinda: nasi goreng, half the pisang goreng, a fifth of the es teh.
    expect(screen.getByText('Nasi goreng kampung')).toBeOnTheScreen();
    expect(screen.getByText('÷2')).toBeOnTheScreen();
    expect(screen.getByText('Service 5%')).toBeOnTheScreen();
    expect(screen.getByText('2.300')).toBeOnTheScreen();
    expect(screen.getByText('4.830')).toBeOnTheScreen();
    expect(screen.getByText('Tepat Rp53.130, dibulatkan')).toBeOnTheScreen();
    expect(screen.getByText('53.200')).toBeOnTheScreen();
  });

  it('expands and collapses a person', async () => {
    await renderKenari();
    const fajar = screen.getByRole('button', { name: 'Fajar, Rp47.400' });
    expect(fajar).toBeCollapsed();
    await fireEvent.press(fajar);
    expect(screen.getByRole('button', { name: 'Fajar, Rp47.400' })).toBeExpanded();
    expect(screen.getByText('Mie kuah seafood')).toBeOnTheScreen();
    expect(screen.getByText('Tepat Rp47.355, dibulatkan')).toBeOnTheScreen();
  });

  it('shows the total and the rounding surplus for the payer', async () => {
    await renderKenari();
    expect(screen.getByText('Rp243.705')).toBeOnTheScreen();
    const collected = screen.getByText('Terkumpul setelah dibulatkan');
    expect(collected).toBeOnTheScreen();
    expect(screen.getByText('Rp243.900')).toBeOnTheScreen();
    expect(screen.getByText(/Lebih Rp195 dari pembulatan, jadi milik Raka/)).toBeOnTheScreen();
  });

  it('warns about items without eaters', async () => {
    const { billId } = seedKenari();
    useBillsStore.getState().addItem(billId, { name: 'Kerupuk', unitPrice: 5000, qty: 1 });
    mockedParams.mockReturnValue({ id: billId });
    await render(<ResultScreen />);
    expect(screen.getByText(/1 menu belum ada yang makan/)).toBeOnTheScreen();
  });
});

describe('Kirim ke WhatsApp dan Salin (F-07)', () => {
  it('shares the breakdown through the share sheet', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await renderKenari();
    await fireEvent.press(screen.getByRole('button', { name: 'Kirim ke WhatsApp' }));

    expect(shareSpy).toHaveBeenCalledTimes(1);
    const message = shareSpy.mock.calls[0]?.[0] as { message: string };
    expect(message.message).toContain('Total: Rp243.900');
    expect(message.message).toContain('Dibayar dulu oleh Raka');
    expect(message.message).toContain('- Fajar: Rp47.400');
  });

  it('copies the same text and confirms', async () => {
    await renderKenari();
    await fireEvent.press(screen.getByRole('button', { name: 'Salin rincian' }));

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('- Sekar: Rp55.500'),
    );
    expect(screen.getByText('Rincian disalin. Tempel di grup WhatsApp.')).toBeOnTheScreen();
  });
});
