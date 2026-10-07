import { createId } from './id';

jest.mock('expo-crypto', () => ({ randomUUID: () => '7d444840-9dc0-11d1-b245-5ffdce74fad2' }));

describe('createId', () => {
  it('returns a UUID from expo-crypto', () => {
    expect(createId()).toBe('7d444840-9dc0-11d1-b245-5ffdce74fad2');
  });
});
