import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount } from '@/components/Amount';
import { IconButton } from '@/components/IconButton';
import { MinusIcon, PlusIcon } from '@/components/icons';
import { PillButton } from '@/components/PillButton';
import { ReceiptCard } from '@/components/ReceiptCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { lineTotal } from '@/lib/calc';
import { formatNumber } from '@/lib/format';
import { MAX_QTY, parseRupiahInput, validateItemName } from '@/lib/validation';
import { useBillsStore } from '@/stores/bills';
import { fonts, fontSizes, spacing, useTheme } from '@/theme';

// Add a menu item (no itemId) or edit/remove one (F-03).
export default function MenuItemScreen() {
  const { colors } = useTheme();
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId?: string }>();
  const bill = useBillsStore((state) => state.bills[id]);
  const addItem = useBillsStore((state) => state.addItem);
  const updateItem = useBillsStore((state) => state.updateItem);
  const removeItem = useBillsStore((state) => state.removeItem);
  const priceRef = useRef<TextInput>(null);

  const item = bill?.items.find((i) => i.id === itemId);
  const editing = item !== undefined;

  const [name, setName] = useState(item?.name ?? '');
  const [price, setPrice] = useState(item ? formatNumber(item.unitPrice) : '');
  const [qty, setQty] = useState(item?.qty ?? 1);
  const [nameError, setNameError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  if (!bill) {
    return null;
  }

  const parsedPrice = parseRupiahInput(price);
  const preview = parsedPrice.ok ? lineTotal({ unitPrice: parsedPrice.value, qty }) : null;

  const submit = () => {
    const validName = validateItemName(name);
    setNameError(validName.ok ? null : validName.error);
    setPriceError(parsedPrice.ok ? null : parsedPrice.error);
    if (!validName.ok || !parsedPrice.ok) return;

    const input = { name, unitPrice: parsedPrice.value, qty };
    const result = editing ? updateItem(bill.id, item.id, input) : addItem(bill.id, input);
    if (result.ok) router.back();
  };

  const confirmRemove = () => {
    if (!editing) return;
    Alert.alert(`Hapus ${item.name}?`, 'Menu ini dihapus dari tagihan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          removeItem(bill.id, item.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
        <ScreenHeader title={editing ? 'Ubah menu' : 'Tambah menu'} subtitle={bill.title} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ReceiptCard contentStyle={styles.card}>
            <TextField
              label="Nama menu"
              placeholder="Misal Mie goreng spesial"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (nameError) setNameError(null);
              }}
              error={nameError}
              autoFocus={!editing}
              autoCapitalize="sentences"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => priceRef.current?.focus()}
            />
            <TextField
              ref={priceRef}
              label="Harga satuan (Rp)"
              placeholder="32.000"
              hint="Angka bulat, 0 sampai 100.000.000."
              value={price}
              onChangeText={(text) => {
                setPrice(text);
                if (priceError) setPriceError(null);
              }}
              error={priceError}
              keyboardType="number-pad"
              mono
              returnKeyType="done"
              onSubmitEditing={submit}
            />

            <View style={styles.qtyRow}>
              <Text style={[styles.label, { color: colors.text }]}>Jumlah</Text>
              <View style={styles.stepper}>
                <IconButton
                  accessibilityLabel="Kurangi jumlah"
                  bordered
                  disabled={qty <= 1}
                  icon={(color) => <MinusIcon color={color} size={20} />}
                  onPress={() => setQty((q) => Math.max(1, q - 1))}
                />
                <Text
                  accessibilityLabel={`Jumlah ${qty}`}
                  accessibilityLiveRegion="polite"
                  style={[styles.qty, { color: colors.text }]}>
                  {qty}
                </Text>
                <IconButton
                  accessibilityLabel="Tambah jumlah"
                  bordered
                  disabled={qty >= MAX_QTY}
                  icon={(color) => <PlusIcon color={color} size={20} />}
                  onPress={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
                />
              </View>
            </View>

            <ReceiptCard.Divider />
            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: colors.textMutedPaper }]}>
                Total baris
              </Text>
              {preview !== null ? (
                <Amount value={preview} strong />
              ) : (
                <Text style={[styles.previewLabel, { color: colors.textMutedPaper }]}>-</Text>
              )}
            </View>
          </ReceiptCard>

          {editing ? <PillButton label="Hapus menu" onPress={confirmRemove} /> : null}
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
          <PillButton
            variant="primary"
            label={editing ? 'Simpan' : 'Tambah ke pesanan'}
            onPress={submit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    gap: spacing.xl,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.body,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  qty: {
    fontFamily: fonts.monoStrong,
    fontSize: fontSizes.title,
    minWidth: 40,
    textAlign: 'center',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -spacing.md,
  },
  previewLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
