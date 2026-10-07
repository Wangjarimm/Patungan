import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, fontSizes, minTouchTarget, radius, spacing, useTheme } from '@/theme';

import { CopyIcon } from './icons';

// Join code of an online bill (F-13); tap to copy. Shown to the owner only.
export function JoinCodeChip({ code }: { code: string | null }) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);

  if (!code) {
    return (
      <Text style={[styles.pending, { color: colors.textMuted }]}>
        Kode gabung muncul setelah tagihan tersimpan online.
      </Text>
    );
  }

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    AccessibilityInfo.announceForAccessibility('Kode gabung disalin');
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={copy}
        accessibilityRole="button"
        accessibilityLabel={`Kode gabung ${code.split('').join(' ')}`}
        accessibilityHint="Ketuk untuk menyalin kode"
        style={[styles.chip, { borderColor: colors.text }]}>
        <Text style={[styles.code, { color: colors.text }]}>{code}</Text>
        <CopyIcon color={colors.text} size={16} />
      </Pressable>
      <Text style={[styles.note, { color: copied ? colors.success : colors.textMuted }]}>
        {copied ? 'Kode disalin.' : 'Bagikan kode ini supaya teman bisa bergabung.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  chip: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
  },
  code: {
    fontFamily: fonts.monoStrong,
    fontSize: fontSizes.body,
    letterSpacing: 2,
  },
  note: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption + 1,
  },
  pending: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption + 1,
  },
});
