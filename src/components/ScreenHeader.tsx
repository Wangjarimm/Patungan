import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, fontSizes, lineHeights, spacing, useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { ChevronLeftIcon } from './icons';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
};

// Back button, optional small subtitle, and a large heading, as in the design screens.
export function ScreenHeader({ title, subtitle, onBack, right }: ScreenHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <IconButton
        accessibilityLabel="Kembali"
        icon={(color) => <ChevronLeftIcon color={color} />}
        onPress={onBack ?? (() => router.back())}
        style={styles.back}
      />
      <View style={styles.titles}>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        ) : null}
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  back: {
    marginTop: 2,
  },
  titles: {
    flex: 1,
    paddingTop: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.display - 2,
    lineHeight: lineHeights.display - 2,
  },
});
