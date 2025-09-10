const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const axios = require('axios');

describe('Performance Regression Testing Pipeline', () => {
  let testMetrics;
  let regressionAnalyzer;

  beforeAll(() => {
    testMetrics = {
      startTime: Date.now(),
      regressionTests: [],
      alerts: [],
      comparisons: [],
      baselineMetrics: {},
      thresholds: {
        responseTime: 20, // 20% increase threshold
        throughput: 15, // 15% decrease threshold
        errorRate: 5, // 5% increase threshold
        memoryUsage: 25 // 25% increase threshold
      }
    };
    
    regressionAnalyzer = new PerformanceRegressionAnalyzer();
    console.log('🔍 Initializing performance regression testing pipeline...');
  });

  afterAll(() => {
    const summary = {
      testDuration: Date.now() - testMetrics.startTime,
      totalRegressionTests: testMetrics.regressionTests.length,
      regressionsDetected: testMetrics.alerts.filter(a => a.type === 'regression').length,
      improvementsDetected: testMetrics.alerts.filter(a => a.type === 'improvement').length,
      baselineUpdates: Object.keys(testMetrics.baselineMetrics).length
    };
    
    console.log('🚀 Performance Regression Testing Summary:', summary);
    global.performanceUtils.saveMetrics('regression-testing', {
      summary,
      testMetrics,
      detailedAnalysis: regressionAnalyzer.getAnalysisReport()
    });
    
    // Generate regression report
    generateRegressionReport();
  });

  class PerformanceRegressionAnalyzer {
    constructor() {
      this.baselineData = {};
      this.historicalData = [];
      this.analysisResults = [];
      this.alertThresholds = testMetrics.thresholds;
    }

    loadBaseline(testSuite) {
      const baselinePath = path.join(__dirname, '../baselines', `${testSuite}-baseline.json`);
      
      try {
        if (fs.existsSync(baselinePath)) {
          const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
          this.baselineData[testSuite] = baseline;
          console.log(`📊 Loaded baseline for ${testSuite}: ${baseline.measurements?.length || 0} measurements`);
          return baseline;
        }
      } catch (error) {
        console.log(`⚠️  Failed to load baseline for ${testSuite}: ${error.message}`);
      }
      
      return null;
    }

    saveBaseline(testSuite, data) {
      const baselineDir = path.join(__dirname, '../baselines');
      if (!fs.existsSync(baselineDir)) {
        fs.mkdirSync(baselineDir, { recursive: true });
      }
      
      const baselinePath = path.join(baselineDir, `${testSuite}-baseline.json`);
      const baselineData = {
        timestamp: Date.now(),
        testSuite,
        measurements: data,
        statistics: this.calculateStatistics(data),
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        }
      };
      
      fs.writeFileSync(baselinePath, JSON.stringify(baselineData, null, 2));
      console.log(`💾 Saved baseline for ${testSuite}: ${data.length} measurements`);
      
      return baselineData;
    }

    analyzeRegression(testSuite, currentData, baseline = null) {
      if (!baseline) {
        baseline = this.baselineData[testSuite];
      }
      
      if (!baseline || !baseline.statistics) {
        console.log(`⚠️  No baseline available for ${testSuite}, creating new baseline`);
        return this.saveBaseline(testSuite, currentData);
      }
      
      const currentStats = this.calculateStatistics(currentData);
      const comparison = this.compareStatistics(baseline.statistics, currentStats);
      
      const analysis = {
        testSuite,
        timestamp: Date.now(),
        baseline: baseline.statistics,
        current: currentStats,
        comparison,
        alerts: this.generateAlerts(comparison, testSuite),
        recommendation: this.generateRecommendation(comparison)
      };
      
      this.analysisResults.push(analysis);
      testMetrics.comparisons.push(analysis);
      
      // Add alerts to global metrics
      testMetrics.alerts.push(...analysis.alerts);
      
      return analysis;
    }

    calculateStatistics(measurements) {
      if (!measurements || measurements.length === 0) {
        return { count: 0 };
      }
      
      const responseTimes = measurements.map(m => m.responseTime).filter(t => t !== null && t !== undefined);
      const errorCount = measurements.filter(m => m.error || m.status >= 400).length;
      const memoryUsages = measurements.map(m => m.memoryUsage).filter(m => m !== null && m !== undefined);
      
      const stats = {
        count: measurements.length,
        responseTime: this.calculateMetrics(responseTimes),
        errorRate: (errorCount / measurements.length) * 100,
        throughput: responseTimes.length > 0 ? responseTimes.length / (Math.max(...responseTimes.map(t => t || 0)) / 1000) : 0,
        memoryUsage: this.calculateMetrics(memoryUsages),
        successRate: ((measurements.length - errorCount) / measurements.length) * 100
      };
      
      return stats;
    }

    calculateMetrics(values) {
      if (!values || values.length === 0) {
        return { min: 0, max: 0, average: 0, median: 0, p95: 0, p99: 0 };
      }
      
      const sorted = [...values].sort((a, b) => a - b);
      
      return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        average: values.reduce((a, b) => a + b, 0) / values.length,
        median: sorted[Math.floor(sorted.length / 2)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)]
      };
    }

    compareStatistics(baseline, current) {
      const comparison = {};
      
      // Response time comparison
      if (baseline.responseTime && current.responseTime) {
        comparison.responseTime = {
          change: ((current.responseTime.average - baseline.responseTime.average) / baseline.responseTime.average) * 100,
          p95Change: ((current.responseTime.p95 - baseline.responseTime.p95) / baseline.responseTime.p95) * 100,
          isRegression: current.responseTime.average > baseline.responseTime.average * (1 + this.alertThresholds.responseTime / 100)
        };
      }
      
      // Throughput comparison
      comparison.throughput = {
        change: baseline.throughput > 0 ? ((current.throughput - baseline.throughput) / baseline.throughput) * 100 : 0,
        isRegression: current.throughput < baseline.throughput * (1 - this.alertThresholds.throughput / 100)
      };
      
      // Error rate comparison
      comparison.errorRate = {
        change: current.errorRate - baseline.errorRate,
        isRegression: current.errorRate > baseline.errorRate + this.alertThresholds.errorRate
      };
      
      // Memory usage comparison
      if (baseline.memoryUsage && current.memoryUsage) {
        comparison.memoryUsage = {
          change: ((current.memoryUsage.average - baseline.memoryUsage.average) / baseline.memoryUsage.average) * 100,
          isRegression: current.memoryUsage.average > baseline.memoryUsage.average * (1 + this.alertThresholds.memoryUsage / 100)
        };
      }
      
      return comparison;
    }

    generateAlerts(comparison, testSuite) {
      const alerts = [];
      
      if (comparison.responseTime?.isRegression) {
        alerts.push({
          type: 'regression',
          severity: 'high',
          metric: 'responseTime',
          testSuite,
          message: `Response time increased by ${comparison.responseTime.change.toFixed(2)}%`,
          threshold: this.alertThresholds.responseTime,
          value: comparison.responseTime.change
        });
      }
      
      if (comparison.throughput?.isRegression) {
        alerts.push({
          type: 'regression',
          severity: 'medium',
          metric: 'throughput',
          testSuite,
          message: `Throughput decreased by ${Math.abs(comparison.throughput.change).toFixed(2)}%`,
          threshold: this.alertThresholds.throughput,
          value: comparison.throughput.change
        });
      }
      
      if (comparison.errorRate?.isRegression) {
        alerts.push({
          type: 'regression',
          severity: 'high',
          metric: 'errorRate',
          testSuite,
          message: `Error rate increased by ${comparison.errorRate.change.toFixed(2)}%`,
          threshold: this.alertThresholds.errorRate,
          value: comparison.errorRate.change
        });
      }
      
      if (comparison.memoryUsage?.isRegression) {
        alerts.push({
          type: 'regression',
          severity: 'medium',
          metric: 'memoryUsage',
          testSuite,
          message: `Memory usage increased by ${comparison.memoryUsage.change.toFixed(2)}%`,
          threshold: this.alertThresholds.memoryUsage,
          value: comparison.memoryUsage.change
        });
      }
      
      // Check for improvements
      if (comparison.responseTime?.change < -10) {
        alerts.push({
          type: 'improvement',
          severity: 'info',
          metric: 'responseTime',
          testSuite,
          message: `Response time improved by ${Math.abs(comparison.responseTime.change).toFixed(2)}%`,
          value: comparison.responseTime.change
        });
      }
      
      return alerts;
    }

    generateRecommendation(comparison) {
      const recommendations = [];
      
      if (comparison.responseTime?.isRegression) {
        recommendations.push('Consider optimizing application code or increasing server resources');
      }
      
      if (comparison.throughput?.isRegression) {
        recommendations.push('Investigate bottlenecks in request processing pipeline');
      }
      
      if (comparison.errorRate?.isRegression) {
        recommendations.push('Review error logs and fix issues causing increased failure rate');
      }
      
      if (comparison.memoryUsage?.isRegression) {
        recommendations.push('Check for memory leaks and optimize memory allocation patterns');
      }
      
      if (recommendations.length === 0) {
        recommendations.push('Performance metrics are within acceptable thresholds');
      }
      
      return recommendations.join('; ');
    }

    getAnalysisReport() {
      return {
        totalAnalyses: this.analysisResults.length,
        baselineSuites: Object.keys(this.baselineData),
        alertsSummary: {
          regressions: this.analysisResults.flatMap(a => a.alerts).filter(alert => alert.type === 'regression').length,
          improvements: this.analysisResults.flatMap(a => a.alerts).filter(alert => alert.type === 'improvement').length
        },
        analysisResults: this.analysisResults
      };
    }
  }

  const runPerformanceTest = async (testName, testFunction) => {
    console.log(`🧪 Running performance test: ${testName}`);
    
    const measurements = [];
    const testIterations = 10;
    
    for (let i = 0; i < testIterations; i++) {
      const startTime = performance.now();
      const memoryBefore = process.memoryUsage();
      
      try {
        const result = await testFunction(i);
        const endTime = performance.now();
        const memoryAfter = process.memoryUsage();
        
        measurements.push({
          iteration: i,
          responseTime: endTime - startTime,
          memoryUsage: memoryAfter.heapUsed - memoryBefore.heapUsed,
          timestamp: Date.now(),
          result: result,
          success: true
        });
        
      } catch (error) {
        const endTime = performance.now();
        
        measurements.push({
          iteration: i,
          responseTime: endTime - startTime,
          error: error.message,
          timestamp: Date.now(),
          success: false
        });
      }
      
      // Small delay between iterations
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    testMetrics.regressionTests.push({
      testName,
      measurements,
      timestamp: Date.now()
    });
    
    return measurements;
  };

  test('AI Model Response Time Regression Detection', async () => {
    const testSuite = 'ai-model-response';
    regressionAnalyzer.loadBaseline(testSuite);
    
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
    
    const measurements = await runPerformanceTest('AI Model Response Time', async (iteration) => {
      const response = await axios.post(`${baseURL}/api/ai/models/text-generation/predict`, {
        prompt: `Performance regression test iteration ${iteration}`,
        maxTokens: 50,
        temperature: 0.5
      }, {
        timeout: 30000,
        validateStatus: () => true
      });
      
      return {
        status: response.status,
        tokensGenerated: response.data?.tokens || 0,
        contentLength: response.data?.content?.length || 0
      };
    });
    
    const analysis = regressionAnalyzer.analyzeRegression(testSuite, measurements);
    
    console.log(`📊 AI Model Response Analysis:
      - Average Response Time: ${analysis.current.responseTime.average.toFixed(2)}ms
      - Error Rate: ${analysis.current.errorRate.toFixed(2)}%
      - Success Rate: ${analysis.current.successRate.toFixed(2)}%
      - Alerts: ${analysis.alerts.length}`);
    
    // Log any regression alerts
    analysis.alerts.forEach(alert => {
      if (alert.type === 'regression') {
        console.log(`⚠️  REGRESSION: ${alert.message}`);
      } else if (alert.type === 'improvement') {
        console.log(`✅ IMPROVEMENT: ${alert.message}`);
      }
    });
    
    expect(measurements.length).toBeGreaterThan(5);
    expect(analysis).toHaveProperty('comparison');
  });

  test('Container Performance Regression Detection', async () => {
    const testSuite = 'container-performance';
    regressionAnalyzer.loadBaseline(testSuite);
    
    const Docker = require('dockerode');
    const docker = new Docker();
    
    const measurements = await runPerformanceTest('Container Performance', async (iteration) => {
      const container = await docker.createContainer({
        Image: 'node:18-alpine',
        Cmd: ['node', '-e', `console.log('Regression test ${iteration}'); process.exit(0);`]
      });
      
      const startTime = performance.now();
      await container.start();
      
      // Wait for container to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const info = await container.inspect();
      const endTime = performance.now();
      
      // Cleanup
      try {
        await container.remove({ force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
      
      return {
        containerId: container.id.substr(0, 12),
        state: info.State.Status,
        executionTime: endTime - startTime
      };
    });
    
    const analysis = regressionAnalyzer.analyzeRegression(testSuite, measurements);
    
    console.log(`📊 Container Performance Analysis:
      - Average Execution Time: ${analysis.current.responseTime.average.toFixed(2)}ms
      - Success Rate: ${analysis.current.successRate.toFixed(2)}%
      - P95 Response Time: ${analysis.current.responseTime.p95.toFixed(2)}ms`);
    
    // Assert no critical regressions
    const criticalRegressions = analysis.alerts.filter(a => a.type === 'regression' && a.severity === 'high');
    expect(criticalRegressions.length).toBe(0);
  });

  test('Memory Usage Regression Detection', async () => {
    const testSuite = 'memory-usage';
    regressionAnalyzer.loadBaseline(testSuite);
    
    const measurements = await runPerformanceTest('Memory Usage', async (iteration) => {
      const data = [];
      const objectCount = 10000;
      
      // Allocate memory
      for (let i = 0; i < objectCount; i++) {
        data.push({
          id: i,
          name: `object-${iteration}-${i}`,
          data: new Array(100).fill(Math.random()),
          timestamp: Date.now()
        });
      }
      
      const result = {
        objectsCreated: objectCount,
        dataLength: data.length,
        sampleObject: data[0]
      };
      
      // Clear references
      data.length = 0;
      
      return result;
    });
    
    const analysis = regressionAnalyzer.analyzeRegression(testSuite, measurements);
    
    console.log(`📊 Memory Usage Analysis:
      - Average Memory Delta: ${(analysis.current.memoryUsage.average / 1024 / 1024).toFixed(2)}MB
      - P95 Memory Usage: ${(analysis.current.memoryUsage.p95 / 1024 / 1024).toFixed(2)}MB
      - Memory Regression: ${analysis.comparison.memoryUsage?.isRegression ? 'YES' : 'NO'}`);
    
    if (analysis.comparison.memoryUsage?.isRegression) {
      console.log(`⚠️  Memory usage increased by ${analysis.comparison.memoryUsage.change.toFixed(2)}%`);
    }
    
    expect(analysis.current.memoryUsage.average).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
  });

  test('API Throughput Regression Detection', async () => {
    const testSuite = 'api-throughput';
    regressionAnalyzer.loadBaseline(testSuite);
    
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
    const measurements = [];
    
    // Concurrent throughput test
    const concurrentRequests = 20;
    const requestsPerClient = 5;
    const startTime = performance.now();
    
    const clientPromises = Array(concurrentRequests).fill(null).map(async (_, clientIndex) => {
      for (let i = 0; i < requestsPerClient; i++) {
        const requestStart = performance.now();
        
        try {
          const response = await axios.get(`${baseURL}/api/health`, {
            timeout: 10000,
            validateStatus: () => true
          });
          
          const requestEnd = performance.now();
          
          measurements.push({
            clientIndex,
            requestIndex: i,
            responseTime: requestEnd - requestStart,
            status: response.status,
            success: response.status >= 200 && response.status < 400,
            timestamp: Date.now()
          });
          
        } catch (error) {
          const requestEnd = performance.now();
          
          measurements.push({
            clientIndex,
            requestIndex: i,
            responseTime: requestEnd - requestStart,
            error: error.message,
            success: false,
            timestamp: Date.now()
          });
        }
      }
    });
    
    await Promise.all(clientPromises);
    const totalDuration = performance.now() - startTime;
    
    // Calculate throughput metrics
    const successfulRequests = measurements.filter(m => m.success);
    const throughput = successfulRequests.length / (totalDuration / 1000); // requests per second
    
    // Add throughput info to measurements
    measurements.forEach(m => {
      m.throughput = throughput;
      m.totalDuration = totalDuration;
    });
    
    const analysis = regressionAnalyzer.analyzeRegression(testSuite, measurements);
    
    console.log(`📊 API Throughput Analysis:
      - Total Requests: ${measurements.length}
      - Successful Requests: ${successfulRequests.length}
      - Throughput: ${throughput.toFixed(2)} req/s
      - Average Response Time: ${analysis.current.responseTime.average.toFixed(2)}ms
      - Error Rate: ${analysis.current.errorRate.toFixed(2)}%`);
    
    testMetrics.baselineMetrics[testSuite] = {
      throughput: throughput,
      averageResponseTime: analysis.current.responseTime.average,
      errorRate: analysis.current.errorRate
    };
    
    // Assert acceptable performance
    expect(throughput).toBeGreaterThan(5); // At least 5 requests per second
    expect(analysis.current.errorRate).toBeLessThan(10); // Less than 10% error rate
  });

  test('End-to-End Performance Regression Pipeline', async () => {
    console.log('🔧 Running end-to-end performance regression pipeline...');
    
    // Aggregate all regression test results
    const aggregatedResults = {
      totalTests: testMetrics.regressionTests.length,
      totalMeasurements: testMetrics.regressionTests.reduce((sum, test) => sum + test.measurements.length, 0),
      overallAlerts: testMetrics.alerts.length,
      regressionsByType: {},
      improvementsByType: {},
      performanceTrends: {}
    };
    
    // Group alerts by type
    testMetrics.alerts.forEach(alert => {
      if (alert.type === 'regression') {
        if (!aggregatedResults.regressionsByType[alert.metric]) {
          aggregatedResults.regressionsByType[alert.metric] = [];
        }
        aggregatedResults.regressionsByType[alert.metric].push(alert);
      } else if (alert.type === 'improvement') {
        if (!aggregatedResults.improvementsByType[alert.metric]) {
          aggregatedResults.improvementsByType[alert.metric] = [];
        }
        aggregatedResults.improvementsByType[alert.metric].push(alert);
      }
    });
    
    // Calculate performance trends
    testMetrics.regressionTests.forEach(test => {
      const avgResponseTime = test.measurements.reduce((sum, m) => sum + (m.responseTime || 0), 0) / test.measurements.length;
      const errorRate = (test.measurements.filter(m => !m.success).length / test.measurements.length) * 100;
      
      aggregatedResults.performanceTrends[test.testName] = {
        averageResponseTime: avgResponseTime,
        errorRate: errorRate,
        measurementCount: test.measurements.length,
        timestamp: test.timestamp
      };
    });
    
    // Generate pipeline report
    const pipelineReport = {
      timestamp: new Date().toISOString(),
      summary: aggregatedResults,
      regressionThresholds: testMetrics.thresholds,
      testResults: testMetrics.regressionTests,
      alerts: testMetrics.alerts,
      comparisons: testMetrics.comparisons,
      recommendations: generatePipelineRecommendations(aggregatedResults)
    };
    
    const reportPath = path.join(__dirname, '../reports', 'regression-pipeline-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(pipelineReport, null, 2));
    
    console.log(`📄 Regression pipeline report generated: ${reportPath}`);
    console.log(`📊 Pipeline Summary:
      - Total Tests: ${aggregatedResults.totalTests}
      - Total Measurements: ${aggregatedResults.totalMeasurements}
      - Regressions: ${Object.keys(aggregatedResults.regressionsByType).length}
      - Improvements: ${Object.keys(aggregatedResults.improvementsByType).length}
      - Overall Alerts: ${aggregatedResults.overallAlerts}`);
    
    // CI/CD Integration: Fail if critical regressions detected
    const criticalRegressions = testMetrics.alerts.filter(a => 
      a.type === 'regression' && a.severity === 'high'
    );
    
    if (criticalRegressions.length > 0) {
      console.log(`❌ ${criticalRegressions.length} critical performance regressions detected!`);
      criticalRegressions.forEach(regression => {
        console.log(`   - ${regression.testSuite}: ${regression.message}`);
      });
    }
    
    // Assert pipeline success criteria
    expect(aggregatedResults.totalTests).toBeGreaterThan(0);
    expect(criticalRegressions.length).toBe(0); // No critical regressions allowed
  });

  function generatePipelineRecommendations(aggregatedResults) {
    const recommendations = [];
    
    // Check for patterns in regressions
    const regressionMetrics = Object.keys(aggregatedResults.regressionsByType);
    if (regressionMetrics.includes('responseTime')) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Response time regressions detected. Consider code profiling and optimization.'
      });
    }
    
    if (regressionMetrics.includes('memoryUsage')) {
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        message: 'Memory usage regressions detected. Review for potential memory leaks.'
      });
    }
    
    if (regressionMetrics.includes('errorRate')) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'Error rate regressions detected. Review error logs and fix stability issues.'
      });
    }
    
    // Check for improvements
    const improvementMetrics = Object.keys(aggregatedResults.improvementsByType);
    if (improvementMetrics.length > 0) {
      recommendations.push({
        type: 'success',
        priority: 'info',
        message: `Performance improvements detected in: ${improvementMetrics.join(', ')}`
      });
    }
    
    // Overall health check
    if (aggregatedResults.overallAlerts === 0) {
      recommendations.push({
        type: 'status',
        priority: 'info',
        message: 'All performance metrics are within acceptable thresholds.'
      });
    }
    
    return recommendations;
  }

  function generateRegressionReport() {
    const htmlReport = `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Regression Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metric-card { background: #fff; border: 1px solid #ddd; margin: 10px; padding: 15px; border-radius: 8px; display: inline-block; min-width: 250px; }
        .regression { border-left: 4px solid #e74c3c; }
        .improvement { border-left: 4px solid #27ae60; }
        .stable { border-left: 4px solid #3498db; }
        .alert-high { background: #ffe6e6; }
        .alert-medium { background: #fff3cd; }
        .alert-info { background: #e6f3ff; }
        .chart-container { margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background: #f8f9fa; font-weight: bold; }
        .status-badge { padding: 4px 12px; border-radius: 12px; color: white; font-size: 12px; }
        .status-regression { background: #e74c3c; }
        .status-improvement { background: #27ae60; }
        .status-stable { background: #3498db; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Performance Regression Analysis Report</h1>
            <p>Generated: ${new Date().toISOString()}</p>
            <p>Total Tests: ${testMetrics.regressionTests.length} | 
               Total Alerts: ${testMetrics.alerts.length} | 
               Regressions: ${testMetrics.alerts.filter(a => a.type === 'regression').length}</p>
        </div>

        <h2>📊 Performance Metrics Overview</h2>
        <div class="metrics-grid">
            ${testMetrics.comparisons.map(comparison => `
                <div class="metric-card ${comparison.comparison.responseTime?.isRegression ? 'regression' : 
                                          comparison.comparison.responseTime?.change < -10 ? 'improvement' : 'stable'}">
                    <h3>${comparison.testSuite}</h3>
                    <p><strong>Response Time:</strong> ${comparison.current.responseTime?.average?.toFixed(2) || 'N/A'}ms</p>
                    <p><strong>Error Rate:</strong> ${comparison.current.errorRate?.toFixed(2) || 'N/A'}%</p>
                    <p><strong>Success Rate:</strong> ${comparison.current.successRate?.toFixed(2) || 'N/A'}%</p>
                    ${comparison.comparison.responseTime ? 
                      `<p><strong>Change:</strong> ${comparison.comparison.responseTime.change > 0 ? '+' : ''}${comparison.comparison.responseTime.change.toFixed(2)}%</p>` : ''}
                </div>
            `).join('')}
        </div>

        ${testMetrics.alerts.length > 0 ? `
            <h2>🚨 Performance Alerts</h2>
            <table>
                <thead>
                    <tr>
                        <th>Test Suite</th>
                        <th>Type</th>
                        <th>Metric</th>
                        <th>Message</th>
                        <th>Severity</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${testMetrics.alerts.map(alert => `
                        <tr class="alert-${alert.severity}">
                            <td>${alert.testSuite}</td>
                            <td><span class="status-badge status-${alert.type}">${alert.type.toUpperCase()}</span></td>
                            <td>${alert.metric}</td>
                            <td>${alert.message}</td>
                            <td>${alert.severity.toUpperCase()}</td>
                            <td>${alert.value?.toFixed(2) || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p>✅ No performance alerts detected!</p>'}

        <h2>📈 Test Results Summary</h2>
        <table>
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Measurements</th>
                    <th>Avg Response Time</th>
                    <th>Success Rate</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${testMetrics.regressionTests.map(test => {
                    const avgResponseTime = test.measurements.reduce((sum, m) => sum + (m.responseTime || 0), 0) / test.measurements.length;
                    const successRate = (test.measurements.filter(m => m.success).length / test.measurements.length) * 100;
                    const hasRegression = testMetrics.alerts.some(a => a.testSuite === test.testName && a.type === 'regression');
                    
                    return `
                        <tr>
                            <td>${test.testName}</td>
                            <td>${test.measurements.length}</td>
                            <td>${avgResponseTime.toFixed(2)}ms</td>
                            <td>${successRate.toFixed(2)}%</td>
                            <td><span class="status-badge status-${hasRegression ? 'regression' : 'stable'}">
                                ${hasRegression ? 'REGRESSION' : 'STABLE'}
                            </span></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>

        <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <h3>🔧 Recommendations</h3>
            <ul>
                ${testMetrics.alerts.filter(a => a.type === 'regression').length > 0 ? 
                  '<li>Investigate performance regressions and implement optimizations</li>' : ''}
                <li>Continue monitoring performance metrics in CI/CD pipeline</li>
                <li>Update baseline measurements after confirmed performance improvements</li>
                <li>Consider implementing automated performance budgets</li>
            </ul>
        </div>
    </div>
</body>
</html>
    `;
    
    const htmlPath = path.join(__dirname, '../reports', 'regression-analysis.html');
    fs.writeFileSync(htmlPath, htmlReport);
    console.log(`📄 HTML regression report generated: ${htmlPath}`);
  }
});