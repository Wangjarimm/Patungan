import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PillButton } from '@/components/PillButton';
import { ReceiptCard } from '@/components/ReceiptCard';
import { TextField } from '@/components/TextField';
import { useAccountStore } from '@/stores/account';
import { fonts, fontSizes, lineHeights, spacing, useTheme } from '@/theme';

// First launch (F-12): ask for a name; the anonymous account is created in the background.
export default function WelcomeScreen() {
  const { colors } = useTheme();
  const setDisplayName = useAccountStore((state) => state.setDisplayName);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    const result = setDisplayName(name);
    if (!result.ok) setError(result.error);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={[styles.hero, { color: colors.text }]}>
            Patungan
          </Text>
          <Text style={[styles.lead, { color: colors.textMuted }]}>
            Bagi tagihan makan bareng dengan adil, tagih teman tanpa canggung.
          </Text>
          <ReceiptCard contentStyle={styles.card}>
            <TextField
              label="Siapa namamu?"
              placeholder="Misal Raka"
              hint="Nama ini dilihat teman saat bergabung ke tagihanmu. Bisa diubah di Profil."
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError(null);
              }}
              error={error}
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={start}
            />
          </ReceiptCard>
        </ScrollView>
        <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
          <PillButton variant="primary" label="Mulai" onPress={start} />
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
    padding: spacing.lg,
    gap: spacing.lg,
  },
  hero: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.hero,
    lineHeight: lineHeights.hero,
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xs,
  },
  lead: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    paddingHorizontal: spacing.xs,
  },
  card: {
    paddingBottom: spacing.xl,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
