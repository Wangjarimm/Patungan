import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount } from '@/components/Amount';
import { Avatar } from '@/components/Avatar';
import { IconButton } from '@/components/IconButton';
import { PlusIcon, SettingsIcon } from '@/components/icons';
import { ItemRow } from '@/components/ItemRow';
import { JoinCodeChip } from '@/components/JoinCodeChip';
import { PillButton } from '@/components/PillButton';
import { ReceiptCard } from '@/components/ReceiptCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SyncNotice } from '@/components/SyncNotice';
import { calculateBill } from '@/lib/calc';
import { formatDateShort } from '@/lib/format';
import { describeCharges } from '@/lib/share-text';
import { useBillRealtime } from '@/services/supabase/use-sync';
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
  useBillRealtime(id);

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

  // Bills joined with a code are read-only apart from your own eater choices (RLS agrees).
  const isOwner = bill.role === 'owner';
  const me = bill.participants.find((p) => p.id === bill.myParticipantId);
  const subtitle = isOwner
    ? formatDateShort(bill.date)
    : `${formatDateShort(bill.date)} · kamu sebagai ${me?.name ?? '-'}`;
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
        subtitle={subtitle}
        onBack={goHome}
        right={
          isOwner ? (
            <IconButton
              accessibilityLabel="Pajak, service, diskon, dan pembayar"
              bordered
              icon={(color) => <SettingsIcon color={color} size={20} />}
              onPress={openSettings}
            />
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <SyncNotice />
        {isOwner && bill.ownerId !== null ? <JoinCodeChip code={bill.joinCode} /> : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.people}>
          {bill.participants.map((p) => {
            const isPayer = p.id === bill.payerId;
            return (
              <Pressable
                key={p.id}
                disabled={!isOwner}
                onPress={() =>
                  router.push({
                    pathname: '/tagihan/[id]/peserta',
                    params: { id: bill.id, participantId: p.id },
                  })
                }
                accessibilityRole={isOwner ? 'button' : 'text'}
                accessibilityLabel={isPayer ? `${p.name}, yang bayar ke kasir` : p.name}
                accessibilityHint={isOwner ? 'Ketuk untuk mengubah nama atau menghapus' : undefined}
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
          {isOwner ? (
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
          ) : null}
        </ScrollView>

        {isOwner && bill.participants.length > 1 ? (
          <Pressable
            onPress={() => router.push({ pathname: '/grup/baru', params: { billId: bill.id } })}
            accessibilityRole="button"
            accessibilityHint="Simpan peserta tagihan ini supaya bisa dipakai lagi"
            style={styles.saveGroup}>
            <Text style={[styles.saveGroupText, { color: colors.text }]}>
              Simpan peserta sebagai grup
            </Text>
          </Pressable>
        ) : null}

        <ReceiptCard>
          <View style={[styles.cardHeader, { borderBottomColor: colors.text }]}>
            <Text accessibilityRole="header" style={[styles.cardTitle, { color: colors.text }]}>
              Pesanan
            </Text>
            <Text style={[styles.cardHint, { color: colors.textMutedPaper }]}>
              {isOwner
                ? 'Ketuk inisial siapa yang makan'
                : 'Ketuk inisialmu di menu yang kamu makan'}
            </Text>
          </View>

          {bill.items.length === 0 ? (
            <Text style={[styles.emptyItems, { color: colors.textMutedPaper }]}>
              {isOwner
                ? 'Belum ada menu. Tekan Tambah menu untuk mulai mencatat pesanan.'
                : 'Belum ada menu. Tunggu pembuat tagihan mengisinya.'}
            </Text>
          ) : (
            bill.items.map((item, index) => (
              <Fragment key={item.id}>
                {index > 0 ? <ReceiptCard.Divider style={styles.divider} /> : null}
                <ItemRow
                  item={item}
                  participants={bill.participants}
                  onEdit={
                    isOwner
                      ? () =>
                          router.push({
                            pathname: '/tagihan/[id]/menu',
                            params: { id: bill.id, itemId: item.id },
                          })
                      : undefined
                  }
                  onToggleEater={(participantId) => toggleEater(bill.id, item.id, participantId)}
                  onToggleAll={isOwner ? () => toggleAllEaters(bill.id, item.id) : undefined}
                  canToggle={(participantId) => isOwner || participantId === bill.myParticipantId}
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
        {isOwner ? (
          <PillButton
            label="Tambah menu"
            icon={(color) => <PlusIcon color={color} size={18} />}
            onPress={() => router.push({ pathname: '/tagihan/[id]/menu', params: { id: bill.id } })}
          />
        ) : null}
        <View style={styles.totalRow}>
          <View style={styles.totalText}>
            <Amount value={result.totals.exact} size="title" strong />
            {isOwner ? (
              <Pressable
                onPress={openSettings}
                accessibilityRole="button"
                accessibilityHint="Buka pengaturan pajak, service, dan diskon"
                hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}>
                <Text style={[styles.totalNote, { color: colors.textMuted }]}>
                  {charges ? `termasuk ${charges}` : 'belum ada service dan pajak'}
                  <Text style={[styles.totalLink, { color: colors.text }]}> · Atur</Text>
                </Text>
              </Pressable>
            ) : (
              <Text style={[styles.totalNote, { color: colors.textMuted }]}>
                {charges ? `termasuk ${charges}` : 'belum ada service dan pajak'}
              </Text>
            )}
          </View>
          <PillButton
            variant="primary"
            label="Lihat bagian"
            onPress={() =>
              router.push({ pathname: '/tagihan/[id]/hasil', params: { id: bill.id } })
            }
          />
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
  saveGroup: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: -spacing.sm,
  },
  saveGroupText: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.small,
    textDecorationLine: 'underline',
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
