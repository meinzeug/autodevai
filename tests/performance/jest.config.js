module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/**/*.perf.test.js',
    '<rootDir>/**/*.load.test.js',
    '<rootDir>/**/*.stress.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/setup.js'],
  testTimeout: 300000, // 5 minutes for performance tests
  maxWorkers: '50%', // Limit workers for accurate performance measurements
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,ts}'
  ],
  coverageDirectory: 'coverage/performance',
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './reports/performance',
      filename: 'performance-report.html',
      pageTitle: 'AutoDev-AI Performance Test Report'
    }],
    ['jest-junit', {
      outputDirectory: './reports/performance',
      outputName: 'performance-results.xml'
    }]
  ],
  globals: {
    'performance-test-config': {
      servicePortRange: {
        start: 50000,
        end: 50100
      },
      maxConcurrentRequests: 100,
      testDuration: 60000, // 1 minute
      memoryLeakThreshold: 50 * 1024 * 1024, // 50MB
      responseTimeThreshold: 2000 // 2 seconds
    }
  }
};