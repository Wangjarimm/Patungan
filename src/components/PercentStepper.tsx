import { StyleSheet, Text, TextInput, View } from 'react-native';

import { fonts, fontSizes, minTouchTarget, spacing, useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { MinusIcon, PlusIcon } from './icons';

type PercentStepperProps = {
  // Spoken name, e.g. "service" or "pajak".
  label: string;
  // Raw text so values like "5," can be typed; parsing happens in the screen.
  text: string;
  onChangeText: (text: string) => void;
  // Called by the - and + buttons with -1 or +1.
  onStep: (delta: number) => void;
  canDecrease: boolean;
  canIncrease: boolean;
  invalid?: boolean;
};

// Stepper whose value can also be typed, accepting decimals like "5,5" or "11.25".
export function PercentStepper({
  label,
  text,
  onChangeText,
  onStep,
  canDecrease,
  canIncrease,
  invalid = false,
}: PercentStepperProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <IconButton
        accessibilityLabel={`Kurangi ${label}`}
        bordered
        disabled={!canDecrease}
        icon={(color) => <MinusIcon color={color} size={20} />}
        onPress={() => onStep(-1)}
      />
      <View style={[styles.field, { borderBottomColor: invalid ? colors.warning : colors.line }]}>
        <TextInput
          accessibilityLabel={`${label} dalam persen`}
          value={text}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          selectTextOnFocus
          maxLength={6}
          placeholder="0"
          placeholderTextColor={colors.textMutedPaper}
          selectionColor={colors.accent}
          style={[styles.input, { color: colors.text }]}
        />
        <Text style={[styles.suffix, { color: colors.text }]}>%</Text>
      </View>
      <IconButton
        accessibilityLabel={`Tambah ${label}`}
        bordered
        disabled={!canIncrease}
        icon={(color) => <PlusIcon color={color} size={20} />}
        onPress={() => onStep(1)}
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
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    minHeight: minTouchTarget,
  },
  input: {
    fontFamily: fonts.monoStrong,
    fontSize: fontSizes.body + 1,
    minWidth: 44,
    textAlign: 'right',
    paddingVertical: 0,
  },
  suffix: {
    fontFamily: fonts.monoStrong,
    fontSize: fontSizes.body + 1,
  },
});
