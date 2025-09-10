/**
 * AutoDev-AI Load Testing Implementation
 * Advanced load testing framework for distributed AI system
 */

const EventEmitter = require('events');
const axios = require('axios');
const { performance } = require('perf_hooks');
const os = require('os');
const cluster = require('cluster');
const fs = require('fs').promises;

class LoadTestingFramework extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Test configuration
      maxConcurrentUsers: config.maxConcurrentUsers || 1000,
      testDuration: config.testDuration || 300000, // 5 minutes
      rampUpTime: config.rampUpTime || 60000, // 1 minute
      rampDownTime: config.rampDownTime || 60000, // 1 minute
      
      // Request configuration
      requestTimeout: config.requestTimeout || 30000,
      requestRetries: config.requestRetries || 3,
      
      // Scenario configuration
      scenarios: config.scenarios || {},
      
      // Resource monitoring
      monitoringEnabled: config.monitoringEnabled !== false,
      resourceThresholds: {
        cpu: config.resourceThresholds?.cpu || 80,
        memory: config.resourceThresholds?.memory || 85,
        errorRate: config.resourceThresholds?.errorRate || 5
      },
      
      // Reporting
      reportDirectory: config.reportDirectory || 'tests/performance/reports/load-tests',
      realtimeReporting: config.realtimeReporting !== false,
      
      // Distributed testing
      useCluster: config.useCluster !== false,
      workerCount: config.workerCount || os.cpus().length
    };
    
    this.testResults = {
      startTime: null,
      endTime: null,
      duration: null,
      phases: {
        rampUp: [],
        steady: [],
        rampDown: []
      },
      metrics: new Map(),
      errors: [],
      resourceUsage: [],
      scenarios: new Map()
    };
    
    this.activeConnections = new Set();
    this.resourceMonitor = null;
    this.workers = new Map();
    this.isRunning = false;
  }

  /**
   * Register load test scenario
   */
  registerScenario(name, scenarioFunction, options = {}) {
    const scenario = {
      name,
      function: scenarioFunction,
      weight: options.weight || 1,
      warmupRequests: options.warmupRequests || 10,
      expectedResponseTime: options.expectedResponseTime || 2000,
      expectedSuccessRate: options.expectedSuccessRate || 99,
      tags: options.tags || [],
      description: options.description || ''
    };
    
    this.config.scenarios[name] = scenario;
    this.emit('scenarioRegistered', { name, scenario });
    
    return this;
  }

  /**
   * Start comprehensive load testing
   */
  async startLoadTest() {
    if (this.isRunning) {
      throw new Error('Load test is already running');
    }
    
    console.log('🚀 Starting AutoDev-AI Load Testing Framework');
    console.log(`📊 Configuration: ${this.config.maxConcurrentUsers} users, ${this.config.testDuration / 1000}s duration`);
    
    this.isRunning = true;
    this.testResults.startTime = Date.now();
    
    try {
      // Initialize monitoring
      if (this.config.monitoringEnabled) {
        this.startResourceMonitoring();
      }
      
      // Initialize workers if cluster mode enabled
      if (this.config.useCluster && cluster.isMaster) {
        await this.initializeClusterWorkers();
        return this.coordinateClusterLoadTest();
      }
      
      // Run single-process load test
      return await this.runSingleProcessLoadTest();
      
    } catch (error) {
      console.error('❌ Load test failed:', error.message);
      throw error;
    } finally {
      this.cleanup();
    }
  }

  /**
   * Run single-process load test
   */
  async runSingleProcessLoadTest() {
    console.log('📈 Running single-process load test...');
    
    // Warmup phase
    await this.executeWarmupPhase();
    
    // Ramp-up phase
    await this.executeRampUpPhase();
    
    // Steady state phase
    await this.executeSteadyStatePhase();
    
    // Ramp-down phase
    await this.executeRampDownPhase();
    
    // Calculate final metrics
    this.calculateFinalMetrics();
    
    // Generate reports
    await this.generateLoadTestReport();
    
    return this.testResults;
  }

  /**
   * Execute warmup phase
   */
  async executeWarmupPhase() {
    console.log('🔥 Executing warmup phase...');
    
    const scenarios = Object.values(this.config.scenarios);
    
    for (const scenario of scenarios) {
      console.log(`  Warming up scenario: ${scenario.name}`);
      
      for (let i = 0; i < scenario.warmupRequests; i++) {
        try {
          await scenario.function();
        } catch (error) {
          // Ignore warmup errors
        }
      }
    }
    
    console.log('✅ Warmup phase completed');
  }

  /**
   * Execute ramp-up phase
   */
  async executeRampUpPhase() {
    console.log('📈 Executing ramp-up phase...');
    
    const startTime = Date.now();
    const endTime = startTime + this.config.rampUpTime;
    let currentUsers = 1;
    
    while (Date.now() < endTime && this.isRunning) {
      // Calculate target user count based on ramp-up progress
      const progress = (Date.now() - startTime) / this.config.rampUpTime;
      const targetUsers = Math.floor(progress * this.config.maxConcurrentUsers);
      
      // Spawn new virtual users
      while (currentUsers < targetUsers) {
        this.spawnVirtualUser('rampUp');
        currentUsers++;
      }
      
      // Collect metrics
      this.collectPhaseMetrics('rampUp');
      
      // Brief pause
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Ramp-up phase completed (${currentUsers} users)`);
  }

  /**
   * Execute steady state phase
   */
  async executeSteadyStatePhase() {
    console.log('📊 Executing steady state phase...');
    
    const sustainDuration = this.config.testDuration - this.config.rampUpTime - this.config.rampDownTime;
    const endTime = Date.now() + sustainDuration;
    
    // Maintain steady load
    while (Date.now() < endTime && this.isRunning) {
      // Ensure we maintain target user count
      const activeCount = this.activeConnections.size;
      const targetCount = this.config.maxConcurrentUsers;
      
      if (activeCount < targetCount) {
        for (let i = activeCount; i < targetCount; i++) {
          this.spawnVirtualUser('steady');
        }
      }
      
      // Collect metrics
      this.collectPhaseMetrics('steady');
      
      // Monitor system health
      this.checkSystemHealth();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('✅ Steady state phase completed');
  }

  /**
   * Execute ramp-down phase
   */
  async executeRampDownPhase() {
    console.log('📉 Executing ramp-down phase...');
    
    const startTime = Date.now();
    const endTime = startTime + this.config.rampDownTime;
    
    while (Date.now() < endTime && this.activeConnections.size > 0) {
      // Calculate how many users to remove
      const progress = (Date.now() - startTime) / this.config.rampDownTime;
      const targetUsers = Math.floor((1 - progress) * this.config.maxConcurrentUsers);
      
      // Stop excess virtual users
      while (this.activeConnections.size > targetUsers) {
        const connection = Array.from(this.activeConnections)[0];
        this.stopVirtualUser(connection);
      }
      
      // Collect metrics
      this.collectPhaseMetrics('rampDown');
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Ramp-down phase completed');
  }

  /**
   * Spawn virtual user
   */
  spawnVirtualUser(phase) {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const virtualUser = {
      id: userId,
      phase,
      startTime: Date.now(),
      requestCount: 0,
      errorCount: 0,
      isActive: true,
      scenario: this.selectScenario()
    };
    
    this.activeConnections.add(virtualUser);
    
    // Start user simulation
    this.simulateUserBehavior(virtualUser);
    
    return virtualUser;
  }

  /**
   * Select scenario based on weights
   */
  selectScenario() {
    const scenarios = Object.values(this.config.scenarios);
    const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
    const random = Math.random() * totalWeight;
    
    let cumulativeWeight = 0;
    for (const scenario of scenarios) {
      cumulativeWeight += scenario.weight;
      if (random <= cumulativeWeight) {
        return scenario;
      }
    }
    
    return scenarios[0]; // Fallback
  }

  /**
   * Simulate user behavior
   */
  async simulateUserBehavior(virtualUser) {
    while (virtualUser.isActive && this.isRunning) {
      try {
        const startTime = performance.now();
        
        // Execute scenario function
        const result = await Promise.race([
          virtualUser.scenario.function(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), this.config.requestTimeout)
          )
        ]);
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Record successful request
        virtualUser.requestCount++;
        
        this.recordRequestMetrics({
          userId: virtualUser.id,
          scenario: virtualUser.scenario.name,
          phase: virtualUser.phase,
          duration,
          success: true,
          timestamp: Date.now(),
          result
        });
        
        // Think time (simulate user delay)
        const thinkTime = this.calculateThinkTime();
        await new Promise(resolve => setTimeout(resolve, thinkTime));
        
      } catch (error) {
        // Record failed request
        virtualUser.errorCount++;
        
        this.recordRequestMetrics({
          userId: virtualUser.id,
          scenario: virtualUser.scenario.name,
          phase: virtualUser.phase,
          duration: 0,
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
        
        // Error recovery delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Calculate think time (user delay between requests)
   */
  calculateThinkTime() {
    // Simulate realistic user think time (1-5 seconds with normal distribution)
    const min = 1000;
    const max = 5000;
    const mean = (min + max) / 2;
    const stdDev = (max - min) / 6;
    
    // Box-Muller transformation for normal distribution
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    const thinkTime = mean + z * stdDev;
    
    return Math.max(min, Math.min(max, thinkTime));
  }

  /**
   * Record request metrics
   */
  recordRequestMetrics(metrics) {
    const phaseMetrics = this.testResults.phases[metrics.phase];
    phaseMetrics.push(metrics);
    
    // Update scenario metrics
    if (!this.testResults.scenarios.has(metrics.scenario)) {
      this.testResults.scenarios.set(metrics.scenario, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errors: []
      });
    }
    
    const scenarioMetrics = this.testResults.scenarios.get(metrics.scenario);
    scenarioMetrics.totalRequests++;
    
    if (metrics.success) {
      scenarioMetrics.successfulRequests++;
      scenarioMetrics.totalDuration += metrics.duration;
      scenarioMetrics.minDuration = Math.min(scenarioMetrics.minDuration, metrics.duration);
      scenarioMetrics.maxDuration = Math.max(scenarioMetrics.maxDuration, metrics.duration);
    } else {
      scenarioMetrics.failedRequests++;
      scenarioMetrics.errors.push({
        error: metrics.error,
        timestamp: metrics.timestamp,
        userId: metrics.userId
      });
    }
  }

  /**
   * Stop virtual user
   */
  stopVirtualUser(virtualUser) {
    virtualUser.isActive = false;
    this.activeConnections.delete(virtualUser);
  }

  /**
   * Collect phase metrics
   */
  collectPhaseMetrics(phase) {
    const timestamp = Date.now();
    const activeUsers = this.activeConnections.size;
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const phaseMetric = {
      timestamp,
      phase,
      activeUsers,
      memory: memoryUsage,
      cpu: cpuUsage,
      requestsPerSecond: this.calculateCurrentRPS(),
      errorRate: this.calculateCurrentErrorRate()
    };
    
    if (!this.testResults.metrics.has(phase)) {
      this.testResults.metrics.set(phase, []);
    }
    
    this.testResults.metrics.get(phase).push(phaseMetric);
    
    // Emit real-time metrics if enabled
    if (this.config.realtimeReporting) {
      this.emit('metrics', phaseMetric);
    }
  }

  /**
   * Calculate current requests per second
   */
  calculateCurrentRPS() {
    const lastMinute = Date.now() - 60000;
    const recentRequests = Object.values(this.testResults.phases)
      .flat()
      .filter(req => req.timestamp > lastMinute);
    
    return recentRequests.length / 60; // requests per second over last minute
  }

  /**
   * Calculate current error rate
   */
  calculateCurrentErrorRate() {
    const lastMinute = Date.now() - 60000;
    const recentRequests = Object.values(this.testResults.phases)
      .flat()
      .filter(req => req.timestamp > lastMinute);
    
    if (recentRequests.length === 0) return 0;
    
    const errors = recentRequests.filter(req => !req.success).length;
    return (errors / recentRequests.length) * 100;
  }

  /**
   * Check system health and adjust load if necessary
   */
  checkSystemHealth() {
    const memoryUsage = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;
    const errorRate = this.calculateCurrentErrorRate();
    
    if (memoryUsage > this.config.resourceThresholds.memory) {
      console.warn(`⚠️ High memory usage: ${memoryUsage.toFixed(1)}%`);
      this.reduceLoad();
    }
    
    if (errorRate > this.config.resourceThresholds.errorRate) {
      console.warn(`⚠️ High error rate: ${errorRate.toFixed(1)}%`);
      this.reduceLoad();
    }
  }

  /**
   * Reduce load when system is under stress
   */
  reduceLoad() {
    const reductionCount = Math.min(10, Math.floor(this.activeConnections.size * 0.1));
    
    for (let i = 0; i < reductionCount; i++) {
      const connections = Array.from(this.activeConnections);
      if (connections.length > 0) {
        this.stopVirtualUser(connections[0]);
      }
    }
    
    console.log(`📉 Reduced load by ${reductionCount} users due to system stress`);
  }

  /**
   * Start resource monitoring
   */
  startResourceMonitoring() {
    this.resourceMonitor = setInterval(() => {
      const usage = {
        timestamp: Date.now(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        system: {
          loadAverage: os.loadavg(),
          freeMem: os.freemem(),
          totalMem: os.totalmem()
        },
        activeConnections: this.activeConnections.size
      };
      
      this.testResults.resourceUsage.push(usage);
    }, 1000);
  }

  /**
   * Calculate final metrics
   */
  calculateFinalMetrics() {
    this.testResults.endTime = Date.now();
    this.testResults.duration = this.testResults.endTime - this.testResults.startTime;
    
    // Calculate overall metrics
    const allRequests = Object.values(this.testResults.phases).flat();
    
    this.testResults.summary = {
      totalRequests: allRequests.length,
      successfulRequests: allRequests.filter(r => r.success).length,
      failedRequests: allRequests.filter(r => !r.success).length,
      averageResponseTime: this.calculateAverageResponseTime(allRequests),
      medianResponseTime: this.calculateMedianResponseTime(allRequests),
      p95ResponseTime: this.calculatePercentileResponseTime(allRequests, 95),
      p99ResponseTime: this.calculatePercentileResponseTime(allRequests, 99),
      requestsPerSecond: allRequests.length / (this.testResults.duration / 1000),
      errorRate: (allRequests.filter(r => !r.success).length / allRequests.length) * 100
    };
    
    console.log('📊 Final metrics calculated');
    console.log(`   Total requests: ${this.testResults.summary.totalRequests}`);
    console.log(`   Success rate: ${((this.testResults.summary.successfulRequests / this.testResults.summary.totalRequests) * 100).toFixed(2)}%`);
    console.log(`   Average response time: ${this.testResults.summary.averageResponseTime.toFixed(2)}ms`);
    console.log(`   Requests per second: ${this.testResults.summary.requestsPerSecond.toFixed(2)}`);
  }

  /**
   * Calculate average response time
   */
  calculateAverageResponseTime(requests) {
    const successfulRequests = requests.filter(r => r.success);
    if (successfulRequests.length === 0) return 0;
    
    const totalDuration = successfulRequests.reduce((sum, r) => sum + r.duration, 0);
    return totalDuration / successfulRequests.length;
  }

  /**
   * Calculate median response time
   */
  calculateMedianResponseTime(requests) {
    const successfulRequests = requests.filter(r => r.success);
    if (successfulRequests.length === 0) return 0;
    
    const durations = successfulRequests.map(r => r.duration).sort((a, b) => a - b);
    const mid = Math.floor(durations.length / 2);
    
    return durations.length % 2 === 0 
      ? (durations[mid - 1] + durations[mid]) / 2 
      : durations[mid];
  }

  /**
   * Calculate percentile response time
   */
  calculatePercentileResponseTime(requests, percentile) {
    const successfulRequests = requests.filter(r => r.success);
    if (successfulRequests.length === 0) return 0;
    
    const durations = successfulRequests.map(r => r.duration).sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * durations.length);
    
    return durations[Math.min(index, durations.length - 1)];
  }

  /**
   * Initialize cluster workers
   */
  async initializeClusterWorkers() {
    console.log(`🔄 Initializing ${this.config.workerCount} cluster workers...`);
    
    for (let i = 0; i < this.config.workerCount; i++) {
      const worker = cluster.fork();
      
      worker.on('message', (message) => {
        this.handleWorkerMessage(worker.id, message);
      });
      
      worker.on('exit', (code, signal) => {
        console.log(`Worker ${worker.id} exited with code ${code} and signal ${signal}`);
        this.workers.delete(worker.id);
      });
      
      this.workers.set(worker.id, worker);
    }
    
    console.log(`✅ ${this.workers.size} workers initialized`);
  }

  /**
   * Coordinate cluster load test
   */
  async coordinateClusterLoadTest() {
    console.log('🎯 Coordinating cluster load test...');
    
    const usersPerWorker = Math.floor(this.config.maxConcurrentUsers / this.workers.size);
    
    // Send configuration to all workers
    for (const [workerId, worker] of this.workers) {
      worker.send({
        type: 'START_LOAD_TEST',
        config: {
          ...this.config,
          maxConcurrentUsers: usersPerWorker,
          workerId
        }
      });
    }
    
    // Wait for all workers to complete
    return new Promise((resolve) => {
      let completedWorkers = 0;
      
      this.on('workerCompleted', () => {
        completedWorkers++;
        if (completedWorkers === this.workers.size) {
          this.aggregateWorkerResults();
          resolve(this.testResults);
        }
      });
    });
  }

  /**
   * Handle worker messages
   */
  handleWorkerMessage(workerId, message) {
    switch (message.type) {
      case 'METRICS':
        this.aggregateWorkerMetrics(workerId, message.data);
        break;
      case 'COMPLETED':
        this.aggregateWorkerResults(workerId, message.data);
        this.emit('workerCompleted', workerId);
        break;
      case 'ERROR':
        console.error(`Worker ${workerId} error:`, message.error);
        break;
    }
  }

  /**
   * Aggregate worker metrics
   */
  aggregateWorkerMetrics(workerId, metrics) {
    // Combine metrics from all workers
    // Implementation depends on specific metric aggregation strategy
  }

  /**
   * Aggregate worker results
   */
  aggregateWorkerResults(workerId, results) {
    // Combine final results from all workers
    // Implementation depends on specific result aggregation strategy
  }

  /**
   * Generate comprehensive load test report
   */
  async generateLoadTestReport() {
    console.log('📊 Generating load test report...');
    
    const reportDir = this.config.reportDirectory;
    await fs.mkdir(reportDir, { recursive: true });
    
    // Generate JSON report
    const jsonReport = {
      ...this.testResults,
      config: this.config,
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        memory: os.totalmem(),
        nodeVersion: process.version
      }
    };
    
    await fs.writeFile(
      `${reportDir}/load-test-report-${Date.now()}.json`,
      JSON.stringify(jsonReport, null, 2)
    );
    
    // Generate HTML report
    const htmlReport = this.generateHtmlReport(jsonReport);
    await fs.writeFile(
      `${reportDir}/load-test-report-${Date.now()}.html`,
      htmlReport
    );
    
    console.log(`✅ Load test reports generated in ${reportDir}`);
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport(data) {
    // Implementation of HTML report generation
    // Similar to the performance framework but focused on load testing metrics
    return `
<!DOCTYPE html>
<html>
<head>
    <title>AutoDev-AI Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
        .chart { width: 100%; height: 300px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>AutoDev-AI Load Test Report</h1>
    <div class="metric">
        <h3>Test Summary</h3>
        <p>Duration: ${(data.duration / 1000).toFixed(1)}s</p>
        <p>Total Requests: ${data.summary.totalRequests}</p>
        <p>Success Rate: ${((data.summary.successfulRequests / data.summary.totalRequests) * 100).toFixed(2)}%</p>
        <p>Average Response Time: ${data.summary.averageResponseTime.toFixed(2)}ms</p>
        <p>Requests per Second: ${data.summary.requestsPerSecond.toFixed(2)}</p>
    </div>
    <!-- Additional charts and metrics would be generated here -->
</body>
</html>`;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.isRunning = false;
    
    // Stop all virtual users
    for (const user of this.activeConnections) {
      this.stopVirtualUser(user);
    }
    
    // Stop resource monitoring
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
      this.resourceMonitor = null;
    }
    
    // Cleanup workers
    for (const [_, worker] of this.workers) {
      worker.kill();
    }
    this.workers.clear();
    
    console.log('🧹 Load testing framework cleanup completed');
  }
}

module.exports = LoadTestingFramework;