import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { confirmDestructive } from '@/components/confirm';
import { PillButton } from '@/components/PillButton';
import { ReceiptCard } from '@/components/ReceiptCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { useBillsStore } from '@/stores/bills';
import { fonts, fontSizes, lineHeights, spacing, useTheme } from '@/theme';

// Add participants (no participantId) or rename/remove one (F-02).
export default function ParticipantScreen() {
  const { colors } = useTheme();
  const { id, participantId } = useLocalSearchParams<{ id: string; participantId?: string }>();
  const bill = useBillsStore((state) => state.bills[id]);
  const addParticipant = useBillsStore((state) => state.addParticipant);
  const renameParticipant = useBillsStore((state) => state.renameParticipant);
  const removeParticipant = useBillsStore((state) => state.removeParticipant);
  const inputRef = useRef<TextInput>(null);

  const participant = bill?.participants.find((p) => p.id === participantId);
  const editing = participant !== undefined;

  const [name, setName] = useState(participant?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  if (!bill) {
    return null;
  }

  const submit = () => {
    if (editing) {
      const result = renameParticipant(bill.id, participant.id, name);
      if (!result.ok) return setError(result.error);
      router.back();
      return;
    }
    const result = addParticipant(bill.id, name);
    if (!result.ok) return setError(result.error);
    // Stay open so several people can be added in a row.
    setLastAdded(name.trim());
    setName('');
    setError(null);
    inputRef.current?.focus();
  };

  const confirmRemove = () => {
    if (!editing) return;
    const isPayer = participant.id === bill.payerId;
    confirmDestructive(
      `Hapus ${participant.name}?`,
      isPayer
        ? `${participant.name} juga dilepas dari semua menu. Pembayar pindah ke peserta lain.`
        : `${participant.name} juga dilepas dari semua menu.`,
      'Hapus',
      () => {
        removeParticipant(bill.id, participant.id);
        router.back();
      },
    );
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
        <ScreenHeader title={editing ? 'Ubah peserta' : 'Tambah peserta'} subtitle={bill.title} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ReceiptCard contentStyle={styles.card}>
            {editing ? (
              <View style={styles.identity}>
                <Avatar name={name || participant.name} color={participant.color} size="lg" />
              </View>
            ) : null}
            <TextField
              ref={inputRef}
              label="Nama"
              placeholder="Misal Dinda"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError(null);
              }}
              error={error}
              autoFocus
              autoCapitalize="words"
              returnKeyType={editing ? 'done' : 'next'}
              submitBehavior="submit"
              onSubmitEditing={submit}
            />
            {lastAdded ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.added, { color: colors.success }]}>
                {lastAdded} ditambahkan. Ketik nama berikutnya atau tekan Selesai.
              </Text>
            ) : null}
            {!editing ? (
              <Text style={[styles.hint, { color: colors.textMutedPaper }]}>
                Sudah ada: {bill.participants.map((p) => p.name).join(', ')}
              </Text>
            ) : null}
          </ReceiptCard>

          {editing ? <PillButton label="Hapus dari tagihan" onPress={confirmRemove} /> : null}
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
          {editing ? (
            <PillButton variant="primary" label="Simpan" onPress={submit} />
          ) : (
            <View style={styles.row}>
              <PillButton label="Selesai" onPress={() => router.back()} style={styles.flex} />
              <PillButton variant="primary" label="Tambah" onPress={submit} style={styles.flex} />
            </View>
          )}
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
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  identity: {
    alignItems: 'center',
  },
  added: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.small,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
});
