const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Global performance test utilities
global.performanceUtils = {
  // Measure execution time
  measureTime: async (fn, label) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;
    
    console.log(`⏱️  ${label}: ${duration.toFixed(2)}ms`);
    return { result, duration };
  },

  // Measure memory usage
  measureMemory: (label) => {
    const usage = process.memoryUsage();
    console.log(`💾 ${label} Memory:`, {
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`
    });
    return usage;
  },

  // Wait for condition with timeout
  waitFor: async (condition, timeout = 10000, interval = 100) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) return true;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Timeout waiting for condition after ${timeout}ms`);
  },

  // Generate concurrent requests
  generateConcurrentRequests: async (requestFn, count) => {
    const promises = Array(count).fill(null).map((_, index) => 
      requestFn(index).catch(error => ({ error, index }))
    );
    return Promise.all(promises);
  },

  // Save performance metrics
  saveMetrics: (testName, metrics) => {
    const metricsDir = path.join(__dirname, 'reports', 'metrics');
    if (!fs.existsSync(metricsDir)) {
      fs.mkdirSync(metricsDir, { recursive: true });
    }
    
    const filePath = path.join(metricsDir, `${testName}-${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(metrics, null, 2));
    console.log(`📊 Metrics saved to: ${filePath}`);
  },

  // CPU profiling
  startCPUProfile: () => {
    const { Session } = require('inspector');
    const session = new Session();
    session.connect();
    
    return new Promise((resolve) => {
      session.post('Profiler.enable', () => {
        session.post('Profiler.start', () => {
          resolve({
            stop: () => {
              return new Promise((stopResolve) => {
                session.post('Profiler.stop', (err, { profile }) => {
                  session.disconnect();
                  stopResolve(profile);
                });
              });
            }
          });
        });
      });
    });
  }
};

// Create reports directory
const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Set up console formatting for test output
const originalLog = console.log;
console.log = (...args) => {
  const timestamp = new Date().toISOString();
  originalLog(`[${timestamp}]`, ...args);
};

// Cleanup function for after tests
afterAll(() => {
  console.log('🧹 Performance test cleanup completed');
});