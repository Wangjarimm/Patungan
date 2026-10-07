import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { formatDateShort } from '@/lib/format';
import { useBillsStore } from '@/stores/bills';
import { fonts, fontSizes, lineHeights, spacing, useTheme } from '@/theme';

// Temporary: the full order screen (participants, items, eaters) is built in stage 2.
export default function BillScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bill = useBillsStore((state) => state.bills[id]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={bill?.title ?? 'Tagihan tidak ditemukan'}
        subtitle={bill ? formatDateShort(bill.date) : undefined}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
      <View style={styles.body}>
        <Text style={[styles.text, { color: colors.textMuted }]}>
          {bill
            ? `Pembayar: ${bill.participants.find((p) => p.id === bill.payerId)?.name ?? '-'}`
            : 'Tagihan ini sudah tidak ada. Kembali ke Beranda.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    paddingHorizontal: spacing.xl,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
});
