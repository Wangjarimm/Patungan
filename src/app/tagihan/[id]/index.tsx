import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount } from '@/components/Amount';
import { Avatar } from '@/components/Avatar';
import { IconButton } from '@/components/IconButton';
import { PlusIcon, SettingsIcon } from '@/components/icons';
import { ItemRow } from '@/components/ItemRow';
import { PillButton } from '@/components/PillButton';
import { ReceiptCard } from '@/components/ReceiptCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { calculateBill } from '@/lib/calc';
import { formatDateShort } from '@/lib/format';
import { describeCharges } from '@/lib/share-text';
import { useBillsStore } from '@/stores/bills';
import { fonts, fontSizes, lineHeights, minTouchTarget, spacing, useTheme } from '@/theme';

function goHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function BillScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bill = useBillsStore((state) => state.bills[id]);
  const toggleEater = useBillsStore((state) => state.toggleEater);
  const toggleAllEaters = useBillsStore((state) => state.toggleAllEaters);
  const result = useMemo(() => (bill ? calculateBill(bill) : null), [bill]);

  if (!bill || !result) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Tagihan tidak ditemukan" onBack={goHome} />
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          Tagihan ini sudah tidak ada. Kembali ke Beranda untuk membuat yang baru.
        </Text>
      </SafeAreaView>
    );
  }

  const charges = describeCharges(bill.settings);
  const openSettings = () =>
    router.push({ pathname: '/tagihan/[id]/pengaturan', params: { id: bill.id } });
  const unassignedCount = result.unassignedItemIds.length;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={bill.title}
        subtitle={formatDateShort(bill.date)}
        onBack={goHome}
        right={
          <IconButton
            accessibilityLabel="Pajak, service, diskon, dan pembayar"
            bordered
            icon={(color) => <SettingsIcon color={color} size={20} />}
            onPress={openSettings}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.people}>
          {bill.participants.map((p) => {
            const isPayer = p.id === bill.payerId;
            return (
              <Pressable
                key={p.id}
                onPress={() =>
                  router.push({
                    pathname: '/tagihan/[id]/peserta',
                    params: { id: bill.id, participantId: p.id },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={isPayer ? `${p.name}, yang bayar ke kasir` : p.name}
                accessibilityHint="Ketuk untuk mengubah nama atau menghapus"
                style={styles.person}>
                <View style={[styles.ring, { borderColor: isPayer ? p.color : 'transparent' }]}>
                  <Avatar name={p.name} color={p.color} size="lg" />
                </View>
                <Text numberOfLines={1} style={[styles.personName, { color: colors.text }]}>
                  {p.name}
                </Text>
                {isPayer ? (
                  <Text style={[styles.payerTag, { color: colors.textMuted }]}>bayar</Text>
                ) : null}
              </Pressable>
            );
          })}
          <Pressable
            onPress={() =>
              router.push({ pathname: '/tagihan/[id]/peserta', params: { id: bill.id } })
            }
            accessibilityRole="button"
            accessibilityLabel="Tambah peserta"
            style={styles.person}>
            <View style={[styles.addCircle, { borderColor: colors.outline }]}>
              <PlusIcon color={colors.text} size={20} />
            </View>
            <Text style={[styles.personName, { color: colors.textMuted }]}>Tambah</Text>
          </Pressable>
        </ScrollView>

        <ReceiptCard>
          <View style={[styles.cardHeader, { borderBottomColor: colors.text }]}>
            <Text accessibilityRole="header" style={[styles.cardTitle, { color: colors.text }]}>
              Pesanan
            </Text>
            <Text style={[styles.cardHint, { color: colors.textMutedPaper }]}>
              Ketuk inisial siapa yang makan
            </Text>
          </View>

          {bill.items.length === 0 ? (
            <Text style={[styles.emptyItems, { color: colors.textMutedPaper }]}>
              Belum ada menu. Tekan Tambah menu untuk mulai mencatat pesanan.
            </Text>
          ) : (
            bill.items.map((item, index) => (
              <Fragment key={item.id}>
                {index > 0 ? <ReceiptCard.Divider style={styles.divider} /> : null}
                <ItemRow
                  item={item}
                  participants={bill.participants}
                  onEdit={() =>
                    router.push({
                      pathname: '/tagihan/[id]/menu',
                      params: { id: bill.id, itemId: item.id },
                    })
                  }
                  onToggleEater={(participantId) => toggleEater(bill.id, item.id, participantId)}
                  onToggleAll={() => toggleAllEaters(bill.id, item.id)}
                />
              </Fragment>
            ))
          )}
        </ReceiptCard>
      </ScrollView>

      <SafeAreaView
        edges={['bottom']}
        style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
        {unassignedCount > 0 ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.warning, { color: colors.warning }]}>
            {unassignedCount} menu belum ada yang makan dan belum dihitung.
          </Text>
        ) : null}
        <PillButton
          label="Tambah menu"
          icon={(color) => <PlusIcon color={color} size={18} />}
          onPress={() => router.push({ pathname: '/tagihan/[id]/menu', params: { id: bill.id } })}
        />
        <View style={styles.totalRow}>
          <View style={styles.totalText}>
            <Amount value={result.totals.exact} size="title" strong />
            <Pressable
              onPress={openSettings}
              accessibilityRole="button"
              accessibilityHint="Buka pengaturan pajak, service, dan diskon"
              hitSlop={{ top: 12, bottom: 12 }}>
              <Text style={[styles.totalNote, { color: colors.textMuted }]}>
                {charges ? `termasuk ${charges}` : 'belum ada service dan pajak'}
                <Text style={[styles.totalLink, { color: colors.text }]}> · Atur</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const AVATAR_RING = 52;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    paddingHorizontal: spacing.xl,
  },
  people: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  person: {
    width: 64,
    minHeight: minTouchTarget,
    alignItems: 'center',
    gap: spacing.xs,
  },
  ring: {
    width: AVATAR_RING,
    height: AVATAR_RING,
    borderRadius: AVATAR_RING / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircle: {
    width: AVATAR_RING,
    height: AVATAR_RING,
    borderRadius: AVATAR_RING / 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personName: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.caption,
  },
  payerTag: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption - 1,
    marginTop: -spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderBottomWidth: 2,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.body + 1,
  },
  cardHint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },
  emptyItems: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
    paddingVertical: spacing.lg,
  },
  divider: {
    marginVertical: spacing.xs,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  warning: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.small,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  totalText: {
    flex: 1,
    gap: 2,
  },
  totalNote: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },
  totalLink: {
    fontFamily: fonts.bodyStrong,
    textDecorationLine: 'underline',
  },
});
