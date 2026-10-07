import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ColorTokens } from './colors';

export type ColorSchemeName = 'light' | 'dark';

export type Theme = {
  scheme: ColorSchemeName;
  colors: ColorTokens;
};

export function getTheme(scheme: ColorSchemeName): Theme {
  return { scheme, colors: scheme === 'dark' ? darkColors : lightColors };
}

// Follows the system scheme for now; the user theme preference (F-11) plugs in here in phase 2.
export function useTheme(): Theme {
  const system = useColorScheme();
  return getTheme(system === 'dark' ? 'dark' : 'light');
}
