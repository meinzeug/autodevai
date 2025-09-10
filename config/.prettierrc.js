module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  quoteProps: 'as-needed',
  jsxSingleQuote: true,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  embeddedLanguageFormatting: 'auto',
  proseWrap: 'preserve',
  htmlWhitespaceSensitivity: 'css',
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
      },
    },
    {
      files: '*.md',
      options: {
        proseWrap: 'always',
      },
    },
  ],
};