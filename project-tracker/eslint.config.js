// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

// Farb- und Schriftliterale gehören nach src/theme (siehe
// .claude/.superpowers/specs/2026-08-20-design-tokens-design.md).
// Die Selektoren greifen nur auf Literale: ein Token-Zugriff ist im AST
// eine MemberExpression und läuft deshalb nicht in die Regel.
const noHardcodedDesignValues = [
  {
    selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
    message: 'Farbliteral: Rolle aus src/theme verwenden (colors.*).',
  },
  {
    selector: 'Literal[value=/^rgba?\\(/]',
    message: 'Transparente Farbe: colors.overlay aus src/theme verwenden.',
  },
  {
    selector: 'Property[key.name="fontSize"] > Literal',
    message: 'Schriftgröße: fontSize.* aus src/theme verwenden.',
  },
  {
    selector: 'Property[key.name="fontWeight"] > Literal',
    message: 'Schriftgewicht: fontWeight.* aus src/theme verwenden.',
  },
]

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: ['src/theme/**', 'src/utils/color.ts', '**/__tests__/**'],
    rules: {
      'no-restricted-syntax': ['error', ...noHardcodedDesignValues],
    },
  },
])
