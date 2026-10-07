import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
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

import { Avatar } from '@/components/Avatar';
import { ChoiceChips } from '@/components/ChoiceChips';
import { CheckIcon } from '@/components/icons';
import { PillButton } from '@/components/PillButton';
import { ReceiptCard } from '@/components/ReceiptCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { formatDateLong, parseIsoDate, todayIsoDate, toIsoDate } from '@/lib/format';
import { validateBillTitle, validateParticipantName } from '@/lib/validation';
import { useAccountStore } from '@/stores/account';
import { useBillsStore } from '@/stores/bills';
import { sortGroups, useGroupsStore } from '@/stores/groups';
import { fonts, fontSizes, minTouchTarget, spacing, useTheme } from '@/theme';

const NO_GROUP = 'none';

export default function NewBillScreen() {
  const { colors, scheme } = useTheme();
  const createBill = useBillsStore((state) => state.createBill);
  const groupsById = useGroupsStore((state) => state.groups);
  const groups = useMemo(
    () => sortGroups(groupsById).filter((g) => g.members.length > 0),
    [groupsById],
  );
  const params = useLocalSearchParams<{ groupId?: string }>();
  const payerRef = useRef<TextInput>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [payerName, setPayerName] = useState(() => useAccountStore.getState().displayName ?? '');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [payerError, setPayerError] = useState<string | null>(null);
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [groupId, setGroupId] = useState<string>(params.groupId ?? NO_GROUP);
  const [payerMemberId, setPayerMemberId] = useState<string | null>(null);
  const group = groups.find((g) => g.id === groupId);

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
    setTitleError(validTitle.ok ? null : validTitle.error);

    const payerMember = group?.members.find((m) => m.id === payerMemberId);
    if (group) {
      setPayerError(payerMember ? null : 'Pilih siapa yang bayar ke kasir.');
      if (!validTitle.ok || !payerMember) return;
    } else {
      const validPayer = validateParticipantName(payerName, []);
      setPayerError(validPayer.ok ? null : validPayer.error);
      if (!validTitle.ok || !validPayer.ok) return;
    }

    // With an account the bill goes online (gets a join code); without one it stays local.
    const { userId, displayName } = useAccountStore.getState();
    const owner = userId && displayName ? { userId, displayName } : null;
    const created = group
      ? createBill({
          title,
          date,
          payerName: payerMember?.name ?? '',
          members: group.members,
          owner,
        })
      : createBill({ title, date, payerName, owner });
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
                disabled={Platform.OS === 'web'}
                accessibilityRole="button"
                accessibilityLabel={`Tanggal, ${formatDateLong(date)}`}
                accessibilityHint="Ketuk untuk mengganti tanggal"
                style={[styles.dateButton, { borderBottomColor: colors.line }]}>
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {formatDateLong(date)}
                </Text>
                {Platform.OS === 'web' ? null : (
                  <Text style={[styles.dateAction, { color: colors.textMutedPaper }]}>Ganti</Text>
                )}
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

            {groups.length > 0 ? (
              <View style={styles.dateBlock}>
                <Text style={[styles.label, { color: colors.text }]}>Pakai grup</Text>
                <ChoiceChips
                  scrollable
                  accessibilityLabel="Pakai grup"
                  value={groupId}
                  onChange={(id) => {
                    setGroupId(id);
                    setPayerMemberId(null);
                    setPayerError(null);
                  }}
                  options={[
                    { value: NO_GROUP, label: 'Tanpa grup' },
                    ...groups.map((g) => ({
                      value: g.id,
                      label: g.name,
                      accessibilityLabel: `Grup ${g.name}, ${g.members.length} orang`,
                    })),
                  ]}
                />
              </View>
            ) : null}

            {group ? (
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Yang bayar ke kasir"
                style={styles.dateBlock}>
                <Text style={[styles.label, { color: colors.text }]}>Yang bayar ke kasir</Text>
                <Text style={[styles.hint, { color: colors.textMutedPaper }]}>
                  Semua {group.members.length} anggota {group.name} otomatis jadi peserta.
                </Text>
                {group.members.map((m) => {
                  const selected = m.id === payerMemberId;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => {
                        setPayerMemberId(m.id);
                        setPayerError(null);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={m.name}
                      style={styles.memberOption}>
                      <Avatar name={m.name} color={m.color} size="sm" />
                      <Text style={[styles.dateText, styles.flex, { color: colors.text }]}>
                        {m.name}
                      </Text>
                      {selected ? <CheckIcon color={colors.text} size={20} /> : null}
                    </Pressable>
                  );
                })}
                {payerError ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    style={[styles.hint, { color: colors.warning }]}>
                    {payerError}
                  </Text>
                ) : null}
              </View>
            ) : (
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
            )}
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
  flex: {
    flex: 1,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
  },
  memberOption: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
