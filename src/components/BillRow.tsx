import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDateShort } from '@/lib/format';
import { fonts, fontSizes, minTouchTarget, spacing, useTheme } from '@/theme';
import type { Bill } from '@/types/bill';

import { Amount } from './Amount';

type BillRowProps = {
  bill: Bill;
  total: number;
  onPress: () => void;
};

export function BillRow({ bill, total, onPress }: BillRowProps) {
  const { colors } = useTheme();
  const people = `${bill.participants.length} orang`;
  const meta = `${formatDateShort(bill.date)} · ${people}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${bill.title}, ${meta}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.paper },
        pressed && { opacity: 0.8 },
      ]}>
      <View style={styles.text}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {bill.title}
        </Text>
        <Text style={[styles.meta, { color: colors.textMutedPaper }]}>{meta}</Text>
      </View>
      <Amount value={total} strong />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchTarget + spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.body,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small - 1,
  },
});
