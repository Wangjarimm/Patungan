import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SYNC_ERROR_MESSAGES } from '@/services/supabase/errors';
import { useAccountStore, type ConnectionStatus } from '@/stores/account';
import { avatarColors, fonts, fontSizes, lineHeights, spacing, useTheme } from '@/theme';

import { Avatar } from './Avatar';
import { PillButton } from './PillButton';
import { ReceiptCard } from './ReceiptCard';
import { TextField } from './TextField';

const STATUS_LABELS: Record<Exclude<ConnectionStatus, 'error'>, string> = {
  idle: 'Belum tersambung ke server.',
  connecting: 'Menyambungkan ke server...',
  online: 'Tersambung. Tagihan online tersinkron.',
  offline: 'Offline. Data tetap tersimpan di HP dan dikirim saat online.',
  disabled: 'Mode offline: server belum diatur di versi aplikasi ini.',
};

// Guest account (F-12): the name others see and the connection to the server.
export function AccountCard() {
  const { colors } = useTheme();
  const displayName = useAccountStore((state) => state.displayName) ?? '';
  const status = useAccountStore((state) => state.status);
  const error = useAccountStore((state) => state.error);
  const setDisplayName = useAccountStore((state) => state.setDisplayName);
  const requestSync = useAccountStore((state) => state.requestSync);

  const [name, setName] = useState(displayName);
  const [nameError, setNameError] = useState<string | null>(null);

  const saveName = () => {
    if (name.trim() === displayName) return;
    const result = setDisplayName(name);
    setNameError(result.ok ? null : result.error);
  };

  const statusText =
    status === 'error' ? SYNC_ERROR_MESSAGES[error ?? 'unknown'] : STATUS_LABELS[status];
  const statusColor =
    status === 'online'
      ? colors.success
      : status === 'error'
        ? colors.warning
        : colors.textMutedPaper;

  return (
    <View style={styles.section}>
      <View style={styles.identity}>
        <Avatar name={displayName || '?'} color={avatarColors[0]} size="lg" />
        <View style={styles.identityText}>
          <Text accessibilityRole="header" style={[styles.name, { color: colors.text }]}>
            {displayName}
          </Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>Akun tamu di HP ini</Text>
        </View>
      </View>
      <ReceiptCard contentStyle={styles.card}>
        <TextField
          label="Namamu"
          hint="Dilihat teman saat bergabung ke tagihanmu."
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (nameError) setNameError(null);
          }}
          onEndEditing={saveName}
          onSubmitEditing={saveName}
          error={nameError}
          autoCapitalize="words"
          returnKeyType="done"
        />
        <Text accessibilityLiveRegion="polite" style={[styles.hint, { color: statusColor }]}>
          {statusText}
        </Text>
        {status === 'error' || status === 'offline' ? (
          <PillButton label="Coba lagi" onPress={requestSync} />
        ) : null}
      </ReceiptCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.title,
    lineHeight: lineHeights.title,
  },
  card: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small - 1,
    lineHeight: lineHeights.small,
  },
});
