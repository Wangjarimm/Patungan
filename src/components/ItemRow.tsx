import { Pressable, StyleSheet, Text, View } from 'react-native';

import { lineTotal } from '@/lib/calc';
import { formatNumber } from '@/lib/format';
import { fonts, fontSizes, minTouchTarget, radius, spacing, useTheme } from '@/theme';
import type { Item, Participant } from '@/types/bill';

import { Amount } from './Amount';
import { PersonToggle } from './PersonToggle';

type ItemRowProps = {
  item: Item;
  participants: Participant[];
  // Omitted in bills you joined: only the owner edits the menu.
  onEdit?: () => void;
  onToggleEater: (participantId: string) => void;
  onToggleAll?: () => void;
  // Which initials can be tapped; defaults to all.
  canToggle?: (participantId: string) => boolean;
};

function eaterLabel(item: Item, participants: Participant[]): string | null {
  const count = item.eaterIds.length;
  if (count === 0) return null;
  if (participants.length > 1 && count === participants.length) return 'semua';
  return count === 1 ? 'sendiri' : `dibagi ${count}`;
}

export function ItemRow({
  item,
  participants,
  onEdit,
  onToggleEater,
  onToggleAll,
  canToggle = () => true,
}: ItemRowProps) {
  const { colors } = useTheme();
  const label = eaterLabel(item, participants);
  const unassigned = item.eaterIds.length === 0 && lineTotal(item) > 0;
  const everyone =
    participants.length > 0 && participants.every((p) => item.eaterIds.includes(p.id));

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onEdit}
        disabled={!onEdit}
        accessibilityRole={onEdit ? 'button' : 'text'}
        accessibilityLabel={`${item.name}, ${item.qty} kali ${formatNumber(item.unitPrice)} rupiah`}
        accessibilityHint={onEdit ? 'Ketuk untuk mengubah atau menghapus menu' : undefined}
        style={styles.header}>
        <View style={styles.titles}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.qty, { color: colors.textMutedPaper }]}>
            {item.qty} × {formatNumber(item.unitPrice)}
          </Text>
        </View>
        <Amount value={lineTotal(item)} showCurrency={false} strong />
      </Pressable>

      <View style={styles.toggles}>
        {participants.map((p) => (
          <PersonToggle
            key={p.id}
            name={p.name}
            color={p.color}
            selected={item.eaterIds.includes(p.id)}
            onToggle={() => onToggleEater(p.id)}
            disabled={!canToggle(p.id)}
          />
        ))}
        {onToggleAll && participants.length > 1 ? (
          <Pressable
            onPress={onToggleAll}
            accessibilityRole="button"
            accessibilityLabel={
              everyone ? `Kosongkan pemakan ${item.name}` : `Semua orang makan ${item.name}`
            }
            style={styles.allTarget}>
            <View style={[styles.allChip, { borderColor: colors.outline }]}>
              <Text style={[styles.allText, { color: colors.text }]}>
                {everyone ? 'Kosongkan' : 'Semua orang'}
              </Text>
            </View>
          </Pressable>
        ) : null}
      </View>

      {unassigned ? (
        <Text accessibilityLiveRegion="polite" style={[styles.status, { color: colors.warning }]}>
          Belum ada yang makan, menu ini belum dihitung.
        </Text>
      ) : label ? (
        <Text style={[styles.status, { color: colors.textMutedPaper }]}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: minTouchTarget,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.body,
  },
  qty: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.small - 1,
  },
  toggles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginLeft: -5,
  },
  allTarget: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  allChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  allText: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.caption + 1,
  },
  status: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption + 1,
  },
});
