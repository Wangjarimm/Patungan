import Constants from 'expo-constants';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountCard } from '@/components/AccountCard';
import { useTabBarInset } from '@/components/AnimatedTabBar';
import { ChoiceChips } from '@/components/ChoiceChips';
import { ExternalLinkIcon } from '@/components/icons';
import { ReceiptCard } from '@/components/ReceiptCard';
import { useSettingsStore, type ThemePreference } from '@/stores/settings';
import { fonts, fontSizes, lineHeights, minTouchTarget, spacing, useTheme } from '@/theme';

const REPO_URL = 'https://github.com/Wangjarimm/Patungan';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Ikuti sistem' },
  { value: 'light', label: 'Terang' },
  { value: 'dark', label: 'Gelap' },
];

// Google account and payment accounts arrive in phases 6 and 4.
export default function ProfileScreen() {
  const { colors } = useTheme();
  const tabBarInset = useTabBarInset();
  const themePreference = useSettingsStore((state) => state.themePreference);
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);
  const version = Constants.expoConfig?.version ?? '-';

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          Profil
        </Text>

        <AccountCard />

        <View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>
            Tampilan
          </Text>
          <ReceiptCard contentStyle={styles.card}>
            <Text style={[styles.label, { color: colors.text }]}>Tema</Text>
            <ChoiceChips
              accessibilityLabel="Tema"
              value={themePreference}
              onChange={setThemePreference}
              options={THEME_OPTIONS}
            />
            <Text style={[styles.hint, { color: colors.textMutedPaper }]}>
              Ikuti sistem memakai mode terang atau gelap sesuai pengaturan HP.
            </Text>
          </ReceiptCard>
        </View>

        <Pressable
          onPress={() => Linking.openURL(REPO_URL)}
          accessibilityRole="link"
          accessibilityLabel={`Kode sumber di GitHub, versi ${version}`}
          style={[styles.row, { borderBottomColor: colors.line }]}>
          <View style={styles.rowText}>
            <Text style={[styles.label, { color: colors.text }]}>Kode sumber di GitHub</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>Versi {version}</Text>
          </View>
          <ExternalLinkIcon color={colors.textMuted} size={20} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.hero,
    lineHeight: lineHeights.hero,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.title - 2,
    lineHeight: lineHeights.title,
    paddingHorizontal: spacing.xs,
  },
  card: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.body,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small - 1,
    lineHeight: lineHeights.small,
  },
  row: {
    minHeight: minTouchTarget + spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
