import { StyleSheet, Text, View } from 'react-native';

import { fonts, fontSizes, spacing, useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { MinusIcon, PlusIcon } from './icons';

type StepperProps = {
  // Spoken name of the value, e.g. "jumlah" or "service".
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
};

export function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = String,
}: StepperProps) {
  const { colors } = useTheme();
  const shown = format(value);

  return (
    <View style={styles.row}>
      <IconButton
        accessibilityLabel={`Kurangi ${label}`}
        bordered
        disabled={value <= min}
        icon={(color) => <MinusIcon color={color} size={20} />}
        onPress={() => onChange(Math.max(min, value - step))}
      />
      <Text
        accessibilityLabel={`${label} ${shown}`}
        accessibilityLiveRegion="polite"
        style={[styles.value, { color: colors.text }]}>
        {shown}
      </Text>
      <IconButton
        accessibilityLabel={`Tambah ${label}`}
        bordered
        disabled={value >= max}
        icon={(color) => <PlusIcon color={color} size={20} />}
        onPress={() => onChange(Math.min(max, value + step))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  value: {
    fontFamily: fonts.monoStrong,
    fontSize: fontSizes.body + 1,
    minWidth: 52,
    textAlign: 'center',
  },
});
