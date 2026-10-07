import { useColorScheme } from 'react-native';

import { useSettingsStore, type ThemePreference } from '@/stores/settings';

import { darkColors, lightColors, type ColorTokens } from './colors';

export type ColorSchemeName = 'light' | 'dark';

export type Theme = {
  scheme: ColorSchemeName;
  colors: ColorTokens;
};

export function getTheme(scheme: ColorSchemeName): Theme {
  return { scheme, colors: scheme === 'dark' ? darkColors : lightColors };
}

// The user's choice wins; "system" follows the phone, defaulting to light when unknown.
export function resolveColorScheme(
  preference: ThemePreference,
  system: string | null | undefined,
): ColorSchemeName {
  if (preference !== 'system') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

export function useTheme(): Theme {
  const system = useColorScheme();
  const preference = useSettingsStore((state) => state.themePreference);
  return getTheme(resolveColorScheme(preference, system));
}
