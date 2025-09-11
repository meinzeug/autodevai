# AutoDev-AI Performance Testing Suite

Comprehensive performance and load testing framework for the AutoDev-AI Neural Bridge Platform, designed to ensure optimal performance, reliability, and scalability across all system components.

## 🚀 Overview

This performance testing suite provides comprehensive coverage for:

- **AI Model Performance**: Load testing for text generation, code analysis, and other AI endpoints
- **Docker Container Management**: Stress testing for container lifecycle operations
- **Memory Leak Detection**: Advanced profiling and leak detection tools
- **Response Time Monitoring**: Real-time performance monitoring and alerting
- **Automated Benchmarking**: Regression detection and performance baselines
- **Metrics Dashboard**: Real-time performance visualization and reporting

## 📁 Test Structure

```
tests/performance/
├── jest.config.js              # Jest configuration for performance tests
├── setup.js                    # Global test utilities and setup
├── load/                       # Load testing suites
│   ├── ai-model-load.test.js   # AI model endpoint load testing
│   └── service-port-load.test.js # Service port range testing (50000-50100)
├── stress/                     # Stress testing suites
│   └── docker-sandbox-stress.test.js # Docker container stress testing
├── memory/                     # Memory profiling and leak detection
│   └── memory-leak-detection.test.js # Memory leak detection and profiling
├── monitoring/                 # Response time and resource monitoring
│   └── response-time-monitor.test.js # Real-time monitoring and alerting
├── benchmarks/                 # Performance benchmarking
│   └── performance-benchmarks.test.js # Comprehensive benchmark suite
├── regression/                 # Performance regression testing
│   └── regression-testing.test.js # Automated regression detection
├── dashboard/                  # Metrics dashboard and visualization
│   └── metrics-dashboard.test.js # Dashboard components and data collection
└── reports/                    # Generated reports and dashboards
    ├── performance-dashboard.html # Live performance dashboard
    ├── benchmark-report.html      # Detailed benchmark reports
    └── metrics/                   # JSON metrics data
```

## 🧪 Test Categories

### 1. Load Testing (`load/`)

**AI Model Load Testing**
- Concurrent requests to AI model endpoints
- Text generation, code analysis, and documentation APIs
- Mixed model type load testing
- Sustained load testing (5-minute duration)
- Throughput and response time validation

**Service Port Load Testing**
- Port scanning and availability monitoring (50000-50100)
- Concurrent connection testing
- HTTP service throughput testing
- Service type identification and classification

### 2. Stress Testing (`stress/`)

**Docker Container Stress Testing**
- Concurrent container creation and startup
- Container lifecycle stress testing
- Resource exhaustion simulation
- Docker daemon performance under load
- Container cleanup and resource recovery

### 3. Memory Testing (`memory/`)

**Memory Leak Detection**
- AI model request memory profiling
- Container operation memory tracking
- Intentional leak simulation for validation
- Heap snapshot generation and analysis
- Long-term memory stability testing

### 4. Monitoring (`monitoring/`)

**Real-time Performance Monitoring**
- Response time tracking and analysis
- Resource utilization monitoring
- Performance alerting system
- Regression detection and comparison
- Dashboard data collection and aggregation

### 5. Benchmarking (`benchmarks/`)

**Comprehensive Performance Benchmarks**
- AI model inference benchmarks
- System resource benchmarks (CPU, Memory, I/O)
- Network performance benchmarks
- Docker container performance benchmarks
- Resource utilization efficiency testing
- Performance regression detection

### 6. Regression Testing (`regression/`)

**Automated Performance Regression Detection**
- Baseline performance establishment
- Continuous performance monitoring
- Automated regression alerts
- Performance trend analysis
- CI/CD integration support

### 7. Dashboard (`dashboard/`)

**Performance Metrics Dashboard**
- Real-time metrics collection
- Interactive visualization components
- Performance alerting system
- Load testing under high-frequency updates
- Production-ready dashboard generation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker (for container testing)
- AutoDev-AI services running (for integration tests)

### Installation

```bash
# Install dependencies
npm install

# Install additional dependencies for performance testing
npm install axios dockerode
npm install --save-dev jest jest-html-reporters jest-junit
```

### Running Tests

```bash
# Run all performance tests
npm run test:performance

# Run specific test categories
npm run test:load          # Load testing only
npm run test:stress        # Stress testing only
npm run test:memory        # Memory testing only
npm run test:monitoring    # Monitoring tests only
npm run test:benchmarks    # Benchmark tests only
npm run test:regression    # Regression tests only
npm run test:dashboard     # Dashboard tests only

# Run with coverage
npm run test:ci

# Watch mode for development
npm run test:watch

# Generate comprehensive reports
npm run generate:reports
```

### Special Test Commands

```bash
# Memory testing with garbage collection
npm run memory-test

# Load and stress testing combined
npm run load-test

# Benchmark testing only
npm run benchmark

# Monitoring and alerting
npm run monitor

# Regression testing
npm run regression-test
```

## 📊 Performance Thresholds

### Default Thresholds

- **Response Time**: < 2000ms (configurable per endpoint)
- **Memory Growth**: < 50MB during test execution
- **Error Rate**: < 10% for load testing
- **Success Rate**: > 80% for concurrent operations
- **Container Creation**: < 2000ms average
- **Memory Leak Threshold**: < 50MB unreclaimed memory

### Configurable Thresholds

Edit `jest.config.js` to modify thresholds:

```javascript
globals: {
  'performance-test-config': {
    servicePortRange: { start: 50000, end: 50100 },
    maxConcurrentRequests: 100,
    testDuration: 60000,
    memoryLeakThreshold: 50 * 1024 * 1024,
    responseTimeThreshold: 2000
  }
}
```

