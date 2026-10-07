import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSettingsStore } from '@/stores/settings';

import { darkColors, lightColors } from './colors';
import { getTheme, resolveColorScheme } from './use-theme';

describe('resolveColorScheme (F-11)', () => {
  it('follows the system by default', () => {
    expect(resolveColorScheme('system', 'dark')).toBe('dark');
    expect(resolveColorScheme('system', 'light')).toBe('light');
    expect(resolveColorScheme('system', null)).toBe('light');
    expect(resolveColorScheme('system', 'unspecified')).toBe('light');
  });

  it('lets the user force light or dark', () => {
    expect(resolveColorScheme('light', 'dark')).toBe('light');
    expect(resolveColorScheme('dark', 'light')).toBe('dark');
  });
});

describe('getTheme', () => {
  it('returns the matching tokens', () => {
    expect(getTheme('dark').colors).toBe(darkColors);
    expect(getTheme('light').colors).toBe(lightColors);
  });
});

describe('settings store', () => {
  beforeEach(async () => {
    useSettingsStore.setState({ themePreference: 'system' });
    await AsyncStorage.clear();
  });

  it('defaults to the system theme', () => {
    expect(useSettingsStore.getState().themePreference).toBe('system');
  });

  it('persists the chosen theme', async () => {
    useSettingsStore.getState().setThemePreference('dark');
    const raw = await AsyncStorage.getItem('patungan-settings');
    expect(raw).toContain('"themePreference":"dark"');

    useSettingsStore.setState({ themePreference: 'system' });
    await AsyncStorage.setItem('patungan-settings', raw ?? '');
    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState().themePreference).toBe('dark');
  });
});
