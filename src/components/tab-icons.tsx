import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { iconStroke } from '@/theme';

type IconProps = {
  color: ColorValue;
  size?: number;
};

const strokeProps = {
  fill: 'none',
  strokeWidth: iconStroke,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function HomeIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 10.5 12 3l9 7.5" stroke={color} {...strokeProps} />
      <Path d="M5 9.5V21h14V9.5" stroke={color} {...strokeProps} />
      <Path d="M10 21v-6h4v6" stroke={color} {...strokeProps} />
    </Svg>
  );
}

export function HistoryIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} stroke={color} {...strokeProps} />
      <Path d="M12 7v5l3 2" stroke={color} {...strokeProps} />
    </Svg>
  );
}

export function ProfileIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={4} stroke={color} {...strokeProps} />
      <Path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke={color} {...strokeProps} />
    </Svg>
  );
}
