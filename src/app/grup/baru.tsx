import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { PillButton } from '@/components/PillButton';
import { ReceiptCard } from '@/components/ReceiptCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { useBillsStore } from '@/stores/bills';
import { useGroupsStore } from '@/stores/groups';
import { fonts, fontSizes, lineHeights, spacing, useTheme } from '@/theme';

// Saves a bill's participants as a reusable group (F-09).
export default function SaveGroupScreen() {
  const { colors } = useTheme();
  const { billId } = useLocalSearchParams<{ billId: string }>();
  const bill = useBillsStore((state) => state.bills[billId]);
  const createGroup = useGroupsStore((state) => state.createGroup);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!bill) {
    return null;
  }

  const save = () => {
    const result = createGroup(
      name,
      bill.participants.map((p) => ({ name: p.name, color: p.color })),
    );
    if (!result.ok) return setError(result.error);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
        <ScreenHeader title="Simpan sebagai grup" subtitle={bill.title} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ReceiptCard contentStyle={styles.card}>
            <TextField
              label="Nama grup"
              placeholder="Misal Kantor lantai 3"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError(null);
              }}
              error={error}
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={save}
            />
            <View style={styles.members}>
              <Text style={[styles.label, { color: colors.text }]}>
                Anggota ({bill.participants.length} orang)
              </Text>
              {bill.participants.map((p) => (
                <View key={p.id} style={styles.member}>
                  <Avatar name={p.name} color={p.color} size="sm" />
                  <Text style={[styles.memberName, { color: colors.text }]}>{p.name}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.hint, { color: colors.textMutedPaper }]}>
              Nanti pilih grup ini saat membuat tagihan supaya semua orang terisi sekaligus.
            </Text>
          </ReceiptCard>
        </ScrollView>
        <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
          <PillButton variant="primary" label="Simpan grup" onPress={save} />
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
  members: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.body,
  },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  memberName: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
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
});
