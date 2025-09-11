import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';

export default [
  // Global ignores
  {
    ignores: [
      'dist/**', 
      'node_modules/**', 
      'coverage/**', 
      '.turbo/**', 
      'src-tauri/**', 
      '.claude/**', 
      'build/**',
      'tests/reports/**',
      'tests/performance/reports/**',
      'tests/performance/baselines/**',
      '.tmp/**',
      '.cache/**',
      '.swarm/**',
      '*.heapsnapshot',
      '**/static.files/*.js',
      '**/sidebar-items.js',
      '**/search-index.js',
      '**/crates.js',
      'nohup.out'
    ]
  },
  // Node.js files (scripts, configs, etc.)
  {
    files: [
      '*.config.js',
      '*.config.ts',
      'scripts/**/*.js',
      'github-callback-server.js',
      '.claude/helpers/*.js',
      'tests/**/*.js'
    ],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        // Node.js globals
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  // TypeScript/React files
  {
    ...js.configs.recommended,
    files: ['src/**/*.{js,jsx,ts,tsx}', 'tests/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin
    },
    rules: {
      ...typescript.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true }
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'no-undef': 'off', // TypeScript handles this
      'no-unused-vars': 'off', // Using TypeScript rule instead
      'no-constant-binary-expression': 'error'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  }
];