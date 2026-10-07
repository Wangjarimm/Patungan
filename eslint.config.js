// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*', 'coverage/*', 'docs/*'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Colors live only in src/theme; components must use theme tokens.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/theme/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
          message: 'Gunakan token warna dari src/theme, bukan kode hex langsung.',
        },
      ],
    },
  },
]);
