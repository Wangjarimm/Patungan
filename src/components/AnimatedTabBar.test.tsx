import { act, fireEvent, render, screen } from '@testing-library/react-native';
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

const tab = (name: string) => screen.getByRole('tab', { name });
const nextFrame = () =>
  act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

beforeEach(() => {
  jest.clearAllMocks();
  mockedReducedMotion.mockReturnValue(false);
});

describe('AnimatedTabBar', () => {
  it('slides in about 460 ms with a smooth, barely bouncing spring', () => {
    // Reanimated's spring duration is perceptual; the real animation is ~1.5x longer.
    expect(SLIDE_SPRING.duration * 1.5).toBeGreaterThanOrEqual(440);
    expect(SLIDE_SPRING.duration * 1.5).toBeLessThanOrEqual(480);
    expect(SLIDE_SPRING.dampingRatio).toBeGreaterThanOrEqual(0.85);
    expect(SLIDE_SPRING.dampingRatio).toBeLessThan(1);
  });

  it('exposes a tab list with the active tab selected', async () => {
    const { props } = makeProps(1);
    await render(<AnimatedTabBar {...props} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(tab('Riwayat')).toBeSelected();
    expect(tab('Beranda')).not.toBeSelected();
  });

  it('starts the slide on press-in, before navigating', async () => {
    const { props, navigation } = makeProps(0);
    await render(<AnimatedTabBar {...props} />);

    await fireEvent(tab('Profil'), 'pressIn');
    expect(mockedSpring).toHaveBeenCalledWith(2, SLIDE_SPRING);
    expect(navigation.navigate).not.toHaveBeenCalled();

    await fireEvent.press(tab('Profil'));
    expect(navigation.emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'profil-1',
      canPreventDefault: true,
    });
    expect(navigation.navigate).toHaveBeenCalledWith('profil', undefined);
  });

  it('sends the pill back when a press is cancelled', async () => {
    const { props, navigation } = makeProps(0);
    await render(<AnimatedTabBar {...props} />);

    await fireEvent(tab('Riwayat'), 'pressIn');
    await fireEvent(tab('Riwayat'), 'pressOut');
    await nextFrame();

    expect(mockedSpring).toHaveBeenLastCalledWith(0, SLIDE_SPRING);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('sends the pill back when navigation is prevented', async () => {
    const { props, navigation } = makeProps(0, true);
    await render(<AnimatedTabBar {...props} />);
    await fireEvent(tab('Riwayat'), 'pressIn');
    await fireEvent.press(tab('Riwayat'));
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(mockedSpring).toHaveBeenLastCalledWith(0, SLIDE_SPRING);
  });

  it('does nothing for the active tab', async () => {
    const { props, navigation } = makeProps(0);
    await render(<AnimatedTabBar {...props} />);
    await fireEvent(tab('Beranda'), 'pressIn');
    await fireEvent.press(tab('Beranda'));
    expect(mockedSpring).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('retargets on quick alternating taps', async () => {
    const { props } = makeProps(0);
    await render(<AnimatedTabBar {...props} />);
    await fireEvent(tab('Profil'), 'pressIn');
    await fireEvent.press(tab('Profil'));
    await fireEvent(tab('Riwayat'), 'pressIn');
    await fireEvent.press(tab('Riwayat'));
    // Each tap retargets the same spring from wherever the pill is.
    expect(mockedSpring.mock.calls.map(([to]) => to)).toEqual([2, 1]);
  });

  it('follows navigation that did not come from a tap', async () => {
    const { props } = makeProps(0);
    const view = await render(<AnimatedTabBar {...props} />);
    await view.rerender(<AnimatedTabBar {...makeProps(2).props} />);
    expect(mockedSpring).toHaveBeenCalledWith(2, SLIDE_SPRING);
  });

  it('turns every animation off with reduce motion', async () => {
    mockedReducedMotion.mockReturnValue(true);
    const { props, navigation } = makeProps(0);
    const view = await render(<AnimatedTabBar {...props} />);
    await fireEvent(tab('Profil'), 'pressIn');
    await fireEvent.press(tab('Profil'));
    await view.rerender(<AnimatedTabBar {...makeProps(1).props} />);
    expect(mockedSpring).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith('profil', undefined);
  });

  it('emits a long press event without navigating', async () => {
    const { props, navigation } = makeProps(0);
    await render(<AnimatedTabBar {...props} />);
    await fireEvent(tab('Riwayat'), 'longPress');
    expect(navigation.emit).toHaveBeenCalledWith({ type: 'tabLongPress', target: 'riwayat-1' });
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('renders each label once, without a hidden measuring copy', async () => {
    const { props } = makeProps(1);
    await render(<AnimatedTabBar {...props} />);
    expect(screen.getAllByText('Riwayat', { includeHiddenElements: true })).toHaveLength(1);
  });
});
