import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  type ErrorBoundaryProps,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { ErrorScreen } from '@/components/ErrorScreen';
import { trackScreenTransitions } from '@/services/navigation';
import { useAccountSync } from '@/services/supabase/use-account-sync';
import { useSyncEngine } from '@/services/supabase/use-sync';
import { useAccountStore } from '@/stores/account';
import { useBillsStore } from '@/stores/bills';
import { useGroupsStore } from '@/stores/groups';
import { usePersistHydrated } from '@/stores/hydration';
import { useSettingsStore } from '@/stores/settings';
import { fontAssets, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

// Any error thrown while rendering shows "Ada yang salah" with a retry, never a blank screen.
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorScreen {...props} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const { scheme, colors } = useTheme();
  const billsReady = usePersistHydrated(useBillsStore);
  const groupsReady = usePersistHydrated(useGroupsStore);
  const settingsReady = usePersistHydrated(useSettingsStore);
  const accountReady = usePersistHydrated(useAccountStore);
  const themePreference = useSettingsStore((state) => state.themePreference);
  const hasName = useAccountStore((state) => state.displayName !== null);
  const reduceMotion = useReducedMotion();
  const ready =
    (fontsLoaded || fontError !== null) &&
    billsReady &&
    groupsReady &&
    settingsReady &&
    accountReady;

  useAccountSync();
  useSyncEngine();

  // Also theme native pieces (date picker, alerts). Android 10+ only; useTheme covers the rest.
  useEffect(() => {
    Appearance.setColorScheme?.(themePreference === 'system' ? 'unspecified' : themePreference);
  }, [themePreference]);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  const baseTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.line,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenListeners={trackScreenTransitions}
        screenOptions={{
          headerShown: false,
          animation: reduceMotion ? 'none' : 'default',
          contentStyle: { backgroundColor: colors.background },
        }}>
        {/* First launch asks for a name before anything else (F-12). */}
        <Stack.Protected guard={!hasName}>
          <Stack.Screen name="selamat-datang" />
        </Stack.Protected>
        <Stack.Protected guard={hasName}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="tagihan/[id]/peserta" options={{ presentation: 'modal' }} />
          <Stack.Screen name="tagihan/[id]/menu" options={{ presentation: 'modal' }} />
          <Stack.Screen name="grup/baru" options={{ presentation: 'modal' }} />
          <Stack.Screen name="gabung" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
