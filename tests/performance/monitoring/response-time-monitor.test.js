const axios = require('axios');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

describe('Response Time and Resource Monitoring', () => {
  let testMetrics;
  let monitoringEvents;
  let resourceMonitor;

  beforeAll(() => {
    testMetrics = {
      startTime: Date.now(),
      responseTimeTests: [],
      resourceSnapshots: [],
      alertsTriggered: [],
      performanceBaselines: {}
    };
    
    monitoringEvents = new EventEmitter();
    resourceMonitor = new ResourceMonitor();
    
    // Set up event listeners for performance alerts
    monitoringEvents.on('slow_response', (data) => {
      testMetrics.alertsTriggered.push({
        type: 'slow_response',
        timestamp: Date.now(),
        data
      });
      console.log(`⚠️  Slow response alert: ${data.endpoint} took ${data.responseTime}ms`);
    });
    
    monitoringEvents.on('resource_alert', (data) => {
      testMetrics.alertsTriggered.push({
        type: 'resource_alert',
        timestamp: Date.now(),
        data
      });
      console.log(`⚠️  Resource alert: ${data.metric} at ${data.value}${data.unit}`);
    });
  });

  afterAll(() => {
    const summary = {
      testDuration: Date.now() - testMetrics.startTime,
      responseTimeTests: testMetrics.responseTimeTests.length,
      resourceSnapshots: testMetrics.resourceSnapshots.length,
      alertsTriggered: testMetrics.alertsTriggered.length,
      averageResponseTime: calculateAverageResponseTime(),
      resourceUtilization: calculateAverageResourceUtilization()
    };
    
    console.log('🚀 Response Time Monitoring Summary:', summary);
    global.performanceUtils.saveMetrics('response-time-monitoring', summary);
    
    // Stop resource monitor
    resourceMonitor.stop();
  });

  class ResourceMonitor {
    constructor() {
      this.isMonitoring = false;
      this.interval = null;
      this.thresholds = {
        cpu: 80, // 80%
        memory: 85, // 85%
        responseTime: 2000 // 2 seconds
      };
    }

    start(intervalMs = 1000) {
      if (this.isMonitoring) return;
      
      this.isMonitoring = true;
      this.interval = setInterval(async () => {
        const resources = await this.collectResourceData();
        testMetrics.resourceSnapshots.push(resources);
        
        // Check for alerts
        this.checkResourceAlerts(resources);
      }, intervalMs);
      
      console.log('📊 Resource monitoring started');
    }

    stop() {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
        this.isMonitoring = false;
        console.log('📊 Resource monitoring stopped');
      }
    }

    async collectResourceData() {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Get system-level metrics
      const systemMetrics = await this.getSystemMetrics();
      
      return {
        timestamp: Date.now(),
        process: {
          memory: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          }
        },
        system: systemMetrics
      };
    }

    async getSystemMetrics() {
      try {
        const os = require('os');
        const cpuLoad = os.loadavg()[0]; // 1-minute load average
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        
        return {
          cpuLoad: (cpuLoad / os.cpus().length) * 100, // Convert to percentage
          memoryUsed: usedMemory,
          memoryTotal: totalMemory,
          memoryUtilization: (usedMemory / totalMemory) * 100,
          uptime: os.uptime()
        };
      } catch (error) {
        console.log(`⚠️  Failed to collect system metrics: ${error.message}`);
        return null;
      }
    }

    checkResourceAlerts(resources) {
      if (!resources.system) return;
      
      // CPU alert
      if (resources.system.cpuLoad > this.thresholds.cpu) {
        monitoringEvents.emit('resource_alert', {
          metric: 'CPU',
          value: resources.system.cpuLoad.toFixed(2),
          unit: '%',
          threshold: this.thresholds.cpu
        });
      }
      
      // Memory alert
      if (resources.system.memoryUtilization > this.thresholds.memory) {
        monitoringEvents.emit('resource_alert', {
          metric: 'Memory',
          value: resources.system.memoryUtilization.toFixed(2),
          unit: '%',
          threshold: this.thresholds.memory
        });
      }
    }
  }

  class ResponseTimeTracker {
    constructor() {
      this.measurements = [];
      this.baselines = {};
    }

    async measureEndpoint(endpoint, requestConfig = {}) {
      const startTime = performance.now();
      const memoryBefore = process.memoryUsage();
      
      try {
        const response = await axios({
          method: 'GET',
          timeout: 30000,
          ...requestConfig,
          url: endpoint
        });
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        const memoryAfter = process.memoryUsage();
        
        const measurement = {
          endpoint,
          responseTime,
          statusCode: response.status,
          contentLength: response.headers['content-length'] || 0,
          timestamp: Date.now(),
          memoryDelta: {
            rss: memoryAfter.rss - memoryBefore.rss,
            heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed
          },
          success: response.status >= 200 && response.status < 400
        };
        
        this.measurements.push(measurement);
        
        // Check for slow response alert
        if (responseTime > resourceMonitor.thresholds.responseTime) {
          monitoringEvents.emit('slow_response', {
            endpoint,
            responseTime: responseTime.toFixed(2),
            threshold: resourceMonitor.thresholds.responseTime
          });
        }
        
        return measurement;
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        const measurement = {
          endpoint,
          responseTime,
          error: error.message,
          statusCode: error.response?.status || 0,
          timestamp: Date.now(),
          success: false
        };
        
        this.measurements.push(measurement);
        return measurement;
      }
    }

    getStatistics(endpoint = null) {
      const filtered = endpoint 
        ? this.measurements.filter(m => m.endpoint === endpoint)
        : this.measurements;
      
      if (filtered.length === 0) return null;
      
      const responseTimes = filtered.map(m => m.responseTime);
      const successfulRequests = filtered.filter(m => m.success);
      
      return {
        count: filtered.length,
        successCount: successfulRequests.length,
        successRate: (successfulRequests.length / filtered.length) * 100,
        responseTime: {
          min: Math.min(...responseTimes),
          max: Math.max(...responseTimes),
          average: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
          median: this.calculateMedian(responseTimes),
          p95: this.calculatePercentile(responseTimes, 95),
          p99: this.calculatePercentile(responseTimes, 99)
        }
      };
    }

    calculateMedian(values) {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    }

    calculatePercentile(values, percentile) {
      const sorted = [...values].sort((a, b) => a - b);
      const index = Math.ceil((percentile / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    }
  }

  const calculateAverageResponseTime = () => {
    const allResponseTimes = testMetrics.responseTimeTests.flatMap(test => 
      test.measurements?.map(m => m.responseTime) || []
    );
    
    return allResponseTimes.length > 0 
      ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length
      : 0;
  };

  const calculateAverageResourceUtilization = () => {
    if (testMetrics.resourceSnapshots.length === 0) return null;
    
    const totals = testMetrics.resourceSnapshots.reduce((acc, snapshot) => {
      if (snapshot.system) {
        acc.cpu += snapshot.system.cpuLoad || 0;
        acc.memory += snapshot.system.memoryUtilization || 0;
        acc.count++;
      }
      return acc;
    }, { cpu: 0, memory: 0, count: 0 });
    
    return totals.count > 0 ? {
      cpu: (totals.cpu / totals.count).toFixed(2),
      memory: (totals.memory / totals.count).toFixed(2)
    } : null;
  };

  test('Monitor response times for AI model endpoints', async () => {
    console.log('⏱️  Starting response time monitoring for AI endpoints...');
    
    const tracker = new ResponseTimeTracker();
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
    
    resourceMonitor.start(2000); // Monitor every 2 seconds
    
    const endpoints = [
      { path: '/api/ai/models/text-generation/predict', method: 'POST', data: { prompt: 'Test prompt', maxTokens: 50 } },
      { path: '/api/ai/models/code-analysis/analyze', method: 'POST', data: { code: 'const x = 1;', language: 'javascript' } },
      { path: '/api/health', method: 'GET' },
      { path: '/api/status', method: 'GET' }
    ];
    
    const measurements = [];
    
    // Measure baseline performance
    console.log('📊 Establishing baseline measurements...');
    for (const endpoint of endpoints) {
      for (let i = 0; i < 5; i++) {
        const measurement = await tracker.measureEndpoint(`${baseURL}${endpoint.path}`, {
          method: endpoint.method,
          data: endpoint.data,
          validateStatus: () => true
        });
        measurements.push(measurement);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Continuous monitoring under load
    console.log('🚀 Starting continuous monitoring under load...');
    const monitoringDuration = 20000; // 20 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < monitoringDuration) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const measurement = await tracker.measureEndpoint(`${baseURL}${endpoint.path}`, {
        method: endpoint.method,
        data: endpoint.data,
        validateStatus: () => true
      });
      measurements.push(measurement);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    resourceMonitor.stop();
    
    // Analyze results
    const statistics = tracker.getStatistics();
    console.log('📊 Response Time Statistics:', {
      totalRequests: statistics.count,
      successRate: `${statistics.successRate.toFixed(2)}%`,
      responseTime: {
        average: `${statistics.responseTime.average.toFixed(2)}ms`,
        median: `${statistics.responseTime.median.toFixed(2)}ms`,
        p95: `${statistics.responseTime.p95.toFixed(2)}ms`,
        p99: `${statistics.responseTime.p99.toFixed(2)}ms`
      }
    });
    
    testMetrics.responseTimeTests.push({
      testType: 'ai-endpoints-monitoring',
      measurements: measurements,
      statistics: statistics,
      monitoringDuration: monitoringDuration
    });
    
    // Performance assertions
    expect(statistics.successRate).toBeGreaterThan(80); // 80% success rate
    expect(statistics.responseTime.p95).toBeLessThan(5000); // 95th percentile under 5 seconds
    expect(statistics.responseTime.average).toBeLessThan(3000); // Average under 3 seconds
  });

  test('Real-time performance monitoring with alerts', async () => {
    console.log('🚨 Testing real-time performance monitoring with alerts...');
    
    const tracker = new ResponseTimeTracker();
    const alertsReceived = [];
    
    // Lower thresholds for testing alerts
    resourceMonitor.thresholds.responseTime = 500; // 500ms
    resourceMonitor.thresholds.cpu = 50; // 50%
    resourceMonitor.thresholds.memory = 60; // 60%
    
    // Listen for alerts
    const alertListener = (data) => {
      alertsReceived.push(data);
    };
    
    monitoringEvents.on('slow_response', alertListener);
    monitoringEvents.on('resource_alert', alertListener);
    
    resourceMonitor.start(1000); // Monitor every second
    
    // Generate load that should trigger alerts
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
    const loadDuration = 15000; // 15 seconds
    const startTime = Date.now();
    
    console.log('🔥 Generating load to trigger performance alerts...');
    
    const loadPromises = [];
    while (Date.now() - startTime < loadDuration) {
      // Make multiple concurrent requests to increase load
      for (let i = 0; i < 3; i++) {
        loadPromises.push(
          tracker.measureEndpoint(`${baseURL}/api/ai/models/text-generation/predict`, {
            method: 'POST',
            data: {
              prompt: `Load test request ${Date.now()}-${i}`,
              maxTokens: 200
            },
            timeout: 10000,
            validateStatus: () => true
          }).catch(error => ({ error: error.message }))
        );
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Wait for remaining requests
    await Promise.all(loadPromises);
    resourceMonitor.stop();
    
    // Remove listeners
    monitoringEvents.off('slow_response', alertListener);
    monitoringEvents.off('resource_alert', alertListener);
    
    console.log(`🚨 Performance alerts summary:
      - Total alerts: ${alertsReceived.length}
      - Slow response alerts: ${alertsReceived.filter(a => a.type === 'slow_response').length}
      - Resource alerts: ${alertsReceived.filter(a => a.type === 'resource_alert').length}`);
    
    testMetrics.responseTimeTests.push({
      testType: 'real-time-monitoring-alerts',
      alertsReceived: alertsReceived,
      loadDuration: loadDuration,
      totalRequests: loadPromises.length
    });
    
    // Assert that monitoring system is working
    expect(alertsReceived.length).toBeGreaterThan(0); // Should trigger some alerts
    expect(testMetrics.resourceSnapshots.length).toBeGreaterThan(10); // Should have resource snapshots
  });

  test('Performance regression detection', async () => {
    console.log('📈 Testing performance regression detection...');
    
    const tracker = new ResponseTimeTracker();
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
    
    // Establish baseline performance
    console.log('📊 Establishing performance baseline...');
    const baselineEndpoint = `${baseURL}/api/health`;
    const baselineMeasurements = [];
    
    for (let i = 0; i < 20; i++) {
      const measurement = await tracker.measureEndpoint(baselineEndpoint);
      baselineMeasurements.push(measurement);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const baselineStats = tracker.getStatistics(baselineEndpoint);
    const baseline = {
      averageResponseTime: baselineStats.responseTime.average,
      p95ResponseTime: baselineStats.responseTime.p95,
      successRate: baselineStats.successRate
    };
    
    console.log('📊 Baseline Performance:', baseline);
    
    // Reset measurements for comparison test
    tracker.measurements = [];
    
    // Simulate degraded performance scenario
    console.log('🐌 Simulating performance degradation...');
    const degradedMeasurements = [];
    
    for (let i = 0; i < 20; i++) {
      // Add artificial delay to simulate degradation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const measurement = await tracker.measureEndpoint(baselineEndpoint);
      degradedMeasurements.push(measurement);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const degradedStats = tracker.getStatistics(baselineEndpoint);
    const degraded = {
      averageResponseTime: degradedStats.responseTime.average,
      p95ResponseTime: degradedStats.responseTime.p95,
      successRate: degradedStats.successRate
    };
    
    console.log('📊 Degraded Performance:', degraded);
    
    // Detect regression
    const regressionAnalysis = {
      averageResponseTimeIncrease: ((degraded.averageResponseTime - baseline.averageResponseTime) / baseline.averageResponseTime) * 100,
      p95ResponseTimeIncrease: ((degraded.p95ResponseTime - baseline.p95ResponseTime) / baseline.p95ResponseTime) * 100,
      successRateChange: degraded.successRate - baseline.successRate,
      isRegression: degraded.averageResponseTime > baseline.averageResponseTime * 1.2 // 20% increase threshold
    };
    
    console.log('📈 Regression Analysis:', {
      averageIncrease: `${regressionAnalysis.averageResponseTimeIncrease.toFixed(2)}%`,
      p95Increase: `${regressionAnalysis.p95ResponseTimeIncrease.toFixed(2)}%`,
      successRateChange: `${regressionAnalysis.successRateChange.toFixed(2)}%`,
      isRegression: regressionAnalysis.isRegression
    });
    
    testMetrics.responseTimeTests.push({
      testType: 'regression-detection',
      baseline: baseline,
      degraded: degraded,
      regressionAnalysis: regressionAnalysis
    });
    
    testMetrics.performanceBaselines[baselineEndpoint] = baseline;
    
    // Assert regression detection works
    expect(regressionAnalysis.isRegression).toBe(true);
    expect(regressionAnalysis.averageResponseTimeIncrease).toBeGreaterThan(10); // Should detect >10% increase
  });

  test('Comprehensive monitoring dashboard data collection', async () => {
    console.log('📊 Collecting comprehensive monitoring data for dashboard...');
    
    resourceMonitor.start(500); // High frequency monitoring
    
    const dashboardData = {
      responseMetrics: {},
      resourceMetrics: [],
      alertHistory: [],
      performanceTrends: [],
      systemHealth: []
    };
    
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
    const monitoringEndpoints = [
      '/api/health',
      '/api/status',
      '/api/metrics'
    ];
    
    // Collect data over time
    const collectionDuration = 10000; // 10 seconds
    const startTime = Date.now();
    let dataPoints = 0;
    
    while (Date.now() - startTime < collectionDuration) {
      const timestamp = Date.now();
      
      // Collect response time data for each endpoint
      for (const endpoint of monitoringEndpoints) {
        try {
          const startRequest = performance.now();
          const response = await axios.get(`${baseURL}${endpoint}`, {
            timeout: 5000,
            validateStatus: () => true
          });
          const responseTime = performance.now() - startRequest;
          
          if (!dashboardData.responseMetrics[endpoint]) {
            dashboardData.responseMetrics[endpoint] = [];
          }
          
          dashboardData.responseMetrics[endpoint].push({
            timestamp,
            responseTime,
            statusCode: response.status,
            success: response.status >= 200 && response.status < 400
          });
          
        } catch (error) {
          if (!dashboardData.responseMetrics[endpoint]) {
            dashboardData.responseMetrics[endpoint] = [];
          }
          
          dashboardData.responseMetrics[endpoint].push({
            timestamp,
            responseTime: null,
            error: error.message,
            success: false
          });
        }
      }
      
      // Collect current resource snapshot
      const resourceSnapshot = await resourceMonitor.collectResourceData();
      dashboardData.resourceMetrics.push(resourceSnapshot);
      
      // System health check
      const healthCheck = {
        timestamp,
        overallHealth: 'healthy', // Simplified for testing
        services: {
          api: true,
          database: true,
          cache: true
        },
        metrics: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
          activeConnections: Math.floor(Math.random() * 100) + 50 // Simulated
        }
      };
      
      dashboardData.systemHealth.push(healthCheck);
      
      dataPoints++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    resourceMonitor.stop();
    
    // Process data for dashboard
    const processedData = {
      summary: {
        dataPoints,
        collectionDuration,
        endpoints: monitoringEndpoints.length,
        totalRequests: Object.values(dashboardData.responseMetrics)
          .reduce((total, metrics) => total + metrics.length, 0)
      },
      responseMetrics: {},
      resourceTrends: analyzeResourceTrends(dashboardData.resourceMetrics),
      alerts: testMetrics.alertsTriggered.length,
      recommendations: generatePerformanceRecommendations(dashboardData)
    };
    
    // Calculate response metrics for each endpoint
    for (const [endpoint, metrics] of Object.entries(dashboardData.responseMetrics)) {
      const successfulRequests = metrics.filter(m => m.success && m.responseTime !== null);
      const responseTimes = successfulRequests.map(m => m.responseTime);
      
      if (responseTimes.length > 0) {
        processedData.responseMetrics[endpoint] = {
          count: metrics.length,
          successCount: successfulRequests.length,
          successRate: (successfulRequests.length / metrics.length) * 100,
          averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
          minResponseTime: Math.min(...responseTimes),
          maxResponseTime: Math.max(...responseTimes)
        };
      }
    }
    
    console.log('📊 Dashboard Data Summary:', processedData.summary);
    console.log('📈 Response Metrics:', processedData.responseMetrics);
    console.log('🔧 Performance Recommendations:', processedData.recommendations);
    
    testMetrics.responseTimeTests.push({
      testType: 'dashboard-data-collection',
      processedData: processedData,
      rawData: dashboardData
    });
    
    // Save dashboard data for visualization
    const dashboardPath = path.join(__dirname, '../reports', 'dashboard-data.json');
    fs.writeFileSync(dashboardPath, JSON.stringify(processedData, null, 2));
    
    // Assert comprehensive data collection
    expect(processedData.summary.dataPoints).toBeGreaterThan(5);
    expect(processedData.summary.totalRequests).toBeGreaterThan(15);
    expect(Object.keys(processedData.responseMetrics).length).toBeGreaterThan(0);
  });

  function analyzeResourceTrends(resourceMetrics) {
    if (resourceMetrics.length < 2) return null;
    
    const cpuTrend = calculateTrend(resourceMetrics.map(m => m.system?.cpuLoad || 0));
    const memoryTrend = calculateTrend(resourceMetrics.map(m => m.system?.memoryUtilization || 0));
    
    return {
      cpu: {
        trend: cpuTrend.trend,
        average: cpuTrend.average,
        change: cpuTrend.change
      },
      memory: {
        trend: memoryTrend.trend,
        average: memoryTrend.average,
        change: memoryTrend.change
      }
    };
  }

  function calculateTrend(values) {
    if (values.length < 2) return { trend: 'stable', average: 0, change: 0 };
    
    const first = values.slice(0, Math.floor(values.length / 3)).reduce((a, b) => a + b, 0) / Math.floor(values.length / 3);
    const last = values.slice(-Math.floor(values.length / 3)).reduce((a, b) => a + b, 0) / Math.floor(values.length / 3);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const change = ((last - first) / first) * 100;
    
    let trend = 'stable';
    if (change > 10) trend = 'increasing';
    else if (change < -10) trend = 'decreasing';
    
    return { trend, average, change };
  }

  function generatePerformanceRecommendations(data) {
    const recommendations = [];
    
    // Check response times
    for (const [endpoint, metrics] of Object.entries(data.responseMetrics)) {
      const avgResponseTime = metrics.reduce((sum, m) => {
        return m.responseTime ? sum + m.responseTime : sum;
      }, 0) / metrics.filter(m => m.responseTime).length;
      
      if (avgResponseTime > 2000) {
        recommendations.push({
          type: 'performance',
          priority: 'high',
          message: `Endpoint ${endpoint} has high response time (${avgResponseTime.toFixed(0)}ms)`
        });
      }
    }
    
    // Check resource utilization
    const avgCpu = data.resourceMetrics
      .filter(m => m.system?.cpuLoad)
      .reduce((sum, m) => sum + m.system.cpuLoad, 0) / 
      data.resourceMetrics.filter(m => m.system?.cpuLoad).length;
    
    if (avgCpu > 70) {
      recommendations.push({
        type: 'resource',
        priority: 'medium',
        message: `High CPU utilization detected (${avgCpu.toFixed(1)}%)`
      });
    }
    
    return recommendations;
  }
});