import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PersonShare } from '@/lib/calc';
import { formatPercent, formatRupiah } from '@/lib/format';
import type { ShareStatus } from '@/lib/summary';
import { fonts, fontSizes, minTouchTarget, spacing, useTheme } from '@/theme';
import type { BillSettings, Participant } from '@/types/bill';

import { Amount } from './Amount';
import { Avatar } from './Avatar';
import { CheckIcon } from './icons';
import { PillButton } from './PillButton';
import { ReceiptCard } from './ReceiptCard';
import { StatusBadge } from './StatusBadge';

type PersonShareCardProps = {
  participant: Participant;
  share: PersonShare;
  status: ShareStatus;
  settings: BillSettings;
  expanded: boolean;
  onToggle: () => void;
  // Manual payment status; shown for people who owe something.
  onTogglePaid: () => void;
};

function Line({ label, value, note }: { label: string; value: number; note?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, { color: colors.text }]}>
        {label}
        {note ? <Text style={{ color: colors.textMutedPaper }}> {note}</Text> : null}
      </Text>
      <Amount value={value} showCurrency={false} size="small" strong />
    </View>
  );
}

function Status({ status }: { status: ShareStatus }) {
  if (status === 'none') return null;
  return <StatusBadge status={status} />;
}

// One person's share: a compact row that expands into a receipt with the full breakdown.
export function PersonShareCard({
  participant,
  share,
  status,
  settings,
  expanded,
  onToggle,
  onTogglePaid,
}: PersonShareCardProps) {
  const { colors } = useTheme();
  const header = (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${participant.name}, ${formatRupiah(share.rounded)}`}
      accessibilityHint={expanded ? 'Ketuk untuk menutup rincian' : 'Ketuk untuk melihat rincian'}
      style={styles.header}>
      <Avatar name={participant.name} color={participant.color} size={expanded ? 'md' : 'sm'} />
      <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
        {participant.name}
      </Text>
      <Status status={status} />
      {expanded ? null : <Amount value={share.rounded} showCurrency={false} strong />}
    </Pressable>
  );

  if (!expanded) {
    return <View style={[styles.compact, { backgroundColor: colors.paper }]}>{header}</View>;
  }

  return (
    <ReceiptCard>
      {header}
      <View style={styles.lines}>
        {share.items.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMutedPaper }]}>
            Tidak ikut makan menu apa pun.
          </Text>
        ) : (
          share.items.map((line) => (
            <Line
              key={line.itemId}
              label={line.name}
              note={line.divisor > 1 ? `÷${line.divisor}` : undefined}
              value={line.amount}
            />
          ))
        )}
      </View>

      <ReceiptCard.Divider />

      <View style={styles.lines}>
        {share.discount > 0 ? <Line label="Diskon" value={-share.discount} /> : null}
        {settings.servicePct > 0 ? (
          <Line label={`Service ${formatPercent(settings.servicePct)}`} value={share.service} />
        ) : null}
        {settings.taxPct > 0 ? (
          <Line label={`Pajak ${formatPercent(settings.taxPct)}`} value={share.tax} />
        ) : null}
        {share.extraFee > 0 ? <Line label="Ongkir dibagi rata" value={share.extraFee} /> : null}
      </View>

      <View style={styles.totalRow}>
        <Text style={[styles.exact, { color: colors.textMutedPaper }]}>
          {Math.round(share.exact) === share.rounded
            ? 'Bagian'
            : `Tepat ${formatRupiah(share.exact)}, dibulatkan`}
        </Text>
        <Amount value={share.rounded} showCurrency={false} size="title" strong underline />
      </View>

      {status === 'pending' ? (
        <PillButton
          label="Tandai lunas"
          accessibilityHint={`Tandai ${participant.name} sudah transfer`}
          icon={(color) => <CheckIcon color={color} size={18} />}
          onPress={onTogglePaid}
          style={styles.paidButton}
        />
      ) : status === 'paid' ? (
        <PillButton
          label="Batalkan lunas"
          accessibilityHint={`Kembalikan ${participant.name} ke belum transfer`}
          onPress={onTogglePaid}
          style={styles.paidButton}
        />
      ) : null}
    </ReceiptCard>
  );
}

const styles = StyleSheet.create({
  compact: {
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  header: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: fontSizes.body,
  },
  lines: {
    gap: spacing.xs + 2,
    paddingTop: spacing.sm,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  lineLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  paidButton: {
    marginTop: spacing.lg,
  },
  exact: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption + 1,
  },
});
