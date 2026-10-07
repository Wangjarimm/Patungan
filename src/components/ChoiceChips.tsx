import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, fontSizes, minTouchTarget, radius, spacing, useTheme } from '@/theme';

type Option<T> = {
  value: T;
  label: string;
  // Spoken label when the visible one is terse, e.g. "100" -> "Bulatkan ke 100 rupiah".
  accessibilityLabel?: string;
  // Small count shown next to the label, e.g. unpaid bills; hidden when 0.
  badge?: number;
};

type ChoiceChipsProps<T> = {
  accessibilityLabel: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  // Compact: small segmented toggle (Rp | %). Default: row of equal pills.
  compact?: boolean;
};

// Single-choice pill group, announced as radio buttons.
export function ChoiceChips<T extends string | number>({
  accessibilityLabel,
  options,
  value,
  onChange,
  compact = false,
}: ChoiceChipsProps<T>) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.group, compact && [styles.compactGroup, { borderColor: colors.outline }]]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            style={[
              compact ? styles.compactChip : styles.chip,
              selected
                ? {
                    backgroundColor: compact ? colors.text : colors.accent,
                    borderColor: 'transparent',
                  }
                : { borderColor: compact ? 'transparent' : colors.outline },
            ]}>
            <Text
              style={[
                styles.label,
                {
                  color: selected ? (compact ? colors.paper : colors.onAccent) : colors.text,
                  fontFamily: selected ? fonts.heading : fonts.bodyStrong,
                },
              ]}>
              {option.label}
            </Text>
            {option.badge ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: selected && !compact ? colors.onAccent : colors.accent },
                ]}>
                <Text
                  style={[
                    styles.badgeText,
                    { color: selected && !compact ? colors.accent : colors.onAccent },
                  ]}>
                  {option.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  compactGroup: {
    gap: 0,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs + 2,
    minHeight: minTouchTarget,
    borderWidth: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  compactChip: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    borderWidth: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  label: {
    fontSize: fontSizes.small,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.caption - 1,
  },
});
