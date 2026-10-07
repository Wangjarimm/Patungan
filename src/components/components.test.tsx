import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { avatarColors } from '@/theme/colors';
import { amountUnderline } from '@/theme/spacing';
import { getTheme, useTheme } from '@/theme/use-theme';

import { Amount } from './Amount';
import { Avatar } from './Avatar';
import { PersonToggle } from './PersonToggle';
import { PillButton } from './PillButton';
import { ReceiptCard } from './ReceiptCard';
import { StatusBadge } from './StatusBadge';
import { buildZigzagPath, ZigzagEdge } from './ZigzagEdge';

jest.mock('@/theme/use-theme', () => {
  const actual = jest.requireActual<typeof import('@/theme/use-theme')>('@/theme/use-theme');
  return { ...actual, useTheme: jest.fn(() => actual.getTheme('light')) };
});

const mockedUseTheme = jest.mocked(useTheme);

afterEach(() => {
  mockedUseTheme.mockImplementation(() => getTheme('light'));
});

describe('ZigzagEdge', () => {
  it('builds whole teeth across the width', () => {
    expect(buildZigzagPath(32, 8, 16)).toBe('M0 0 L8 8 L16 0 L24 8 L32 0 Z');
  });

  it('always draws at least one tooth', () => {
    expect(buildZigzagPath(5, 8, 16)).toBe('M0 0 L2.5 8 L5 0 Z');
  });

  it('is hidden from screen readers', async () => {
    await render(<ZigzagEdge color="red" />);
    expect(screen.getByTestId('zigzag-edge', { includeHiddenElements: true }).props).toMatchObject({
      accessible: false,
      importantForAccessibility: 'no-hide-descendants',
    });
  });
});

describe('ReceiptCard', () => {
  it('renders children with a zigzag edge and divider', async () => {
    await render(
      <ReceiptCard>
        <Text>Masih ditunggu</Text>
        <ReceiptCard.Divider />
      </ReceiptCard>,
    );
    expect(screen.getByText('Masih ditunggu')).toBeOnTheScreen();
    expect(screen.getByTestId('zigzag-edge', { includeHiddenElements: true })).toBeTruthy();
  });
});

describe('Avatar', () => {
  it('shows the initial', async () => {
    await render(<Avatar name="raka" color={avatarColors[0]} />);
    expect(screen.getByText('R', { includeHiddenElements: true })).toBeTruthy();
  });

  it('is announced only when given a label', async () => {
    await render(<Avatar name="Raka" color={avatarColors[0]} accessibilityLabel="Profil Raka" />);
    expect(screen.getByLabelText('Profil Raka')).toBeOnTheScreen();
  });
});

describe('PersonToggle', () => {
  it('is a checkbox labelled with the full name', async () => {
    await render(
      <PersonToggle name="Dinda" color={avatarColors[1]} selected onToggle={jest.fn()} />,
    );
    const toggle = screen.getByRole('checkbox', { name: 'Dinda' });
    expect(toggle).toBeChecked();
  });

  it('reports the unselected state and calls onToggle', async () => {
    const onToggle = jest.fn();
    await render(
      <PersonToggle name="Bima" color={avatarColors[2]} selected={false} onToggle={onToggle} />,
    );
    const toggle = screen.getByRole('checkbox', { name: 'Bima' });
    expect(toggle).not.toBeChecked();
    await fireEvent.press(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('has a 44 dp touch target', async () => {
    await render(
      <PersonToggle name="Sekar" color={avatarColors[3]} selected onToggle={jest.fn()} />,
    );
    expect(screen.getByRole('checkbox')).toHaveStyle({ width: 44, height: 44 });
  });
});

describe('PillButton', () => {
  it('is a button with a 44 dp minimum height', async () => {
    const onPress = jest.fn();
    await render(<PillButton label="Buat tagihan baru" variant="primary" onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Buat tagihan baru' });
    expect(button).toHaveStyle({ minHeight: 44 });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalled();
  });

  it('does not fire when disabled', async () => {
    const onPress = jest.fn();
    await render(<PillButton label="Simpan" disabled onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Simpan' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders an icon in the label color', async () => {
    const icon = jest.fn(() => null);
    await render(<PillButton label="Tambah menu" icon={icon} onPress={jest.fn()} />);
    expect(icon).toHaveBeenCalledWith(getTheme('light').colors.text);
  });
});

describe('Amount', () => {
  it('formats Rupiah', async () => {
    await render(<Amount value={243705.4} />);
    expect(screen.getByText('Rp243.705')).toBeOnTheScreen();
  });

  it('can hide the currency', async () => {
    await render(<Amount value={64000} showCurrency={false} />);
    expect(screen.getByText('64.000')).toBeOnTheScreen();
  });

  it.each(['light', 'dark'] as const)(
    'draws the same accent underline in %s mode, only the color changes',
    async (scheme) => {
      mockedUseTheme.mockImplementation(() => getTheme(scheme));
      await render(<Amount value={146800} underline />);
      expect(screen.getByTestId('amount-underline')).toHaveStyle({
        height: amountUnderline.thickness,
        marginTop: amountUnderline.gap,
        borderRadius: amountUnderline.radius,
        backgroundColor: getTheme(scheme).colors.accent,
      });
      expect(screen.queryByTestId('amount-highlight')).toBeNull();
    },
  );

  it('has no underline unless asked', async () => {
    await render(<Amount value={146800} />);
    expect(screen.queryByTestId('amount-underline')).toBeNull();
  });
});

describe('StatusBadge', () => {
  it.each([
    ['pending', 'Belum transfer'],
    ['paid', 'Lunas'],
    ['cashier', 'bayar ke kasir'],
  ] as const)('%s shows "%s" as text', async (status, label) => {
    await render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeOnTheScreen();
  });
});
