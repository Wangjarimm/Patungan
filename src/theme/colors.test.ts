import { avatarColors, avatarTextColor, darkColors, lightColors } from './colors';

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

describe('color tokens', () => {
  it('match the light column of the PRD table', () => {
    expect(lightColors).toEqual({
      background: '#DCE6D5',
      paper: '#FFFFFF',
      surface: '#FFFFFF',
      text: '#15241A',
      textMuted: '#4A5A4E',
      textMutedPaper: '#56645A',
      line: '#DCE3D8',
      outline: '#8FA48C',
      accent: '#FF6A3D',
      onAccent: '#15241A',
      pendingBg: '#FFE9DC',
      pendingText: '#8F3412',
      success: '#1E6B43',
      warning: '#C2412D',
    });
  });

  it('match the dark column of the PRD table', () => {
    expect(darkColors).toEqual({
      background: '#131D17',
      paper: '#22332A',
      surface: '#1C2A22',
      text: '#E8EFE6',
      textMuted: '#A3B3A6',
      textMutedPaper: '#A9B8AC',
      line: '#3A4D41',
      outline: '#4F6656',
      accent: '#FF7A52',
      onAccent: '#131D17',
      pendingBg: '#4A2618',
      pendingText: '#FFB79A',
      success: '#6FD39B',
      warning: '#FF6B6B',
    });
  });
});

describe('avatar colors', () => {
  it('has ten unique colors starting with the five from the PRD', () => {
    expect(avatarColors).toHaveLength(10);
    expect(new Set(avatarColors).size).toBe(10);
    expect(avatarColors.slice(0, 5)).toEqual([
      '#B4471B',
      '#2367A0',
      '#6A4AB8',
      '#237A4F',
      '#A93A6B',
    ]);
  });

  it.each(avatarColors.slice(5))('%s has at least 4.5:1 contrast with white initials', (color) => {
    expect(contrastRatio(color, avatarTextColor)).toBeGreaterThanOrEqual(4.5);
  });
});
