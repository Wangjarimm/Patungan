import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PillButton } from '@/components/PillButton';
import { ReceiptCard } from '@/components/ReceiptCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { formatDateLong, parseIsoDate, todayIsoDate, toIsoDate } from '@/lib/format';
import { validateBillTitle, validateParticipantName } from '@/lib/validation';
import { useBillsStore } from '@/stores/bills';
import { fonts, fontSizes, minTouchTarget, spacing, useTheme } from '@/theme';

export default function NewBillScreen() {
  const { colors, scheme } = useTheme();
  const createBill = useBillsStore((state) => state.createBill);
  const payerRef = useRef<TextInput>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [payerName, setPayerName] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [payerError, setPayerError] = useState<string | null>(null);
  const [showIosPicker, setShowIosPicker] = useState(false);

  const pickDate = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: parseIsoDate(date),
        mode: 'date',
        maximumDate: new Date(),
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) setDate(toIsoDate(selected));
        },
      });
    } else {
      setShowIosPicker((visible) => !visible);
    }
  };

  const submit = () => {
    const validTitle = validateBillTitle(title);
    const validPayer = validateParticipantName(payerName, []);
    setTitleError(validTitle.ok ? null : validTitle.error);
    setPayerError(validPayer.ok ? null : validPayer.error);
    if (!validTitle.ok || !validPayer.ok) return;

    const created = createBill({ title, date, payerName });
    if (created.ok) {
      router.replace({ pathname: '/tagihan/[id]', params: { id: created.value } });
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
        <ScreenHeader title="Tagihan baru" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ReceiptCard contentStyle={styles.card}>
            <TextField
              label="Nama tempat"
              placeholder="Misal Kedai Mie Kenari"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (titleError) setTitleError(null);
              }}
              error={titleError}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => payerRef.current?.focus()}
              submitBehavior="submit"
            />

            <View style={styles.dateBlock}>
              <Text style={[styles.label, { color: colors.text }]}>Tanggal</Text>
              <Pressable
                onPress={pickDate}
                accessibilityRole="button"
                accessibilityLabel={`Tanggal, ${formatDateLong(date)}`}
                accessibilityHint="Ketuk untuk mengganti tanggal"
                style={[styles.dateButton, { borderBottomColor: colors.line }]}>
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {formatDateLong(date)}
                </Text>
                <Text style={[styles.dateAction, { color: colors.textMutedPaper }]}>Ganti</Text>
              </Pressable>
              {showIosPicker ? (
                <DateTimePicker
                  value={parseIsoDate(date)}
                  mode="date"
                  display="inline"
                  maximumDate={new Date()}
                  themeVariant={scheme}
                  accentColor={colors.accent}
                  onChange={(_, selected) => {
                    if (selected) setDate(toIsoDate(selected));
                  }}
                />
              ) : null}
            </View>

            <TextField
              ref={payerRef}
              label="Yang bayar ke kasir"
              placeholder="Nama kamu"
              hint="Orang ini otomatis jadi peserta pertama."
              value={payerName}
              onChangeText={(text) => {
                setPayerName(text);
                if (payerError) setPayerError(null);
              }}
              error={payerError}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={submit}
            />
          </ReceiptCard>
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
          <PillButton variant="primary" label="Lanjut isi pesanan" onPress={submit} />
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
  },
  card: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  dateBlock: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.body,
  },
  dateButton: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  dateText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
  },
  dateAction: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.small,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
