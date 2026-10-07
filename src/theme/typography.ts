import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { IBMPlexMono_400Regular, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';

// Font assets passed to useFonts in the root layout. Keys are the fontFamily names.
export const fontAssets = {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_800ExtraBold,
  IBMPlexMono_400Regular,
  IBMPlexMono_600SemiBold,
};

// Bricolage Grotesque for all text; IBM Plex Mono only for Rupiah amounts and join codes.
export const fonts = {
  body: 'BricolageGrotesque_400Regular',
  bodyStrong: 'BricolageGrotesque_600SemiBold',
  heading: 'BricolageGrotesque_800ExtraBold',
  mono: 'IBMPlexMono_400Regular',
  monoStrong: 'IBMPlexMono_600SemiBold',
} as const satisfies Record<string, keyof typeof fontAssets>;

export const fontSizes = {
  caption: 12,
  small: 14,
  body: 16,
  title: 22,
  display: 30,
} as const;

export const lineHeights = {
  caption: 16,
  small: 20,
  body: 24,
  title: 28,
  display: 36,
} as const;
