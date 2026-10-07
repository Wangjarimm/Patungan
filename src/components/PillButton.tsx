import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { fonts, fontSizes, minTouchTarget, radius, spacing, useTheme } from '@/theme';

type PillButtonProps = {
  label: string;
  onPress: () => void;
  // Primary uses the accent color; use at most one per screen.
  variant?: 'primary' | 'secondary';
  icon?: (color: string) => ReactNode;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function PillButton({
  label,
  onPress,
  variant = 'secondary',
  icon,
  disabled = false,
  accessibilityHint,
  style,
  testID,
}: PillButtonProps) {
  const { colors } = useTheme();
  const primary = variant === 'primary';
  const foreground = primary ? colors.onAccent : colors.text;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        primary
          ? { backgroundColor: colors.accent, borderColor: colors.accent }
          : { backgroundColor: 'transparent', borderColor: colors.outline },
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.8 },
        style,
      ]}>
      <View style={styles.content}>
        {icon?.(foreground)}
        <Text style={[styles.label, { color: foreground }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchTarget,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.body,
    textAlign: 'center',
  },
});
