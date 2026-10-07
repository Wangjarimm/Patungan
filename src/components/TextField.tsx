import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { fonts, fontSizes, minTouchTarget, spacing, useTheme } from '@/theme';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string | null;
  hint?: string;
  // Monospace input for amounts.
  mono?: boolean;
};

// Labelled input on paper with an underline and an inline error message.
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, mono = false, ...inputProps },
  ref,
) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.textMutedPaper}
        selectionColor={colors.accent}
        style={[
          styles.input,
          {
            color: colors.text,
            borderBottomColor: error ? colors.warning : colors.line,
            fontFamily: mono ? fonts.mono : fonts.body,
          },
        ]}
        {...inputProps}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.message, { color: colors.warning }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.message, { color: colors.textMutedPaper }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.body,
  },
  input: {
    minHeight: minTouchTarget,
    fontSize: fontSizes.body,
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption + 1,
  },
});
