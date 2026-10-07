import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { iconStroke } from '@/theme';

export type IconProps = {
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

export function PlusIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 5v14M5 12h14" stroke={color} {...strokeProps} />
    </Svg>
  );
}

export function MinusIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 12h14" stroke={color} {...strokeProps} />
    </Svg>
  );
}

export function CheckIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="m5 12.5 4.5 4.5L19 7" stroke={color} {...strokeProps} />
    </Svg>
  );
}

export function ChevronLeftIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M15 19 8 12l7-7" stroke={color} {...strokeProps} />
    </Svg>
  );
}

export function ChevronRightIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="m9 5 7 7-7 7" stroke={color} {...strokeProps} />
    </Svg>
  );
}

export function SendIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M21 3 10 14" stroke={color} {...strokeProps} />
      <Path d="m21 3-7 18-4-7-7-4 18-7Z" stroke={color} {...strokeProps} />
    </Svg>
  );
}

export function CopyIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 9h11v11H9z" stroke={color} {...strokeProps} />
      <Path d="M5 15H4V4h11v1" stroke={color} {...strokeProps} />
    </Svg>
  );
}

export function TrashIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
        stroke={color}
        {...strokeProps}
      />
    </Svg>
  );
}

export function SettingsIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 7h10M18 7h2M4 17h2M10 17h10" stroke={color} {...strokeProps} />
      <Circle cx={16} cy={7} r={2} stroke={color} {...strokeProps} />
      <Circle cx={8} cy={17} r={2} stroke={color} {...strokeProps} />
    </Svg>
  );
}
