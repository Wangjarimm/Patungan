import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BillRow } from '@/components/BillRow';
import { ChoiceChips } from '@/components/ChoiceChips';
import { buildHistory, type HistoryFilter } from '@/lib/history';
import { useBillsStore } from '@/stores/bills';
import { fonts, fontSizes, lineHeights, spacing, useTheme } from '@/theme';

const EMPTY_MESSAGES: Record<HistoryFilter, string> = {
  all: 'Tagihan yang kamu buat akan muncul di sini. Mulai dari Beranda.',
  unpaid: 'Semua tagihan sudah lunas. Tidak ada yang perlu ditagih.',
  settled: 'Belum ada tagihan yang lunas. Tandai teman yang sudah transfer di Bagian tiap orang.',
};

// History with filters, unpaid bills on top and settled bills per month (F-10).
export default function HistoryScreen() {
  const { colors } = useTheme();
  const bills = useBillsStore((state) => state.bills);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const { sections, counts } = useMemo(() => buildHistory(bills, filter), [bills, filter]);

  const open = (id: string) => router.push({ pathname: '/tagihan/[id]', params: { id } });

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(summary) => summary.bill.id}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
              Riwayat
            </Text>
            <ChoiceChips
              accessibilityLabel="Filter riwayat"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Semua' },
                {
                  value: 'unpaid',
                  label: 'Belum lunas',
                  badge: counts.unpaid,
                  accessibilityLabel: `Belum lunas, ${counts.unpaid} tagihan`,
                },
                { value: 'settled', label: 'Lunas' },
              ]}
            />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text
            accessibilityRole="header"
            style={[styles.sectionTitle, { color: colors.textMuted }]}>
            {section.title}
          </Text>
        )}
        renderItem={({ item, section }) => (
          <BillRow
            summary={item}
            variant={section.kind === 'unpaid' ? 'card' : 'plain'}
            onPress={() => open(item.bill.id)}
          />
        )}
        ItemSeparatorComponent={({ section }: { section: { kind: string } }) =>
          section.kind === 'unpaid' ? <View style={styles.cardGap} /> : null
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textMuted }]}>{EMPTY_MESSAGES[filter]}</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.hero,
    lineHeight: lineHeights.hero,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.small,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  cardGap: {
    height: spacing.sm,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.lg,
  },
});
