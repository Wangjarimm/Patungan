import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount } from '@/components/Amount';
import { Avatar } from '@/components/Avatar';
import { ChoiceChips } from '@/components/ChoiceChips';
import { CheckIcon, ChevronRightIcon } from '@/components/icons';
import { PillButton } from '@/components/PillButton';
import { ReceiptCard } from '@/components/ReceiptCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Stepper } from '@/components/Stepper';
import { TextField } from '@/components/TextField';
import { calculateBill } from '@/lib/calc';
import { formatNumber, formatPercent } from '@/lib/format';
import { parsePercentInput, parseRupiahInput } from '@/lib/validation';
import { useBillsStore } from '@/stores/bills';
import { fonts, fontSizes, lineHeights, minTouchTarget, spacing, useTheme } from '@/theme';
import type { DiscountType, RoundingStep } from '@/types/bill';

const ROUNDING_OPTIONS: { value: RoundingStep; label: string; accessibilityLabel: string }[] = [
  { value: 1, label: 'Tidak', accessibilityLabel: 'Tidak dibulatkan' },
  { value: 100, label: '100', accessibilityLabel: 'Bulatkan ke 100 rupiah' },
  { value: 500, label: '500', accessibilityLabel: 'Bulatkan ke 500 rupiah' },
  { value: 1000, label: '1.000', accessibilityLabel: 'Bulatkan ke 1.000 rupiah' },
];

function amountText(value: number): string {
  return value > 0 ? formatNumber(value) : '';
}

