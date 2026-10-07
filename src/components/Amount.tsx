import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { formatNumber, formatRupiah } from '@/lib/format';
import { fonts, fontSizes, useTheme } from '@/theme';

type AmountProps = {
  value: number;
  size?: keyof typeof fontSizes;
  // Hide the "Rp" prefix in dense lists where the column is clearly money.
  showCurrency?: boolean;
  // Important amounts: highlighter mark in light mode, thick underline in dark mode.
  highlight?: boolean;
  strong?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
};

// Rupiah amount in IBM Plex Mono, rounded to the nearest Rupiah for display.
export function Amount({
  value,
  size = 'body',
  showCurrency = true,
  highlight = false,
  strong = false,
  color,
  style,
}: AmountProps) {
  const { colors, scheme } = useTheme();
  const text = showCurrency ? formatRupiah(value) : formatNumber(value);
  const fontSize = fontSizes[size];

  const label = (
    <Text
      style={[
        styles.text,
        {
          fontSize,
          color: color ?? colors.text,
          fontFamily: strong ? fonts.monoStrong : fonts.mono,
        },
        style,
      ]}>
      {text}
    </Text>
  );

  if (!highlight) {
    return label;
  }

  const dark = scheme === 'dark';
  return (
    <View style={styles.wrapper}>
      <View
        testID={dark ? 'amount-underline' : 'amount-highlight'}
        style={[
          styles.mark,
          { backgroundColor: colors.accent },
          dark ? { height: 3, bottom: 0 } : { height: fontSize * 0.45, bottom: fontSize * 0.1 },
        ]}
      />
      {label}
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontVariant: ['tabular-nums'],
  },
  wrapper: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-end',
  },
  mark: {
    position: 'absolute',
    left: -2,
    right: -2,
    borderRadius: 2,
  },
});
