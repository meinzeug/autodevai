/**
 * AutoDev-AI Performance Benchmark Framework
 * Comprehensive performance testing and monitoring system
 */

const { performance } = require('perf_hooks');
const EventEmitter = require('events');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class PerformanceBenchmarkFramework extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Benchmark configuration
      warmupIterations: config.warmupIterations || 10,
      benchmarkIterations: config.benchmarkIterations || 100,
      timeout: config.timeout || 30000,
      
      // Performance thresholds
      thresholds: {
        responseTime: config.thresholds?.responseTime || 2000, // 2 seconds
        throughput: config.thresholds?.throughput || 100, // requests/second
        errorRate: config.thresholds?.errorRate || 0.01, // 1%
        memoryUsage: config.thresholds?.memoryUsage || 500 * 1024 * 1024, // 500MB
        cpuUsage: config.thresholds?.cpuUsage || 80 // 80%
      },
      
      // Monitoring configuration
      monitoringInterval: config.monitoringInterval || 1000, // 1 second
      enableResourceMonitoring: config.enableResourceMonitoring !== false,
      enableMetricsCollection: config.enableMetricsCollection !== false,
      
      // Reporting configuration
      reportingEnabled: config.reportingEnabled !== false,
      reportDirectory: config.reportDirectory || 'tests/performance/reports',
      
      // Load testing configuration
      loadTesting: {
        maxConcurrentRequests: config.loadTesting?.maxConcurrentRequests || 100,
        rampUpDuration: config.loadTesting?.rampUpDuration || 30000, // 30 seconds
        sustainDuration: config.loadTesting?.sustainDuration || 60000, // 1 minute
        rampDownDuration: config.loadTesting?.rampDownDuration || 30000, // 30 seconds
      }
    };
    
    this.metrics = new Map();
    this.benchmarks = new Map();
    this.activeTests = new Set();
    this.resourceMonitor = null;
    this.testResults = [];
  }

  /**
   * Register a performance benchmark
   */
  registerBenchmark(name, benchmarkFunction, options = {}) {
    const benchmark = {
      name,
      function: benchmarkFunction,
      options: {
        warmupIterations: options.warmupIterations || this.config.warmupIterations,
        iterations: options.iterations || this.config.benchmarkIterations,
        timeout: options.timeout || this.config.timeout,
        expectedThreshold: options.expectedThreshold,
        category: options.category || 'general',
        description: options.description || '',
        tags: options.tags || []
      }
    };
    
    this.benchmarks.set(name, benchmark);
    this.emit('benchmarkRegistered', { name, benchmark });
    
    return this;
  }

  /**
   * Run a specific benchmark
   */
  async runBenchmark(benchmarkName) {
    const benchmark = this.benchmarks.get(benchmarkName);
    if (!benchmark) {
      throw new Error(`Benchmark '${benchmarkName}' not found`);
    }

    this.activeTests.add(benchmarkName);
    this.emit('benchmarkStarted', { name: benchmarkName });

    const result = {
      name: benchmarkName,
      category: benchmark.options.category,
      description: benchmark.options.description,
      tags: benchmark.options.tags,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      iterations: benchmark.options.iterations,
      warmupIterations: benchmark.options.warmupIterations,
      measurements: [],
      statistics: {},
      resourceUsage: [],
      passed: false,
      error: null,
      threshold: benchmark.options.expectedThreshold
    };

    try {
      // Start resource monitoring
      if (this.config.enableResourceMonitoring) {
        this.startResourceMonitoring(benchmarkName);
      }

      // Warmup phase
      console.log(`🔥 Warming up ${benchmarkName} (${benchmark.options.warmupIterations} iterations)...`);
      for (let i = 0; i < benchmark.options.warmupIterations; i++) {
        await this.executeBenchmarkIteration(benchmark.function);
      }

      // Benchmark phase
      console.log(`⚡ Running ${benchmarkName} benchmark (${benchmark.options.iterations} iterations)...`);
      
      for (let i = 0; i < benchmark.options.iterations; i++) {
        const iterationResult = await this.executeBenchmarkIteration(
          benchmark.function,
          benchmark.options.timeout
        );
        
        result.measurements.push(iterationResult);
        
        // Emit progress
        if (i % 10 === 0) {
          this.emit('benchmarkProgress', {
            name: benchmarkName,
            iteration: i,
            total: benchmark.options.iterations,
            progress: (i / benchmark.options.iterations) * 100
          });
        }
      }

      // Stop resource monitoring
      if (this.config.enableResourceMonitoring) {
        result.resourceUsage = this.stopResourceMonitoring(benchmarkName);
      }

      // Calculate statistics
      result.statistics = this.calculateStatistics(result.measurements);
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;

      // Validate against threshold
      if (result.threshold) {
        result.passed = result.statistics.mean <= result.threshold;
      } else {
        result.passed = true; // No threshold specified
      }

      this.testResults.push(result);
      this.emit('benchmarkCompleted', { name: benchmarkName, result });

      console.log(`✅ ${benchmarkName} completed: ${result.statistics.mean.toFixed(2)}ms avg, ${result.passed ? 'PASSED' : 'FAILED'}`);

      return result;

    } catch (error) {
      result.error = error.message;
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
      
      this.testResults.push(result);
      this.emit('benchmarkFailed', { name: benchmarkName, error });

      console.error(`❌ ${benchmarkName} failed: ${error.message}`);
      throw error;

    } finally {
      this.activeTests.delete(benchmarkName);
      
      if (this.config.enableResourceMonitoring) {
        this.stopResourceMonitoring(benchmarkName);
      }
    }
  }

  /**
   * Execute a single benchmark iteration
   */
  async executeBenchmarkIteration(benchmarkFunction, timeout = this.config.timeout) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    let result;
    let error = null;

    try {
      // Run with timeout
      result = await Promise.race([
        benchmarkFunction(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Benchmark iteration timeout')), timeout)
        )
      ]);
    } catch (err) {
      error = err;
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - startTime;

    return {
      duration,
      startTime,
      endTime,
      memoryDelta: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external,
        rss: endMemory.rss - startMemory.rss
      },
      result,
      error: error ? error.message : null,
      success: !error
    };
  }

  /**
   * Run all registered benchmarks
   */
  async runAllBenchmarks(categories = null) {
    console.log('🚀 Starting comprehensive performance benchmark suite...');
    
    const benchmarksToRun = Array.from(this.benchmarks.entries())
      .filter(([_, benchmark]) => !categories || categories.includes(benchmark.options.category));

    const results = {
      startTime: Date.now(),
      endTime: null,
      totalDuration: null,
      totalBenchmarks: benchmarksToRun.length,
      passedBenchmarks: 0,
      failedBenchmarks: 0,
      benchmarkResults: [],
      overallPassed: false
    };

    for (const [name, _] of benchmarksToRun) {
      try {
        const result = await this.runBenchmark(name);
        results.benchmarkResults.push(result);
        
        if (result.passed) {
          results.passedBenchmarks++;
        } else {
          results.failedBenchmarks++;
        }
      } catch (error) {
        results.failedBenchmarks++;
        console.error(`Benchmark ${name} failed: ${error.message}`);
      }
    }

    results.endTime = Date.now();
    results.totalDuration = results.endTime - results.startTime;
    results.overallPassed = results.failedBenchmarks === 0;

    console.log(`📊 Benchmark suite completed: ${results.passedBenchmarks}/${results.totalBenchmarks} passed`);

    if (this.config.reportingEnabled) {
      await this.generateReport(results);
    }

    return results;
  }

  /**
   * Load testing implementation
   */
  async runLoadTest(testFunction, options = {}) {
    const loadTestConfig = {
      ...this.config.loadTesting,
      ...options
    };

    console.log('🔥 Starting load testing...');
    console.log(`📈 Configuration: ${loadTestConfig.maxConcurrentRequests} concurrent requests`);

    const results = {
      startTime: Date.now(),
      endTime: null,
      phases: {
        rampUp: [],
        sustain: [],
        rampDown: []
      },
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        throughput: 0,
        errorRate: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity
      },
      resourceUsage: []
    };

    // Start resource monitoring
    if (this.config.enableResourceMonitoring) {
      this.startResourceMonitoring('load-test');
    }

    try {
      // Ramp-up phase
      await this.executeLoadTestPhase(
        'rampUp',
        testFunction,
        loadTestConfig,
        results
      );

      // Sustain phase
      await this.executeLoadTestPhase(
        'sustain',
        testFunction,
        loadTestConfig,
        results
      );

      // Ramp-down phase
      await this.executeLoadTestPhase(
        'rampDown',
        testFunction,
        loadTestConfig,
        results
      );

      // Calculate final metrics
      this.calculateLoadTestMetrics(results);

      results.endTime = Date.now();
      console.log('✅ Load testing completed');

      return results;

    } finally {
      if (this.config.enableResourceMonitoring) {
        results.resourceUsage = this.stopResourceMonitoring('load-test');
      }
    }
  }

  /**
   * Execute load test phase
   */
  async executeLoadTestPhase(phaseName, testFunction, config, results) {
    console.log(`📊 Executing ${phaseName} phase...`);
    
    const phaseDuration = config[`${phaseName}Duration`] || config.sustainDuration;
    const endTime = Date.now() + phaseDuration;
    
    let currentConcurrency = phaseName === 'rampUp' ? 1 : 
                             phaseName === 'sustain' ? config.maxConcurrentRequests :
                             config.maxConcurrentRequests;

    const targetConcurrency = phaseName === 'rampUp' ? config.maxConcurrentRequests :
                              phaseName === 'sustain' ? config.maxConcurrentRequests :
                              1;

    while (Date.now() < endTime) {
      // Adjust concurrency for ramp phases
      if (phaseName === 'rampUp' || phaseName === 'rampDown') {
        const progress = (Date.now() - (endTime - phaseDuration)) / phaseDuration;
        currentConcurrency = Math.round(
          phaseName === 'rampUp' 
            ? 1 + (targetConcurrency - 1) * progress
            : targetConcurrency - (targetConcurrency - 1) * progress
        );
      }

      // Execute concurrent requests
      const requestPromises = Array.from({ length: currentConcurrency }, () =>
        this.executeLoadTestRequest(testFunction)
      );

      const requestResults = await Promise.allSettled(requestPromises);
      results.phases[phaseName].push(...requestResults);

      // Short delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Execute a single load test request
   */
  async executeLoadTestRequest(testFunction) {
    const startTime = performance.now();
    
    try {
      const result = await testFunction();
      const endTime = performance.now();
      const duration = endTime - startTime;

      return {
        success: true,
        duration,
        result,
        error: null,
        timestamp: startTime
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      return {
        success: false,
        duration,
        result: null,
        error: error.message,
        timestamp: startTime
      };
    }
  }

  /**
   * Calculate load test metrics
   */
  calculateLoadTestMetrics(results) {
    const allRequests = [
      ...results.phases.rampUp,
      ...results.phases.sustain,
      ...results.phases.rampDown
    ];

    results.metrics.totalRequests = allRequests.length;
    results.metrics.successfulRequests = allRequests.filter(r => r.status === 'fulfilled' && r.value.success).length;
    results.metrics.failedRequests = results.metrics.totalRequests - results.metrics.successfulRequests;

    const successfulRequests = allRequests
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => r.value);

    if (successfulRequests.length > 0) {
      const durations = successfulRequests.map(r => r.duration);
      results.metrics.averageResponseTime = durations.reduce((a, b) => a + b, 0) / durations.length;
      results.metrics.maxResponseTime = Math.max(...durations);
      results.metrics.minResponseTime = Math.min(...durations);
      
      const totalDuration = (results.endTime || Date.now()) - results.startTime;
      results.metrics.throughput = (results.metrics.successfulRequests / totalDuration) * 1000; // requests per second
    }

    results.metrics.errorRate = results.metrics.totalRequests > 0 
      ? results.metrics.failedRequests / results.metrics.totalRequests 
      : 0;
  }

  /**
   * Start resource monitoring
   */
  startResourceMonitoring(testName) {
    const resourceData = [];
    
    const monitor = setInterval(() => {
      const cpuUsage = process.cpuUsage();
      const memoryUsage = process.memoryUsage();
      const systemMemory = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      };
      
      resourceData.push({
        timestamp: Date.now(),
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        },
        systemMemory,
        loadAverage: os.loadavg()
      });
    }, this.config.monitoringInterval);

    if (!this.resourceMonitor) {
      this.resourceMonitor = new Map();
    }
    
    this.resourceMonitor.set(testName, { monitor, data: resourceData });
    
    return resourceData;
  }

  /**
   * Stop resource monitoring
   */
  stopResourceMonitoring(testName) {
    if (!this.resourceMonitor || !this.resourceMonitor.has(testName)) {
      return [];
    }

    const { monitor, data } = this.resourceMonitor.get(testName);
    clearInterval(monitor);
    this.resourceMonitor.delete(testName);

    return data;
  }

  /**
   * Calculate statistics from measurements
   */
  calculateStatistics(measurements) {
    const durations = measurements.map(m => m.duration);
    const successful = measurements.filter(m => m.success);
    
    if (durations.length === 0) {
      return {
        count: 0,
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
        standardDeviation: 0,
        percentiles: {},
        successRate: 0
      };
    }

    durations.sort((a, b) => a - b);
    
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const median = durations[Math.floor(durations.length / 2)];
    const min = durations[0];
    const max = durations[durations.length - 1];
    
    const variance = durations.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / durations.length;
    const standardDeviation = Math.sqrt(variance);
    
    const percentiles = {
      p50: this.calculatePercentile(durations, 50),
      p75: this.calculatePercentile(durations, 75),
      p90: this.calculatePercentile(durations, 90),
      p95: this.calculatePercentile(durations, 95),
      p99: this.calculatePercentile(durations, 99)
    };

    const successRate = successful.length / measurements.length;

    return {
      count: durations.length,
      mean,
      median,
      min,
      max,
      standardDeviation,
      percentiles,
      successRate
    };
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(sortedArray, percentile) {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (lower === upper) {
      return sortedArray[lower];
    }

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport(results) {
    const reportDir = this.config.reportDirectory;
    await fs.mkdir(reportDir, { recursive: true });

    // Generate JSON report
    const jsonReport = {
      ...results,
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        memory: os.totalmem(),
        nodeVersion: process.version
      },
      config: this.config
    };

    await fs.writeFile(
      path.join(reportDir, 'performance-benchmark-report.json'),
      JSON.stringify(jsonReport, null, 2)
    );

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(jsonReport);
    await fs.writeFile(
      path.join(reportDir, 'performance-benchmark-report.html'),
      htmlReport
    );

    console.log(`📊 Performance reports generated in ${reportDir}`);
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport(data) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AutoDev-AI Performance Benchmark Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; margin-top: 5px; }
        .benchmark-result { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 6px; }
        .benchmark-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .status-badge { padding: 4px 12px; border-radius: 20px; color: white; font-weight: bold; }
        .passed { background: #28a745; }
        .failed { background: #dc3545; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
        .stat-item { background: #f8f9fa; padding: 10px; border-radius: 4px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AutoDev-AI Performance Benchmark Report</h1>
            <p>Generated on ${new Date(data.startTime).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="metric-card">
                <div class="metric-value">${data.totalBenchmarks}</div>
                <div class="metric-label">Total Benchmarks</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.passedBenchmarks}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.failedBenchmarks}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${((data.totalDuration || 0) / 1000).toFixed(1)}s</div>
                <div class="metric-label">Total Duration</div>
            </div>
        </div>
        
        <h2>Benchmark Results</h2>
        ${data.benchmarkResults.map(result => `
            <div class="benchmark-result">
                <div class="benchmark-header">
                    <h3>${result.name}</h3>
                    <span class="status-badge ${result.passed ? 'passed' : 'failed'}">
                        ${result.passed ? 'PASSED' : 'FAILED'}
                    </span>
                </div>
                <p>${result.description}</p>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div><strong>${result.statistics.mean.toFixed(2)}ms</strong></div>
                        <div>Average</div>
                    </div>
                    <div class="stat-item">
                        <div><strong>${result.statistics.median.toFixed(2)}ms</strong></div>
                        <div>Median</div>
                    </div>
                    <div class="stat-item">
                        <div><strong>${result.statistics.min.toFixed(2)}ms</strong></div>
                        <div>Min</div>
                    </div>
                    <div class="stat-item">
                        <div><strong>${result.statistics.max.toFixed(2)}ms</strong></div>
                        <div>Max</div>
                    </div>
                    <div class="stat-item">
                        <div><strong>${result.statistics.percentiles.p95.toFixed(2)}ms</strong></div>
                        <div>95th Percentile</div>
                    </div>
                    <div class="stat-item">
                        <div><strong>${(result.statistics.successRate * 100).toFixed(1)}%</strong></div>
                        <div>Success Rate</div>
                    </div>
                </div>
            </div>
        `).join('')}
        
        <h2>System Information</h2>
        <div class="stats-grid">
            <div class="stat-item">
                <div><strong>${data.systemInfo.platform}</strong></div>
                <div>Platform</div>
            </div>
            <div class="stat-item">
                <div><strong>${data.systemInfo.arch}</strong></div>
                <div>Architecture</div>
            </div>
            <div class="stat-item">
                <div><strong>${data.systemInfo.cpus}</strong></div>
                <div>CPU Cores</div>
            </div>
            <div class="stat-item">
                <div><strong>${(data.systemInfo.memory / 1024 / 1024 / 1024).toFixed(1)}GB</strong></div>
                <div>Total Memory</div>
            </div>
            <div class="stat-item">
                <div><strong>${data.systemInfo.nodeVersion}</strong></div>
                <div>Node.js</div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Memory leak detection
   */
  async detectMemoryLeaks(testFunction, options = {}) {
    const iterations = options.iterations || 100;
    const memoryThreshold = options.threshold || this.config.thresholds.memoryUsage;
    
    console.log('🔍 Starting memory leak detection...');
    
    const memorySnapshots = [];
    
    for (let i = 0; i < iterations; i++) {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const memoryBefore = process.memoryUsage();
      
      await testFunction();
      
      // Force garbage collection again
      if (global.gc) {
        global.gc();
      }
      
      const memoryAfter = process.memoryUsage();
      
      memorySnapshots.push({
        iteration: i,
        before: memoryBefore,
        after: memoryAfter,
        delta: {
          heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
          heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
          external: memoryAfter.external - memoryBefore.external,
          rss: memoryAfter.rss - memoryBefore.rss
        }
      });
      
      // Check for immediate memory threshold breach
      if (memoryAfter.heapUsed > memoryThreshold) {
        console.warn(`⚠️ Memory threshold breached at iteration ${i}: ${memoryAfter.heapUsed} bytes`);
      }
    }
    
    // Analyze memory growth trend
    const heapGrowth = this.analyzeMemoryGrowth(memorySnapshots);
    
    const result = {
      iterations,
      memorySnapshots,
      analysis: heapGrowth,
      leakDetected: heapGrowth.trend === 'increasing' && heapGrowth.slope > 1000, // 1KB per iteration
      recommendation: heapGrowth.trend === 'increasing' 
        ? 'Potential memory leak detected. Review object lifecycle and cleanup.'
        : 'No significant memory growth detected.'
    };
    
    console.log(`${result.leakDetected ? '⚠️' : '✅'} Memory leak detection: ${result.leakDetected ? 'LEAK DETECTED' : 'NO LEAKS'}`);
    
    return result;
  }

  /**
   * Analyze memory growth trend
   */
  analyzeMemoryGrowth(snapshots) {
    const heapValues = snapshots.map(s => s.after.heapUsed);
    const n = heapValues.length;
    
    // Calculate linear regression
    const sumX = (n * (n - 1)) / 2;
    const sumY = heapValues.reduce((a, b) => a + b, 0);
    const sumXY = heapValues.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = snapshots.reduce((sum, _, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return {
      slope,
      intercept,
      trend: slope > 100 ? 'increasing' : slope < -100 ? 'decreasing' : 'stable',
      initialMemory: heapValues[0],
      finalMemory: heapValues[heapValues.length - 1],
      totalGrowth: heapValues[heapValues.length - 1] - heapValues[0],
      averageGrowthPerIteration: slope
    };
  }

  /**
   * Stress testing implementation
   */
  async runStressTest(testFunction, options = {}) {
    const duration = options.duration || 300000; // 5 minutes
    const maxConcurrency = options.maxConcurrency || 200;
    const resourceLimit = options.resourceLimit || this.config.thresholds.memoryUsage;
    
    console.log('💥 Starting stress testing...');
    
    const results = {
      startTime: Date.now(),
      endTime: null,
      duration: null,
      maxConcurrency,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      systemBreakPoint: null,
      resourcePeakUsage: {},
      timeToBreakPoint: null
    };
    
    this.startResourceMonitoring('stress-test');
    
    try {
      const endTime = Date.now() + duration;
      let currentConcurrency = 1;
      let consecutiveFailures = 0;
      
      while (Date.now() < endTime && consecutiveFailures < 10) {
        // Gradually increase concurrency
        if (results.successfulRequests > currentConcurrency * 10) {
          currentConcurrency = Math.min(currentConcurrency + 1, maxConcurrency);
        }
        
        // Execute concurrent requests
        const requestPromises = Array.from({ length: currentConcurrency }, () =>
          this.executeStressTestRequest(testFunction)
        );
        
        const requestResults = await Promise.allSettled(requestPromises);
        
        // Analyze results
        const successful = requestResults.filter(r => 
          r.status === 'fulfilled' && r.value.success
        ).length;
        const failed = requestResults.length - successful;
        
        results.totalRequests += requestResults.length;
        results.successfulRequests += successful;
        results.failedRequests += failed;
        
        // Check for system breaking point
        const failureRate = failed / requestResults.length;
        if (failureRate > 0.5) {
          consecutiveFailures++;
          if (!results.systemBreakPoint) {
            results.systemBreakPoint = currentConcurrency;
            results.timeToBreakPoint = Date.now() - results.startTime;
            console.log(`💥 System breaking point detected at ${currentConcurrency} concurrent requests`);
          }
        } else {
          consecutiveFailures = 0;
        }
        
        // Check resource limits
        const memoryUsage = process.memoryUsage();
        if (memoryUsage.heapUsed > resourceLimit) {
          console.warn('⚠️ Resource limit exceeded, backing off...');
          currentConcurrency = Math.max(1, currentConcurrency - 5);
        }
        
        // Brief pause to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      results.endTime = Date.now();
      results.duration = results.endTime - results.startTime;
      
      console.log(`💥 Stress testing completed. Peak concurrency: ${currentConcurrency}`);
      
      return results;
      
    } finally {
      results.resourceUsage = this.stopResourceMonitoring('stress-test');
    }
  }

  /**
   * Execute stress test request
   */
  async executeStressTestRequest(testFunction) {
    const startTime = performance.now();
    
    try {
      const result = await Promise.race([
        testFunction(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        )
      ]);
      
      return {
        success: true,
        duration: performance.now() - startTime,
        result
      };
    } catch (error) {
      return {
        success: false,
        duration: performance.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Stop all active monitoring
    if (this.resourceMonitor) {
      for (const [_, { monitor }] of this.resourceMonitor) {
        clearInterval(monitor);
      }
      this.resourceMonitor.clear();
    }
    
    // Clear active tests
    this.activeTests.clear();
    
    console.log('🧹 Performance framework cleanup completed');
  }
}

module.exports = PerformanceBenchmarkFramework;