import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { minTouchTarget, radius, useTheme } from '@/theme';

type IconButtonProps = {
  // Required: icon-only buttons must be labelled for screen readers.
  accessibilityLabel: string;
  icon: (color: string) => ReactNode;
  onPress: () => void;
  bordered?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  accessibilityLabel,
  icon,
  onPress,
  bordered = false,
  disabled = false,
  style,
}: IconButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        bordered && { borderWidth: 1, borderColor: colors.outline },
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.7 },
        style,
      ]}>
      {icon(colors.text)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
