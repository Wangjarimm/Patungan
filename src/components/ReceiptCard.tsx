import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { radius, spacing, useTheme } from '@/theme';

import { ZigzagEdge } from './ZigzagEdge';

type ReceiptCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

// Paper receipt: rounded top corners, zigzag bottom edge.
export function ReceiptCard({ children, style, contentStyle, testID }: ReceiptCardProps) {
  const { colors } = useTheme();

  return (
    <View style={style} testID={testID}>
      <View style={[styles.paper, { backgroundColor: colors.paper }, contentStyle]}>
        {children}
      </View>
      <ZigzagEdge color={colors.paper} />
    </View>
  );
}

// Dashed separator inside a receipt card.
function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.divider, style]}
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height={1}>
        <Line
          x1="0"
          y1="0.5"
          x2="100%"
          y2="0.5"
          stroke={colors.line}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      </Svg>
    </View>
  );
}

ReceiptCard.Divider = Divider;

const styles = StyleSheet.create({
  paper: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
});
