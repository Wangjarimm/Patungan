import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BillRow } from '@/components/BillRow';
import { billTotal } from '@/lib/summary';
import { sortBillsByRecent, useBillsStore } from '@/stores/bills';
import { fonts, fontSizes, lineHeights, spacing, useTheme } from '@/theme';

// Plain list for now; filters and monthly grouping (F-10) come in phase 2.
export default function HistoryScreen() {
  const { colors } = useTheme();
  const bills = useBillsStore((state) => state.bills);
  const sorted = useMemo(() => sortBillsByRecent(bills), [bills]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={sorted}
        keyExtractor={(bill) => bill.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
            Riwayat
          </Text>
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            Tagihan yang kamu buat akan muncul di sini. Mulai dari Beranda.
          </Text>
        }
        renderItem={({ item }) => (
          <BillRow
            bill={item}
            total={billTotal(item)}
            onPress={() => router.push({ pathname: '/tagihan/[id]', params: { id: item.id } })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.display,
    lineHeight: lineHeights.display,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    paddingHorizontal: spacing.xs,
  },
});
