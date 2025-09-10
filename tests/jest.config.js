/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'Frontend Tests',
      testMatch: ['<rootDir>/tests/frontend/**/*.test.{ts,tsx,js,jsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/frontend/setup.ts'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@components/(.*)$': '<rootDir>/src/components/$1',
        '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.json'
        }]
      },
      collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/vite-env.d.ts',
        '!src/main.tsx',
      ],
      coverageThreshold: {
        global: {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      },
      coverageReporters: ['text', 'html', 'lcov', 'json-summary'],
      coverageDirectory: '<rootDir>/tests/coverage/frontend'
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/tests/integration/**/*.test.{ts,js}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
      globalSetup: '<rootDir>/tests/integration/globalSetup.ts',
      globalTeardown: '<rootDir>/tests/integration/globalTeardown.ts',
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: 'tsconfig.json'
        }]
      },
      testTimeout: 30000,
      coverageDirectory: '<rootDir>/tests/coverage/integration'
    },
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/tests/unit/**/*.test.{ts,js}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/unit/setup.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: 'tsconfig.json'
        }]
      },
      coverageDirectory: '<rootDir>/tests/coverage/unit'
    }
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/vite-env.d.ts',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  coverageReporters: ['text', 'html', 'lcov', 'json-summary'],
  coverageDirectory: '<rootDir>/tests/coverage',
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './tests/coverage',
      filename: 'test-report.html',
      expand: true
    }],
    ['jest-junit', {
      outputDirectory: './tests/coverage',
      outputName: 'junit.xml'
    }]
  ],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true
};