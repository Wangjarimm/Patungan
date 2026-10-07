import { avatarColors } from '@/theme/colors';

import { getInitial, pickAvatarColor } from './avatar';

describe('pickAvatarColor', () => {
  it('starts with the first color', () => {
    expect(pickAvatarColor([])).toBe(avatarColors[0]);
  });

  it('skips colors already in use', () => {
    expect(pickAvatarColor([avatarColors[0], avatarColors[2]])).toBe(avatarColors[1]);
  });

  it('cycles once all ten colors are used', () => {
    expect(pickAvatarColor([...avatarColors])).toBe(avatarColors[0]);
    expect(pickAvatarColor([...avatarColors, avatarColors[0]])).toBe(avatarColors[1]);
  });
});

describe('getInitial', () => {
  it('returns one uppercase letter', () => {
    expect(getInitial('raka')).toBe('R');
    expect(getInitial('  Sekar Ayu')).toBe('S');
    expect(getInitial('')).toBe('?');
  });
});
