import { StyleSheet, Text, View } from 'react-native';

import { useSyncStore } from '@/stores/sync';
import { fonts, fontSizes, lineHeights, radius, spacing, useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { PlusIcon } from './icons';

// Tells the user when the server refused a change, which was then undone on this device.
export function SyncNotice() {
  const { colors } = useTheme();
  const message = useSyncStore((state) => state.lastRejection);
  const dismiss = useSyncStore((state) => state.setRejection);

  if (!message) return null;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.box, { backgroundColor: colors.pendingBg }]}>
      <Text style={[styles.text, { color: colors.pendingText }]}>{message}</Text>
      <IconButton
        accessibilityLabel="Tutup pemberitahuan"
        icon={(color) => (
          <View style={styles.close}>
            <PlusIcon color={color} size={18} />
          </View>
        )}
        onPress={() => dismiss(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.card * 2,
    paddingLeft: spacing.lg,
  },
  text: {
    flex: 1,
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
    paddingVertical: spacing.md,
  },
  close: {
    transform: [{ rotate: '45deg' }],
  },
});
