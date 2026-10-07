import { StyleSheet, Text, View } from 'react-native';

import { fonts, fontSizes, radius, spacing, useTheme } from '@/theme';

import { CheckIcon } from './icons';

export type PaymentStatus = 'pending' | 'paid' | 'cashier';

const LABELS: Record<PaymentStatus, string> = {
  pending: 'Belum transfer',
  paid: 'Lunas',
  cashier: 'bayar ke kasir',
};

// Payment status as text (plus an icon for "Lunas"), never color alone.
export function StatusBadge({ status }: { status: PaymentStatus }) {
  const { colors } = useTheme();
  const label = LABELS[status];

  if (status === 'cashier') {
    return <Text style={[styles.plain, { color: colors.textMutedPaper }]}>{label}</Text>;
  }

  if (status === 'paid') {
    return (
      <View style={styles.row} accessible accessibilityLabel={label}>
        <CheckIcon color={colors.success} size={14} />
        <Text style={[styles.text, { color: colors.success }]}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.pill, { backgroundColor: colors.pendingBg }]}>
      <Text style={[styles.text, { color: colors.pendingText }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  text: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.caption,
  },
  plain: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },
});
