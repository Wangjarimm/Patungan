import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDateShort, formatRupiah } from '@/lib/format';
import type { BillSummary } from '@/lib/summary';
import { fonts, fontSizes, minTouchTarget, radius, spacing, useTheme } from '@/theme';

import { Amount } from './Amount';
import { CheckIcon } from './icons';

type BillRowProps = {
  summary: BillSummary;
  onPress: () => void;
  // 'card' on paper for bills still owed; 'plain' row on the background for the rest.
  variant?: 'card' | 'plain';
};

function statusLabel(summary: BillSummary): string {
  if (summary.status === 'unpaid') return `Menunggu ${formatRupiah(summary.remaining)}`;
  if (summary.status === 'settled') return 'Lunas';
  return 'Belum ada nominal';
}

export function BillRow({ summary, onPress, variant = 'card' }: BillRowProps) {
  const { colors } = useTheme();
  const { bill, status } = summary;
  const meta = `${formatDateShort(bill.date)} · ${bill.participants.length} orang`;
  const label = statusLabel(summary);
  const card = variant === 'card';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${bill.title}, ${formatRupiah(summary.total)}, ${label}, ${meta}`}
      style={({ pressed }) => [
        styles.row,
        card
          ? { backgroundColor: colors.paper, borderRadius: 12, paddingHorizontal: spacing.lg }
          : { borderBottomWidth: 1, borderBottomColor: colors.line },
        pressed && { opacity: 0.8 },
      ]}>
      <View style={styles.line}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {bill.title}
        </Text>
        <Amount value={summary.total} showCurrency={false} strong />
      </View>
      <View style={styles.line}>
        <Text
          numberOfLines={1}
          style={[styles.meta, { color: card ? colors.textMutedPaper : colors.textMuted }]}>
          {meta}
        </Text>
        {status === 'unpaid' ? (
          <View style={[styles.pill, { backgroundColor: colors.pendingBg }]}>
            <Text style={[styles.pillText, { color: colors.pendingText }]}>{label}</Text>
          </View>
        ) : status === 'settled' ? (
          <View style={styles.settled}>
            <CheckIcon color={colors.success} size={14} />
            <Text style={[styles.pillText, { color: colors.success }]}>{label}</Text>
          </View>
        ) : (
          <Text style={[styles.meta, { color: colors.textMuted }]}>{label}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchTarget + spacing.lg,
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: fontSizes.body,
  },
  meta: {
    flexShrink: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.small - 1,
  },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
  },
  pillText: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.caption,
  },
  settled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
