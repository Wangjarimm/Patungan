import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, fontSizes, radius, spacing, useTheme } from '@/theme';
import type { Group } from '@/types/bill';

import { Avatar } from './Avatar';

const MAX_AVATARS = 3;
const AVATAR = 28;

type GroupCardProps = {
  group: Group;
  onPress: () => void;
};

export function GroupCard({ group, onPress }: GroupCardProps) {
  const { colors } = useTheme();
  const shown = group.members.slice(0, MAX_AVATARS);
  const extra = group.members.length - shown.length;
  const count = `${group.members.length} orang`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Grup ${group.name}, ${count}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.paper },
        pressed && { opacity: 0.8 },
      ]}>
      <View style={styles.avatars}>
        {shown.map((member, index) => (
          <View
            key={member.id}
            style={[styles.ring, { borderColor: colors.paper }, index > 0 && styles.overlap]}>
            <Avatar name={member.name} color={member.color} size="xs" />
          </View>
        ))}
        {extra > 0 ? (
          <View
            style={[
              styles.ring,
              styles.overlap,
              styles.more,
              { borderColor: colors.paper, backgroundColor: colors.textMutedPaper },
            ]}>
            <Text style={[styles.moreText, { color: colors.paper }]}>+{extra}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
        {group.name}
      </Text>
      <Text style={[styles.count, { color: colors.textMutedPaper }]}>{count}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 156,
    minHeight: 112,
    borderRadius: radius.card * 3,
    padding: spacing.lg,
    gap: 2,
  },
  avatars: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  ring: {
    width: AVATAR + 4,
    height: AVATAR + 4,
    borderRadius: (AVATAR + 4) / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlap: {
    marginLeft: -8,
  },
  more: {
    overflow: 'hidden',
  },
  moreText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.caption - 2,
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.body,
  },
  count: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small - 1,
  },
});
