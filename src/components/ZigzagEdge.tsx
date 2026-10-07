import { useState } from 'react';
import { View, type ColorValue, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { zigzagHeight } from '@/theme';

type ZigzagEdgeProps = {
  color: ColorValue;
  height?: number;
  toothWidth?: number;
};

// Builds a torn-paper edge: a filled band whose bottom is a row of downward teeth.
export function buildZigzagPath(width: number, height: number, toothWidth: number): string {
  const teeth = Math.max(1, Math.round(width / toothWidth));
  const step = width / teeth;
  let path = 'M0 0';
  for (let i = 0; i < teeth; i++) {
    path += ` L${(i + 0.5) * step} ${height} L${(i + 1) * step} 0`;
  }
  return `${path} Z`;
}

// Decorative bottom edge of a receipt card; hidden from screen readers.
export function ZigzagEdge({ color, height = zigzagHeight, toothWidth = 16 }: ZigzagEdgeProps) {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View
      testID="zigzag-edge"
      onLayout={onLayout}
      style={{ height }}
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Path d={buildZigzagPath(width, height, toothWidth)} fill={color} />
        </Svg>
      ) : null}
    </View>
  );
}
