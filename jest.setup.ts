jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The native expo-crypto mock returns undefined; real ids keep store tests realistic.
jest.mock('expo-crypto', () => ({
  randomUUID: () => globalThis.crypto.randomUUID(),
}));

// Reanimated 4 runs on react-native-worklets, which needs native code; use its Jest mock.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));

jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

// Tests never talk to the real Supabase project; individual tests inject a fake client.
jest.mock('@/services/supabase/client', () => ({ supabase: null }));
