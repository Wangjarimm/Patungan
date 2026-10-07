// Color tokens from the "Token warna" table in docs/PRD.md. Keep in sync with the PRD.

export type ColorTokens = {
  background: string;
  paper: string;
  surface: string;
  text: string;
  textMuted: string;
  textMutedPaper: string;
  line: string;
  outline: string;
  accent: string;
  onAccent: string;
  pendingBg: string;
  pendingText: string;
  success: string;
  warning: string;
};

export const lightColors: ColorTokens = {
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
};

export const darkColors: ColorTokens = {
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
};

// Participant avatar colors, identical in both themes, always with white initials.
// The first five come from the PRD; the rest are chosen for >= 4.5:1 contrast with white.
export const avatarColors = [
  '#B4471B',
  '#2367A0',
  '#6A4AB8',
  '#237A4F',
  '#A93A6B',
  '#00727A',
  '#8A5A00',
  '#3F51B5',
  '#B03030',
  '#5E6B1F',
] as const;

export const avatarTextColor = '#FFFFFF';
