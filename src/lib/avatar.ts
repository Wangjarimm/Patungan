import { avatarColors } from '@/theme/colors';

// First avatar color not yet used in the bill; cycles once all ten are taken.
export function pickAvatarColor(usedColors: string[]): string {
  const used = new Set(usedColors);
  const free = avatarColors.find((color) => !used.has(color));
  return free ?? avatarColors[usedColors.length % avatarColors.length] ?? avatarColors[0];
}

// Single uppercase initial, as in the design ("R" for Raka).
export function getInitial(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toLocaleUpperCase('id') : '?';
}
