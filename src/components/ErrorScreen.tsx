import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, fontSizes, lineHeights, spacing, useTheme } from '@/theme';

import { PillButton } from './PillButton';

// Shown instead of a blank screen when a screen throws. Bills are stored on the device, so
// nothing is lost; "Coba lagi" re-renders the screen.
export function ErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const { colors } = useTheme();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    console.error('[error-boundary]', error);
  }, [error]);

  const onRetry = async () => {
    setRetrying(true);
    try {
      await retry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
        Ada yang salah
      </Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        Aplikasi mengalami masalah saat menampilkan layar ini. Tagihanmu tetap tersimpan di HP.
      </Text>
      <PillButton
        variant="primary"
        label={retrying ? 'Mencoba lagi...' : 'Coba lagi'}
        onPress={onRetry}
        disabled={retrying}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.display,
    lineHeight: lineHeights.display,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
});
