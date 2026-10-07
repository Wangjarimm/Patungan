import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getInitial } from '@/lib/avatar';
import { avatarTextColor, fonts, minTouchTarget, useTheme } from '@/theme';

type PersonToggleProps = {
  name: string;
  color: string;
  selected: boolean;
  onToggle: () => void;
  // Read-only, e.g. someone else's choice in a bill you joined.
  disabled?: boolean;
};

const CIRCLE = 34;

// Tappable initial for marking who ate an item. Selected: filled avatar color with a ring;
// unselected: neutral fill, so the state is not conveyed by hue alone.
export function PersonToggle({
  name,
  color,
  selected,
  onToggle,
  disabled = false,
}: PersonToggleProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={name}
      hitSlop={0}
      style={[styles.target, disabled && !selected && styles.disabled]}>
      <View
        style={[
          styles.circle,
          selected
            ? { backgroundColor: color, borderColor: colors.text }
            : { backgroundColor: colors.line, borderColor: 'transparent' },
        ]}>
        <Text
          maxFontSizeMultiplier={1.2}
          style={[styles.initial, { color: selected ? avatarTextColor : colors.textMutedPaper }]}>
          {getInitial(name)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.6,
  },
  target: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: fonts.heading,
    fontSize: 13,
  },
});
