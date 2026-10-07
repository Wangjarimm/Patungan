import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/AnimatedTabBar';
import { Amount } from '@/components/Amount';
import { BillRow } from '@/components/BillRow';
import { GroupCard } from '@/components/GroupCard';
import { PlusIcon } from '@/components/icons';
import { PillButton } from '@/components/PillButton';
import { ReceiptCard } from '@/components/ReceiptCard';
import { sortBillsByRecent } from '@/lib/history';
import { summarizeBill, summarizeOutstanding } from '@/lib/summary';
import { useOpenBill } from '@/services/navigation';
import { useBillsStore } from '@/stores/bills';
import { sortGroups, useGroupsStore } from '@/stores/groups';
import { fonts, fontSizes, lineHeights, spacing, useTheme } from '@/theme';

const RECENT_LIMIT = 5;

export default function HomeScreen() {
  const { colors } = useTheme();
  const tabBarInset = useTabBarInset();
  const openBill = useOpenBill();
  const bills = useBillsStore((state) => state.bills);
  const groupsById = useGroupsStore((state) => state.groups);
  const groups = useMemo(() => sortGroups(groupsById), [groupsById]);

  const sorted = useMemo(() => sortBillsByRecent(bills), [bills]);
  const outstanding = useMemo(() => summarizeOutstanding(sorted), [sorted]);
  const recent = sorted.slice(0, RECENT_LIMIT);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]}>
        <Text accessibilityRole="header" style={[styles.hero, { color: colors.text }]}>
          Patungan
        </Text>

        <ReceiptCard>
          <Text style={[styles.cardLabel, { color: colors.textMutedPaper }]}>
            Masih ditunggu dari teman
          </Text>
          <View style={styles.balanceRow}>
            <Amount value={outstanding.amount} size="display" strong underline />
            {outstanding.people > 0 ? (
              <Text style={[styles.cardMeta, { color: colors.textMutedPaper }]}>
                {outstanding.people} orang
              </Text>
            ) : null}
          </View>
          {outstanding.people === 0 ? (
            <>
              <ReceiptCard.Divider />
              <Text style={[styles.cardMeta, { color: colors.textMutedPaper }]}>
                Belum ada yang perlu ditagih.
              </Text>
            </>
          ) : null}
        </ReceiptCard>

        <PillButton
          variant="primary"
          label="Buat tagihan baru"
          icon={(color) => <PlusIcon color={color} size={20} />}
          onPress={() => router.push('/tagihan/baru')}
        />
        <PillButton label="Gabung pakai kode" onPress={() => router.push('/gabung')} />

        <View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>
            Grup
          </Text>
          {groups.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              Sering patungan dengan orang yang sama? Simpan peserta sebagai grup dari layar Isi
              pesanan.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.groups}>
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onPress={() => router.push({ pathname: '/grup/[id]', params: { id: group.id } })}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>
            Terakhir
          </Text>
          {recent.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              Belum ada tagihan. Tekan Buat tagihan baru setelah bayar ke kasir.
            </Text>
          ) : (
            recent.map((bill) => (
              <BillRow
                key={bill.id}
                summary={summarizeBill(bill)}
                onPress={() => openBill(bill.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.hero,
    lineHeight: lineHeights.hero,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  cardLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    marginBottom: spacing.xs,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardMeta: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
  },
  groups: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.title - 2,
    lineHeight: lineHeights.title,
    marginBottom: spacing.xs,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
});