// Service, tax, discount, delivery fee, rounding, and payer (F-05). Edits stay in a draft
// with a live total until saved.
export default function BillSettingsScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bill = useBillsStore((state) => state.bills[id]);
  const updateSettings = useBillsStore((state) => state.updateSettings);
  const setPayer = useBillsStore((state) => state.setPayer);

  const initial = bill?.settings;
  const [servicePct, setServicePct] = useState(initial?.servicePct ?? 0);
  const [taxPct, setTaxPct] = useState(initial?.taxPct ?? 0);
  const [taxAfterService, setTaxAfterService] = useState(initial?.taxAfterService ?? true);
  const [discountType, setDiscountType] = useState<DiscountType>(initial?.discountType ?? 'amount');
  const [discountText, setDiscountText] = useState(() => {
    if (!initial || initial.discountValue === 0) return '';
    return initial.discountType === 'percent'
      ? String(initial.discountValue).replace('.', ',')
      : formatNumber(initial.discountValue);
  });
  const [feeText, setFeeText] = useState(amountText(initial?.extraFee ?? 0));
  const [roundingStep, setRoundingStep] = useState<RoundingStep>(initial?.roundingStep ?? 100);
  const [payerId, setPayerId] = useState(bill?.payerId ?? null);
  const [choosingPayer, setChoosingPayer] = useState(false);

  const discount =
    discountType === 'percent'
      ? parsePercentInput(discountText, { allowEmpty: true, label: 'Diskon' })
      : parseRupiahInput(discountText, { allowEmpty: true, label: 'Diskon' });
  const fee = parseRupiahInput(feeText, { allowEmpty: true, label: 'Ongkir' });

  const discountValue = discount.ok ? discount.value : 0;
  const extraFee = fee.ok ? fee.value : 0;

  const draftSettings = useMemo(
    () => ({
      servicePct,
      taxPct,
      taxAfterService,
      discountType,
      discountValue,
      extraFee,
      roundingStep,
    }),
    [servicePct, taxPct, taxAfterService, discountType, discountValue, extraFee, roundingStep],
  );
  const total = useMemo(
    () => (bill ? calculateBill({ ...bill, settings: draftSettings }).totals.rounded : 0),
    [bill, draftSettings],
  );

  if (!bill) {
    return null;
  }

  const payer = bill.participants.find((p) => p.id === payerId);
  const valid = discount.ok && fee.ok;

  const save = () => {
    if (!valid) return;
    updateSettings(bill.id, draftSettings);
    if (payerId) setPayer(bill.id, payerId);
    router.back();
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
        <ScreenHeader title="Pajak, service, diskon" subtitle={bill.title} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ReceiptCard contentStyle={styles.card}>
            <View style={styles.settingRow}>
              <Text style={[styles.label, { color: colors.text }]}>Service charge</Text>
              <Stepper
                label="service"
                value={servicePct}
                onChange={setServicePct}
                min={0}
                max={100}
                format={formatPercent}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={[styles.label, { color: colors.text }]}>Pajak restoran</Text>
              <Stepper
                label="pajak"
                value={taxPct}
                onChange={setTaxPct}
                min={0}
                max={100}
                format={formatPercent}
              />
            </View>

            <ReceiptCard.Divider />

            <View style={styles.settingRow}>
              <View style={styles.flex}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Pajak dihitung setelah service
                </Text>
                <Text style={[styles.note, { color: colors.textMutedPaper }]}>
                  Cara yang umum di restoran
                </Text>
              </View>
              <Switch
                accessibilityLabel="Pajak dihitung setelah service"
                value={taxAfterService}
                onValueChange={setTaxAfterService}
                trackColor={{ false: colors.line, true: colors.accent }}
                thumbColor={colors.paper}
                ios_backgroundColor={colors.line}
              />
            </View>

            <ReceiptCard.Divider />

            <View style={styles.block}>
              <View style={styles.settingRow}>
                <Text style={[styles.label, { color: colors.text }]}>Diskon</Text>
                <ChoiceChips
                  compact
                  accessibilityLabel="Jenis diskon"
                  options={[
                    { value: 'amount', label: 'Rp', accessibilityLabel: 'Diskon dalam rupiah' },
                    { value: 'percent', label: '%', accessibilityLabel: 'Diskon dalam persen' },
                  ]}
                  value={discountType}
                  onChange={(type: DiscountType) => {
                    if (type !== discountType) setDiscountText('');
                    setDiscountType(type);
                  }}
                />
              </View>
              <TextField
                label={discountType === 'percent' ? 'Diskon (%)' : 'Diskon (Rp)'}
                placeholder={discountType === 'percent' ? 'Misal 10' : 'Misal 20.000 dari promo'}
                hint="Dibagi sesuai porsi pesanan tiap orang."
                value={discountText}
                onChangeText={setDiscountText}
                error={discount.ok ? null : discount.error}
                keyboardType={discountType === 'percent' ? 'decimal-pad' : 'number-pad'}
                mono
              />
            </View>

            <TextField
              label="Ongkir atau biaya lain (Rp)"
              placeholder="Misal 15.000"
              hint="Dibagi rata ke semua orang."
              value={feeText}
              onChangeText={setFeeText}
              error={fee.ok ? null : fee.error}
              keyboardType="number-pad"
              mono
            />

            <ReceiptCard.Divider />

            <View style={styles.block}>
              <Text style={[styles.label, { color: colors.text }]}>
                Bulatkan bagian tiap orang ke atas
              </Text>
              <ChoiceChips
                accessibilityLabel="Pembulatan"
                options={ROUNDING_OPTIONS}
                value={roundingStep}
                onChange={setRoundingStep}
              />
            </View>
          </ReceiptCard>

          <View style={styles.payerSection}>
            <Pressable
              onPress={() => setChoosingPayer((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel={`Yang bayar ke kasir, ${payer?.name ?? 'belum dipilih'}`}
              accessibilityHint="Ketuk untuk memilih orang lain"
              accessibilityState={{ expanded: choosingPayer }}
              style={[styles.payerRow, { borderBottomColor: colors.line }]}>
              <Text style={[styles.label, styles.flex, { color: colors.text }]}>
                Yang bayar ke kasir
              </Text>
              {payer ? <Avatar name={payer.name} color={payer.color} size="sm" /> : null}
              <Text style={[styles.payerName, { color: colors.text }]}>
                {payer?.name ?? 'Pilih'}
              </Text>
              <ChevronRightIcon color={colors.textMuted} size={18} />
            </Pressable>

            {choosingPayer ? (
              <View accessibilityRole="radiogroup" accessibilityLabel="Pilih pembayar">
                {bill.participants.map((p) => {
                  const selected = p.id === payerId;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => {
                        setPayerId(p.id);
                        setChoosingPayer(false);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={p.name}
                      style={styles.payerOption}>
                      <Avatar name={p.name} color={p.color} size="sm" />
                      <Text style={[styles.payerName, styles.flex, { color: colors.text }]}>
                        {p.name}
                      </Text>
                      {selected ? <CheckIcon color={colors.text} size={20} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        </ScrollView>

        <SafeAreaView
          edges={['bottom']}
          style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
          <View style={styles.flex}>
            <Text style={[styles.note, { color: colors.textMuted }]}>Total jadi</Text>
            <Amount value={total} size="title" strong />
          </View>
          <PillButton variant="primary" label="Simpan" onPress={save} disabled={!valid} />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  block: {
    gap: spacing.md,
  },
  label: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.body,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption + 1,
    lineHeight: lineHeights.caption + 2,
  },
  payerSection: {
    gap: spacing.xs,
  },
  payerRow: {
    minHeight: minTouchTarget + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
  },
  payerName: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
  },
  payerOption: {
    minHeight: minTouchTarget + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
