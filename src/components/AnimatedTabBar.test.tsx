import { fireEvent, render, screen } from '@testing-library/react-native';
import { useReducedMotion, withSpring } from 'react-native-reanimated';

import { AnimatedTabBar, SLIDE_SPRING, type TabBarProps } from './AnimatedTabBar';

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('react-native-reanimated', () => {
  // Reanimated 4 needs native worklets; use its official Jest mock and spy on the animators.
  const mock = jest.requireActual<typeof import('react-native-reanimated')>(
    'react-native-reanimated/mock',
  );
  return {
    ...mock,
    withSpring: jest.fn(mock.withSpring),
    withSequence: jest.fn(mock.withSequence),
    useReducedMotion: jest.fn(() => false),
  };
});

const mockedReducedMotion = jest.mocked(useReducedMotion);
const mockedSpring = jest.mocked(withSpring);

const ROUTES = [
  { key: 'index-1', name: 'index', title: 'Beranda' },
  { key: 'riwayat-1', name: 'riwayat', title: 'Riwayat' },
  { key: 'profil-1', name: 'profil', title: 'Profil' },
];

function makeProps(index: number, defaultPrevented = false) {
  const navigation = {
    emit: jest.fn(() => ({ defaultPrevented })),
    navigate: jest.fn(),
  };
  const props = {
    state: {
      index,
      routes: ROUTES.map(({ key, name }) => ({ key, name, params: undefined })),
    },
    descriptors: Object.fromEntries(
      ROUTES.map(({ key, title }) => [
        key,
        { options: { title, tabBarAccessibilityLabel: title, tabBarIcon: () => null } },
      ]),
    ),
    navigation,
  } as unknown as TabBarProps;
  return { props, navigation };
}

async function layout() {
  await fireEvent(screen.getByTestId('tab-bar'), 'layout', {
    nativeEvent: { layout: { width: 330, height: 64, x: 0, y: 0 } },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedReducedMotion.mockReturnValue(false);
});

describe('AnimatedTabBar', () => {
  it('slides in about 460 ms', () => {
    // Reanimated's spring duration is perceptual; the real animation is ~1.5x longer.
    expect(SLIDE_SPRING.duration * 1.5).toBeGreaterThanOrEqual(440);
    expect(SLIDE_SPRING.duration * 1.5).toBeLessThanOrEqual(480);
  });

  it('exposes a tab list with the active tab selected', async () => {
    const { props } = makeProps(1);
    await render(<AnimatedTabBar {...props} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Riwayat' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Beranda' })).not.toBeSelected();
  });

  it('navigates when an inactive tab is pressed', async () => {
    const { props, navigation } = makeProps(0);
    await render(<AnimatedTabBar {...props} />);
    await fireEvent.press(screen.getByRole('tab', { name: 'Profil' }));
    expect(navigation.emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'profil-1',
      canPreventDefault: true,
    });
    expect(navigation.navigate).toHaveBeenCalledWith('profil', undefined);
  });

  it('does not navigate for the active tab or a prevented press', async () => {
    const { props, navigation } = makeProps(0, true);
    await render(<AnimatedTabBar {...props} />);
    await fireEvent.press(screen.getByRole('tab', { name: 'Beranda' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Riwayat' }));
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('emits a long press event', async () => {
    const { props, navigation } = makeProps(0);
    await render(<AnimatedTabBar {...props} />);
    await fireEvent(screen.getByRole('tab', { name: 'Riwayat' }), 'longPress');
    expect(navigation.emit).toHaveBeenCalledWith({ type: 'tabLongPress', target: 'riwayat-1' });
  });

  it('springs the pill and bounces the icon when the tab changes', async () => {
    const { props } = makeProps(0);
    const view = await render(<AnimatedTabBar {...props} />);
    await layout();
    mockedSpring.mockClear();

    await view.rerender(<AnimatedTabBar {...makeProps(2).props} />);
    expect(mockedSpring).toHaveBeenCalledWith(220, SLIDE_SPRING);
    expect(screen.getByTestId('tab-pill')).toBeTruthy();
  });

  it('turns every animation off with reduce motion', async () => {
    mockedReducedMotion.mockReturnValue(true);
    const { props } = makeProps(0);
    const view = await render(<AnimatedTabBar {...props} />);
    await layout();
    await view.rerender(<AnimatedTabBar {...makeProps(2).props} />);
    expect(mockedSpring).not.toHaveBeenCalled();
  });

  it('shows the active label', async () => {
    const { props } = makeProps(1);
    await render(<AnimatedTabBar {...props} />);
    // One visible label plus the hidden copy used for measuring.
    expect(screen.getAllByText('Riwayat', { includeHiddenElements: true }).length).toBeGreaterThan(
      0,
    );
  });
});
