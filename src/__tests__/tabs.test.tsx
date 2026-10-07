import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';
import ProfileScreen from '@/app/(tabs)/profil';
import HistoryScreen from '@/app/(tabs)/riwayat';

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);

describe('tab screens', () => {
  it.each([
    ['Beranda', HomeScreen],
    ['Riwayat', HistoryScreen],
    ['Profil', ProfileScreen],
  ])('renders the %s heading', async (title, Screen) => {
    await render(<Screen />);
    expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();
  });
});
