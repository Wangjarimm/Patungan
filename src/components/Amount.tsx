import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { formatNumber, formatRupiah } from '@/lib/format';
import { amountUnderline, fonts, fontSizes, useTheme } from '@/theme';

type AmountProps = {
  value: number;
  size?: keyof typeof fontSizes;
  // Hide the "Rp" prefix in dense lists where the column is clearly money.
  showCurrency?: boolean;
  // Important amounts get a thick accent underline, the same shape in both themes.
  underline?: boolean;
  strong?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
};

// Rupiah amount in IBM Plex Mono, rounded to the nearest Rupiah for display.
export function Amount({
  value,
  size = 'body',
  showCurrency = true,
  underline = false,
  strong = false,
  color,
  style,
}: AmountProps) {
  const { colors } = useTheme();
  const text = showCurrency ? formatRupiah(value) : formatNumber(value);

  const label = (
    <Text
      style={[
        styles.text,
        {
          fontSize: fontSizes[size],
          color: color ?? colors.text,
          fontFamily: strong ? fonts.monoStrong : fonts.mono,
        },
        style,
      ]}>
      {text}
    </Text>
  );

  if (!underline) {
    return label;
  }

  return (
    <View style={styles.wrapper}>
      {label}
      <View
        testID="amount-underline"
        style={[styles.underline, { backgroundColor: colors.accent }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontVariant: ['tabular-nums'],
  },
  wrapper: {
    alignSelf: 'flex-start',
  },
  underline: {
    height: amountUnderline.thickness,
    marginTop: amountUnderline.gap,
    borderRadius: amountUnderline.radius,
  },
});