## 📈 Reports and Dashboards

### Generated Reports

1. **Performance Dashboard** (`reports/performance-dashboard.html`)
   - Real-time metrics visualization
   - System resource monitoring
   - Performance alerts and status
   - Interactive charts and widgets

2. **Benchmark Report** (`reports/benchmark-report.html`)
   - Detailed benchmark results
   - Performance comparisons
   - Regression analysis
   - Recommendations

3. **Regression Analysis** (`reports/regression-analysis.html`)
   - Performance trend analysis
   - Regression detection results
   - Historical comparisons

4. **JSON Metrics** (`reports/metrics/`)
   - Machine-readable performance data
   - API integration support
   - Custom analysis and reporting

### Dashboard Features

- **Real-time Metrics**: CPU, Memory, Response Time, Throughput
- **Interactive Charts**: Time series, gauges, bar charts, heatmaps
- **Performance Alerts**: Configurable thresholds and notifications
- **Historical Trends**: Performance tracking over time
- **Custom Metrics**: AI model requests, container operations
- **Mobile Responsive**: Optimized for all device sizes

## 🔧 Configuration

### Environment Variables

```bash
# API endpoints for testing
API_BASE_URL=http://localhost:3000

# Docker configuration
DOCKER_HOST=unix:///var/run/docker.sock

# Test configuration
PERFORMANCE_TEST_DURATION=60000
MAX_CONCURRENT_REQUESTS=100
MEMORY_LEAK_THRESHOLD=52428800
```

### Jest Configuration

Key configuration options in `jest.config.js`:

```javascript
{
  testTimeout: 300000,        // 5 minutes for performance tests
  maxWorkers: '50%',          // Limit workers for accurate measurements
  setupFilesAfterEnv: ['<rootDir>/setup.js'],
  reporters: [
    'default',
    'jest-html-reporters',
    'jest-junit'
  ]
}
```

## 🚨 Alerting and Monitoring

### Alert Rules

The monitoring system includes configurable alert rules:

- **High CPU Usage**: > 80% for 30 seconds
- **Critical Memory Usage**: > 90% for 10 seconds
- **High Response Time**: > 2000ms for 1 minute
- **High Error Rate**: > 10% for 30 seconds

### Integration

- **CI/CD Integration**: Fail builds on critical regressions
- **Real-time Alerts**: Console and dashboard notifications
- **Historical Tracking**: Performance baseline management
- **Automated Reporting**: Scheduled report generation

## 🔍 Advanced Features

### Memory Profiling

- **Heap Snapshots**: Automatic V8 heap dump generation
- **Memory Leak Detection**: Pattern recognition and alerting
- **Garbage Collection Analysis**: GC effectiveness monitoring
- **Memory Usage Trends**: Long-term memory stability tracking

### Performance Baselines

- **Automatic Baseline Creation**: First-run baseline establishment
- **Regression Detection**: Automated comparison with baselines
- **Baseline Management**: Update and versioning support
- **Performance Budgets**: Configurable performance limits

### Custom Metrics

Add custom performance metrics:

```javascript
// In your test
global.performanceUtils.saveMetrics('custom-metric', {
  customValue: measureCustomPerformance(),
  timestamp: Date.now()
});
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests
on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: tests/performance/reports/
```

### Performance Gates

Configure performance gates to fail CI on regressions:

- **Critical Regressions**: > 30% performance degradation
- **Memory Leaks**: > 50MB unreclaimed memory
- **Error Rate**: > 10% failure rate
- **Availability**: < 95% success rate

## 📚 Best Practices

### Test Design

1. **Isolate Tests**: Each test should be independent
2. **Realistic Loads**: Use production-like test scenarios
3. **Baseline Management**: Maintain performance baselines
4. **Resource Cleanup**: Always clean up test resources
5. **Monitoring**: Continuously monitor system resources

### Performance Testing

1. **Warm-up Periods**: Allow services to warm up before testing
2. **Multiple Iterations**: Run tests multiple times for accuracy
3. **Resource Constraints**: Test under various resource conditions
4. **Concurrent Users**: Simulate realistic user loads
5. **Edge Cases**: Test boundary conditions and edge cases

### Maintenance

1. **Regular Updates**: Keep baselines current
2. **Threshold Tuning**: Adjust thresholds based on requirements
3. **Test Review**: Regularly review and update tests
4. **Report Analysis**: Analyze trends and patterns
5. **Documentation**: Keep documentation up to date

## 🆘 Troubleshooting

### Common Issues

1. **Docker Permission Denied**
   ```bash
   sudo usermod -aG docker $USER
   newgrp docker
   ```

2. **Memory Issues**
   ```bash
   node --max-old-space-size=4096 your-test-script.js
   ```

3. **Port Conflicts**
   - Ensure ports 50000-50100 are available
   - Check for other services using these ports

4. **Test Timeouts**
   - Increase timeout values in jest.config.js
   - Check system resources during test execution

### Performance Issues

1. **High Memory Usage**: Enable garbage collection with `--expose-gc`
2. **Slow Tests**: Reduce concurrent operations or test duration
3. **Flaky Tests**: Add retry logic and error handling
4. **Resource Exhaustion**: Implement proper cleanup and resource management

## 📞 Support

For issues, questions, or contributions:

1. Check existing issues in the repository
2. Create detailed bug reports with performance metrics
3. Include system information and test configurations
4. Provide reproducible test cases

## 📄 License

This performance testing suite is part of the AutoDev-AI Neural Bridge Platform and follows the same licensing terms as the main project.