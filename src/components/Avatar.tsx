import { StyleSheet, Text, View } from 'react-native';

import { getInitial } from '@/lib/avatar';
import { avatarTextColor, fonts } from '@/theme';

const SIZES = {
  sm: { box: 32, font: 13 },
  md: { box: 36, font: 15 },
  lg: { box: 44, font: 17 },
} as const;

type AvatarProps = {
  name: string;
  color: string;
  size?: keyof typeof SIZES;
  // Avatars usually sit next to the name, so they are hidden from screen readers by default.
  accessibilityLabel?: string;
};

export function Avatar({ name, color, size = 'md', accessibilityLabel }: AvatarProps) {
  const { box, font } = SIZES[size];

  return (
    <View
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      style={[styles.circle, { width: box, height: box, backgroundColor: color }]}>
      <Text
        maxFontSizeMultiplier={1.2}
        style={[styles.initial, { fontSize: font, color: avatarTextColor }]}>
        {getInitial(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: fonts.heading,
  },
});
