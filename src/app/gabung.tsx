import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { CheckIcon } from '@/components/icons';
import { PillButton } from '@/components/PillButton';
import { ReceiptCard } from '@/components/ReceiptCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { pickAvatarColor } from '@/lib/avatar';
import { formatDateLong } from '@/lib/format';
import { checkJoinCode, JOIN_CODE_LENGTH } from '@/lib/join-code';
import { validateParticipantName } from '@/lib/validation';
import {
  claimName,
  fetchBill,
  joinWithNewName,
  previewJoin,
  type JoinPreview,
} from '@/services/supabase/bills-api';
import { supabase } from '@/services/supabase/client';
import { useAccountStore } from '@/stores/account';
import { useBillsStore } from '@/stores/bills';
import { fonts, fontSizes, lineHeights, minTouchTarget, spacing, useTheme } from '@/theme';

const NEW_NAME = 'new';

// Join a friend's bill with a 6-character code (F-13) and pick or add your name (F-14).
export default function JoinScreen() {
  const { colors } = useTheme();
  const status = useAccountStore((state) => state.status);
  const userId = useAccountStore((state) => state.userId);
  const displayName = useAccountStore((state) => state.displayName) ?? '';
  const applyRemoteBill = useBillsStore((state) => state.applyRemoteBill);

  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<JoinPreview | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [newName, setNewName] = useState(displayName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const online = supabase !== null && status === 'online' && userId !== null;

  const openBill = async (billId: string) => {
    if (!supabase || !userId) return;
    const result = await fetchBill(supabase, billId, userId);
    if (result.status !== 'ok') {
      setError('Berhasil bergabung, tapi tagihan belum bisa dimuat. Coba lagi.');
      return;
    }
    applyRemoteBill(result.bill);
    router.replace({ pathname: '/tagihan/[id]', params: { id: billId } });
  };

  const findBill = async () => {
    const checked = checkJoinCode(code);
    if (!checked.ok) return setError(checked.error);
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const result = await previewJoin(supabase, checked.code);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    // Your own bill, or one you already joined: just open it.
    if (result.value.isOwner || result.value.myParticipantId) {
      setBusy(true);
      await openBill(result.value.billId);
      setBusy(false);
      return;
    }
    setPreview(result.value);
    setChoice(result.value.unclaimed.length === 0 ? NEW_NAME : null);
  };

  const join = async () => {
    if (!supabase || !preview) return;
    const checked = checkJoinCode(code);
    if (!checked.ok) return setError(checked.error);
    if (!choice) return setError('Pilih namamu dulu, atau tambah nama baru.');

    let joined: { ok: true; value: string } | { ok: false; error: string };
    setBusy(true);
    setError(null);
    if (choice === NEW_NAME) {
      const valid = validateParticipantName(newName, []);
      if (!valid.ok) {
        setBusy(false);
        return setError(valid.error);
      }
      const color = pickAvatarColor(preview.colorsInUse);
      joined = await joinWithNewName(supabase, checked.code, valid.value, color);
    } else {
      joined = await claimName(supabase, choice);
    }
    if (!joined.ok) {
      setBusy(false);
      return setError(joined.error);
    }
    await openBill(joined.value);
    setBusy(false);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
        <ScreenHeader title="Gabung pakai kode" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!online ? (
            <Text style={[styles.note, { color: colors.warning }]}>
              Butuh internet untuk bergabung. Pastikan HP online, lalu cek status di Profil.
            </Text>
          ) : null}

          <ReceiptCard contentStyle={styles.card}>
            <TextField
              label="Kode gabung"
              placeholder="6 karakter, misal MEK482"
              hint="Minta kode ke teman yang membuat tagihan."
              value={code}
              onChangeText={(text) => {
                setCode(text.toUpperCase());
                setPreview(null);
                setChoice(null);
                if (error) setError(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={JOIN_CODE_LENGTH + 2}
              mono
              returnKeyType="search"
              onSubmitEditing={findBill}
            />
          </ReceiptCard>

          {preview ? (
            <ReceiptCard contentStyle={styles.card}>
              <View>
                <Text style={[styles.note, { color: colors.textMutedPaper }]}>
                  {formatDateLong(preview.date)}
                </Text>
                <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
                  {preview.title}
                </Text>
                <Text style={[styles.note, { color: colors.textMutedPaper }]}>
                  {preview.payerName ? `Dibayar ${preview.payerName} · ` : ''}
                  {preview.participantCount} orang
                </Text>
              </View>
              <ReceiptCard.Divider />
              <View accessibilityRole="radiogroup" accessibilityLabel="Kamu yang mana?">
                <Text style={[styles.label, { color: colors.text }]}>Kamu yang mana?</Text>
                {preview.unclaimed.map((p) => {
                  const selected = choice === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setChoice(p.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={p.name}
                      style={styles.option}>
                      <Avatar name={p.name} color={p.color} size="sm" />
                      <Text style={[styles.optionText, { color: colors.text }]}>{p.name}</Text>
                      {selected ? <CheckIcon color={colors.text} size={20} /> : null}
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => setChoice(NEW_NAME)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: choice === NEW_NAME }}
                  accessibilityLabel="Nama saya tidak ada, tambah nama baru"
                  style={styles.option}>
                  <Text style={[styles.optionText, { color: colors.text }]}>
                    Nama saya tidak ada
                  </Text>
                  {choice === NEW_NAME ? <CheckIcon color={colors.text} size={20} /> : null}
                </Pressable>
              </View>
              {choice === NEW_NAME ? (
                <TextField
                  label="Nama baru"
                  value={newName}
                  onChangeText={setNewName}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={join}
                />
              ) : null}
            </ReceiptCard>
          ) : null}

          {error ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.error, { color: colors.warning }]}>
              {error}
            </Text>
          ) : null}
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
          {preview ? (
            <PillButton
              variant="primary"
              label={busy ? 'Menggabungkan...' : 'Gabung'}
              onPress={join}
              disabled={busy || !online}
            />
          ) : (
            <PillButton
              variant="primary"
              label={busy ? 'Mencari...' : 'Cari tagihan'}
              onPress={findBill}
              disabled={busy || !online}
            />
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
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.title,
    lineHeight: lineHeights.title,
  },
  label: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.body,
    marginBottom: spacing.xs,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
  },
  option: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
  },
  error: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
