export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  // Top corners of the receipt card.
  card: 6,
  pill: 999,
} as const;

// Zigzag edge height at the bottom of the receipt card.
export const zigzagHeight = 8;

// Minimum touch target size in dp.
export const minTouchTarget = 44;

// Stroke width for line icons.
export const iconStroke = 2;
