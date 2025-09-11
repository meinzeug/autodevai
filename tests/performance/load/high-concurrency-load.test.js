const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

describe('High Concurrency Load Testing (100-1000 Users)', () => {
  let testMetrics;
  let performanceTargets;
  let loadTestEmitter;

  beforeAll(() => {
    testMetrics = {
      startTime: Date.now(),
      loadTests: [],
      userSessions: [],
      responseTimeDistribution: [],
      errorPatterns: [],
      resourceUtilization: [],
      bottleneckAnalysis: {}
    };

    // Performance targets for high load scenarios
    performanceTargets = {
      maxUsers: 1000,
      responseTimeP95: 5000, // 5 seconds 95th percentile
      responseTimeP99: 8000, // 8 seconds 99th percentile
      errorRateThreshold: 5, // 5% max error rate
      throughputTarget: 100, // 100 requests per second minimum
      resourceUtilizationLimit: 80, // 80% max resource utilization
      concurrentUserSupport: 500, // 500 concurrent users minimum
      sessionDurationTarget: 300000, // 5 minutes max session duration
      memoryLeakThreshold: 200 * 1024 * 1024, // 200MB
      rampUpTime: 60000 // 1 minute ramp-up time
    };

    loadTestEmitter = new EventEmitter();
    
    // Set up load test event listeners
    loadTestEmitter.on('user_session_start', (data) => {
      testMetrics.userSessions.push({
        ...data,
        startTime: Date.now(),
        status: 'active'
      });
    });

    loadTestEmitter.on('user_session_end', (data) => {
      const session = testMetrics.userSessions.find(s => s.userId === data.userId);
      if (session) {
        session.endTime = Date.now();
        session.duration = session.endTime - session.startTime;
        session.status = 'completed';
        session.requestCount = data.requestCount;
        session.errorCount = data.errorCount;
      }
    });

    loadTestEmitter.on('response_time', (data) => {
      testMetrics.responseTimeDistribution.push(data);
    });

    loadTestEmitter.on('error_occurred', (data) => {
      testMetrics.errorPatterns.push({
        ...data,
        timestamp: Date.now()
      });
    });

    console.log('🚀 Starting High Concurrency Load Testing...');
    console.log('📊 Performance Targets:', performanceTargets);
  });

  afterAll(() => {
    const summary = {
      testDuration: Date.now() - testMetrics.startTime,
      totalLoadTests: testMetrics.loadTests.length,
      totalUserSessions: testMetrics.userSessions.length,
      totalRequests: testMetrics.responseTimeDistribution.length,
      totalErrors: testMetrics.errorPatterns.length,
      maxConcurrentUsers: findMaxConcurrentUsers(),
      averageResponseTime: calculateAverageResponseTime(),
      responseTimePercentiles: calculateResponseTimePercentiles(),
      errorRate: calculateOverallErrorRate(),
      throughputAnalysis: calculateThroughputAnalysis(),
      resourcePeakUsage: findPeakResourceUsage(),
      targetCompliance: evaluateLoadTestCompliance()
    };

    console.log('🏆 High Concurrency Load Test Summary:', summary);
    global.performanceUtils.saveMetrics('high-concurrency-load', {
      summary,
      detailedMetrics: testMetrics,
      performanceTargets
    });

    generateLoadTestReport(summary);
  });

  // Simulate realistic user behavior patterns
  const simulateUserSession = async (userId, userType, baseURL, sessionDuration = 300000) => {
    const userSession = {
      userId,
      userType,
      requestCount: 0,
      errorCount: 0,
      responses: []
    };

    loadTestEmitter.emit('user_session_start', { userId, userType });

    const sessionStart = Date.now();
    const endpoints = getUserEndpoints(userType);

    try {
      while (Date.now() - sessionStart < sessionDuration) {
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        const requestStart = performance.now();

        try {
          const response = await makeUserRequest(baseURL, endpoint, userId);
          const responseTime = performance.now() - requestStart;

          userSession.requestCount++;
          userSession.responses.push({
            endpoint: endpoint.path,
            method: endpoint.method,
            responseTime,
            statusCode: response.status,
            success: true,
            timestamp: Date.now()
          });

          loadTestEmitter.emit('response_time', {
            userId,
            userType,
            endpoint: endpoint.path,
            responseTime,
            statusCode: response.status
          });

          // Realistic user think time
          await new Promise(resolve => setTimeout(resolve, getThinkTime(userType)));

        } catch (error) {
          const responseTime = performance.now() - requestStart;
          
          userSession.errorCount++;
          userSession.responses.push({
            endpoint: endpoint.path,
            method: endpoint.method,
            responseTime,
            error: error.message,
            statusCode: error.response?.status || 0,
            success: false,
            timestamp: Date.now()
          });

          loadTestEmitter.emit('error_occurred', {
            userId,
            userType,
            endpoint: endpoint.path,
            error: error.message,
            statusCode: error.response?.status || 0
          });

          // Brief pause on error
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } finally {
      loadTestEmitter.emit('user_session_end', {
        userId,
        requestCount: userSession.requestCount,
        errorCount: userSession.errorCount
      });
    }

    return userSession;
  };

  const getUserEndpoints = (userType) => {
    const commonEndpoints = [
      { path: '/api/health', method: 'GET', weight: 10 },
      { path: '/api/status', method: 'GET', weight: 5 }
    ];

    const typeSpecificEndpoints = {
      developer: [
        { path: '/api/ai/models/text-generation/predict', method: 'POST', weight: 20 },
        { path: '/api/ai/models/code-analysis/analyze', method: 'POST', weight: 15 },
        { path: '/api/projects', method: 'GET', weight: 8 },
        { path: '/api/projects', method: 'POST', weight: 5 },
        { path: '/api/codex/generate', method: 'POST', weight: 25 }
      ],
      researcher: [
        { path: '/api/ai/models/text-generation/predict', method: 'POST', weight: 30 },
        { path: '/api/research/analyze', method: 'POST', weight: 20 },
        { path: '/api/documents', method: 'GET', weight: 15 },
        { path: '/api/search', method: 'GET', weight: 10 }
      ],
      casual: [
        { path: '/api/ai/models/text-generation/predict', method: 'POST', weight: 15 },
        { path: '/api/dashboard', method: 'GET', weight: 20 },
        { path: '/api/profile', method: 'GET', weight: 10 }
      ]
    };

    return [...commonEndpoints, ...(typeSpecificEndpoints[userType] || typeSpecificEndpoints.casual)];
  };

  const getThinkTime = (userType) => {
    // Different user types have different think times
    const baseTimes = {
      developer: 3000, // 3 seconds
      researcher: 5000, // 5 seconds
      casual: 2000 // 2 seconds
    };

    const baseTime = baseTimes[userType] || baseTimes.casual;
    return baseTime + (Math.random() * baseTime * 0.5); // ±25% variation
  };

  const makeUserRequest = async (baseURL, endpoint, userId) => {
    const requestData = generateRequestData(endpoint, userId);
    
    const config = {
      method: endpoint.method,
      url: `${baseURL}${endpoint.path}`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId,
        'X-Load-Test': 'true'
      },
      validateStatus: () => true // Don't throw on 4xx/5xx
    };

    if (endpoint.method === 'POST' && requestData) {
      config.data = requestData;
    }

    return axios(config);
  };

  const generateRequestData = (endpoint, userId) => {
    // Generate realistic request data based on endpoint
    const dataGenerators = {
      '/api/ai/models/text-generation/predict': () => ({
        prompt: `User ${userId} request: Generate a summary of machine learning concepts`,
        maxTokens: 500,
        temperature: 0.7
      }),
      '/api/ai/models/code-analysis/analyze': () => ({
        code: `function example_${userId}() { return "Hello World"; }`,
        language: 'javascript',
        analysisType: 'quality'
      }),
      '/api/codex/generate': () => ({
        prompt: `Create a function for user ${userId}`,
        language: 'javascript',
        complexity: 'medium'
      }),
      '/api/projects': () => ({
        name: `Project_${userId}_${Date.now()}`,
        description: `Test project for user ${userId}`,
        type: 'web'
      })
    };

    const generator = dataGenerators[endpoint.path];
    return generator ? generator() : null;
  };

  const runLoadTestScenario = async (scenarioName, userCount, rampUpTime, testDuration) => {
    console.log(`🔄 Starting load test: ${scenarioName} (${userCount} users)`);
    const testStart = Date.now();
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
    
    const activeUsers = new Map();
    const userPromises = [];
    const userTypes = ['developer', 'researcher', 'casual'];

    // Ramp-up phase: gradually add users
    const usersPerInterval = Math.ceil(userCount / (rampUpTime / 5000)); // Every 5 seconds
    const rampUpIntervals = Math.ceil(userCount / usersPerInterval);

    let usersStarted = 0;

    for (let interval = 0; interval < rampUpIntervals && usersStarted < userCount; interval++) {
      const usersToStart = Math.min(usersPerInterval, userCount - usersStarted);
      
      for (let i = 0; i < usersToStart; i++) {
        const userId = `user_${usersStarted + i}_${Date.now()}`;
        const userType = userTypes[Math.floor(Math.random() * userTypes.length)];
        
        const userPromise = simulateUserSession(
          userId, 
          userType, 
          baseURL, 
          testDuration
        ).catch(error => ({
          userId,
          error: error.message
        }));

        userPromises.push(userPromise);
        activeUsers.set(userId, { userType, startTime: Date.now() });
      }

      usersStarted += usersToStart;
      
      console.log(`  Ramped up to ${usersStarted} users`);
      
      // Wait before next ramp-up interval (unless it's the last one)
      if (interval < rampUpIntervals - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log(`  All ${userCount} users started, running test for ${testDuration/1000}s...`);

    // Monitor system resources during test
    const resourceMonitoringInterval = setInterval(() => {
      captureResourceSnapshot(activeUsers.size);
    }, 10000); // Every 10 seconds

    // Wait for all user sessions to complete
    const userResults = await Promise.all(userPromises);
    
    clearInterval(resourceMonitoringInterval);

    const testEnd = Date.now();
    const actualTestDuration = testEnd - testStart;

    // Analyze results
    const successfulUsers = userResults.filter(result => !result.error).length;
    const failedUsers = userResults.filter(result => result.error).length;

    const loadTestResult = {
      scenarioName,
      userCount,
      rampUpTime,
      testDuration,
      actualTestDuration,
      successfulUsers,
      failedUsers,
      userSuccessRate: (successfulUsers / userCount) * 100,
      totalRequests: testMetrics.responseTimeDistribution.length,
      totalErrors: testMetrics.errorPatterns.length,
      responseTimeAnalysis: analyzeResponseTimes(),
      throughputAnalysis: calculateCurrentThroughput(actualTestDuration),
      resourceAnalysis: analyzeResourceUsage()
    };

    testMetrics.loadTests.push(loadTestResult);
    return loadTestResult;
  };

  const captureResourceSnapshot = (activeUserCount) => {
    const memoryUsage = process.memoryUsage();
    
    testMetrics.resourceUtilization.push({
      timestamp: Date.now(),
      activeUsers: activeUserCount,
      memory: {
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external
      },
      // Simulated CPU usage (in real scenario, would use actual CPU metrics)
      cpuUsage: Math.min(95, 20 + (activeUserCount / 10)),
      // Simulated network metrics
      networkConnections: activeUserCount * (1 + Math.random() * 0.5)
    });
  };

  const analyzeResponseTimes = () => {
    if (testMetrics.responseTimeDistribution.length === 0) return null;

    const responseTimes = testMetrics.responseTimeDistribution.map(r => r.responseTime);
    responseTimes.sort((a, b) => a - b);

    return {
      count: responseTimes.length,
      min: responseTimes[0],
      max: responseTimes[responseTimes.length - 1],
      average: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      median: responseTimes[Math.floor(responseTimes.length / 2)],
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)]
    };
  };

  const calculateCurrentThroughput = (duration) => {
    const totalRequests = testMetrics.responseTimeDistribution.length;
    const throughput = totalRequests / (duration / 1000); // requests per second

    return {
      totalRequests,
      durationSeconds: duration / 1000,
      requestsPerSecond: throughput,
      meetsTarget: throughput >= performanceTargets.throughputTarget
    };
  };

  const analyzeResourceUsage = () => {
    if (testMetrics.resourceUtilization.length === 0) return null;

    const snapshots = testMetrics.resourceUtilization;
    
    return {
      snapshotCount: snapshots.length,
      peakMemoryUsage: Math.max(...snapshots.map(s => s.memory.rss)),
      averageMemoryUsage: snapshots.reduce((sum, s) => sum + s.memory.rss, 0) / snapshots.length,
      peakCpuUsage: Math.max(...snapshots.map(s => s.cpuUsage)),
      averageCpuUsage: snapshots.reduce((sum, s) => sum + s.cpuUsage, 0) / snapshots.length,
      maxActiveUsers: Math.max(...snapshots.map(s => s.activeUsers))
    };
  };

  test('Load Test: 100 Concurrent Users', async () => {
    const result = await runLoadTestScenario(
      '100 Concurrent Users',
      100,
      30000, // 30 second ramp-up
      120000 // 2 minute test duration
    );

    console.log('📊 100 User Load Test Results:');
    console.log(`  Success Rate: ${result.userSuccessRate.toFixed(2)}%`);
    console.log(`  Throughput: ${result.throughputAnalysis.requestsPerSecond.toFixed(2)} req/sec`);
    console.log(`  P95 Response Time: ${result.responseTimeAnalysis?.p95?.toFixed(2) || 'N/A'}ms`);

    expect(result.userSuccessRate).toBeGreaterThan(95); // 95% success rate
    expect(result.throughputAnalysis.requestsPerSecond).toBeGreaterThan(10);
    if (result.responseTimeAnalysis) {
      expect(result.responseTimeAnalysis.p95).toBeLessThan(performanceTargets.responseTimeP95);
    }
  });

  test('Load Test: 300 Concurrent Users', async () => {
    const result = await runLoadTestScenario(
      '300 Concurrent Users',
      300,
      45000, // 45 second ramp-up
      180000 // 3 minute test duration
    );

    console.log('📊 300 User Load Test Results:');
    console.log(`  Success Rate: ${result.userSuccessRate.toFixed(2)}%`);
    console.log(`  Throughput: ${result.throughputAnalysis.requestsPerSecond.toFixed(2)} req/sec`);
    console.log(`  P95 Response Time: ${result.responseTimeAnalysis?.p95?.toFixed(2) || 'N/A'}ms`);

    expect(result.userSuccessRate).toBeGreaterThan(90); // 90% success rate at higher load
    expect(result.throughputAnalysis.requestsPerSecond).toBeGreaterThan(25);
  });

  test('Load Test: 500 Concurrent Users', async () => {
    const result = await runLoadTestScenario(
      '500 Concurrent Users',
      500,
      60000, // 1 minute ramp-up
      300000 // 5 minute test duration
    );

    console.log('📊 500 User Load Test Results:');
    console.log(`  Success Rate: ${result.userSuccessRate.toFixed(2)}%`);
    console.log(`  Throughput: ${result.throughputAnalysis.requestsPerSecond.toFixed(2)} req/sec`);
    console.log(`  P95 Response Time: ${result.responseTimeAnalysis?.p95?.toFixed(2) || 'N/A'}ms`);
    console.log(`  Peak Memory Usage: ${(result.resourceAnalysis?.peakMemoryUsage / 1024 / 1024)?.toFixed(2) || 'N/A'}MB`);

    expect(result.userSuccessRate).toBeGreaterThan(85); // 85% success rate at high load
    expect(result.throughputAnalysis.requestsPerSecond).toBeGreaterThan(50);
    
    if (result.resourceAnalysis) {
      expect(result.resourceAnalysis.peakMemoryUsage).toBeLessThan(2 * 1024 * 1024 * 1024); // Less than 2GB
    }
  });

  test('Load Test: 750 Concurrent Users - Stress Test', async () => {
    const result = await runLoadTestScenario(
      '750 Concurrent Users Stress Test',
      750,
      90000, // 1.5 minute ramp-up
      240000 // 4 minute test duration
    );

    console.log('📊 750 User Stress Test Results:');
    console.log(`  Success Rate: ${result.userSuccessRate.toFixed(2)}%`);
    console.log(`  Throughput: ${result.throughputAnalysis.requestsPerSecond.toFixed(2)} req/sec`);
    console.log(`  P95 Response Time: ${result.responseTimeAnalysis?.p95?.toFixed(2) || 'N/A'}ms`);
    console.log(`  P99 Response Time: ${result.responseTimeAnalysis?.p99?.toFixed(2) || 'N/A'}ms`);

    expect(result.userSuccessRate).toBeGreaterThan(80); // 80% success rate at stress level
    
    if (result.responseTimeAnalysis) {
      expect(result.responseTimeAnalysis.p99).toBeLessThan(performanceTargets.responseTimeP99);
    }
  });

  test('Load Test: 1000 Concurrent Users - Maximum Capacity', async () => {
    const result = await runLoadTestScenario(
      '1000 Concurrent Users Maximum Capacity',
      1000,
      120000, // 2 minute ramp-up
      180000 // 3 minute test duration
    );

    console.log('📊 1000 User Maximum Capacity Results:');
    console.log(`  Success Rate: ${result.userSuccessRate.toFixed(2)}%`);
    console.log(`  Throughput: ${result.throughputAnalysis.requestsPerSecond.toFixed(2)} req/sec`);
    console.log(`  P95 Response Time: ${result.responseTimeAnalysis?.p95?.toFixed(2) || 'N/A'}ms`);
    console.log(`  Total Requests: ${result.totalRequests}`);
    console.log(`  Total Errors: ${result.totalErrors}`);
    console.log(`  Error Rate: ${((result.totalErrors / result.totalRequests) * 100).toFixed(2)}%`);

    // More lenient expectations for maximum capacity test
    expect(result.userSuccessRate).toBeGreaterThan(70); // 70% success rate at max capacity
    expect(result.totalRequests).toBeGreaterThan(1000); // At least some requests completed

    const errorRate = (result.totalErrors / result.totalRequests) * 100;
    expect(errorRate).toBeLessThan(performanceTargets.errorRateThreshold * 2); // Allow 2x error rate at max load
  });

  test('Sustained Load Test: 400 Users for Extended Duration', async () => {
    const result = await runLoadTestScenario(
      '400 Users Sustained Load',
      400,
      60000, // 1 minute ramp-up
      600000 // 10 minute test duration
    );

    console.log('📊 Sustained Load Test Results:');
    console.log(`  Test Duration: ${(result.actualTestDuration / 60000).toFixed(2)} minutes`);
    console.log(`  Success Rate: ${result.userSuccessRate.toFixed(2)}%`);
    console.log(`  Throughput: ${result.throughputAnalysis.requestsPerSecond.toFixed(2)} req/sec`);
    console.log(`  Total Requests: ${result.totalRequests}`);

    // Check for memory leaks during sustained load
    const memoryGrowth = analyzeMemoryGrowthPattern();
    console.log(`  Memory Growth Pattern: ${memoryGrowth.pattern}`);
    console.log(`  Memory Growth Rate: ${(memoryGrowth.growthRate / 1024 / 1024).toFixed(2)}MB/min`);

    expect(result.userSuccessRate).toBeGreaterThan(85); // 85% success rate for sustained load
    expect(memoryGrowth.growthRate).toBeLessThan(performanceTargets.memoryLeakThreshold / 10); // Less than 20MB/min growth
  });

  test('Spike Load Test: Rapid User Increase', async () => {
    // Simulate sudden traffic spike
    console.log('🌪️  Starting Spike Load Test...');
    
    // Start with baseline load
    const baselinePromise = runLoadTestScenario(
      'Baseline Load Before Spike',
      50,
      15000, // 15 second ramp-up
      60000 // 1 minute duration
    );

    // Wait for baseline to stabilize
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Spike: rapidly add 400 more users
    const spikePromise = runLoadTestScenario(
      'Traffic Spike',
      400,
      10000, // 10 second rapid ramp-up (spike)
      90000 // 1.5 minute duration
    );

    const [baselineResult, spikeResult] = await Promise.all([baselinePromise, spikePromise]);

    console.log('📊 Spike Load Test Analysis:');
    console.log(`  Baseline Success Rate: ${baselineResult.userSuccessRate.toFixed(2)}%`);
    console.log(`  Spike Success Rate: ${spikeResult.userSuccessRate.toFixed(2)}%`);
    console.log(`  Performance Degradation: ${(baselineResult.userSuccessRate - spikeResult.userSuccessRate).toFixed(2)}%`);

    // System should handle spike gracefully (success rate shouldn't drop by more than 20%)
    const performanceDegradation = baselineResult.userSuccessRate - spikeResult.userSuccessRate;
    expect(performanceDegradation).toBeLessThan(20);
    expect(spikeResult.userSuccessRate).toBeGreaterThan(70);
  });

  const analyzeMemoryGrowthPattern = () => {
    if (testMetrics.resourceUtilization.length < 6) {
      return { pattern: 'insufficient_data', growthRate: 0 };
    }

    const snapshots = testMetrics.resourceUtilization.slice(-6); // Last 6 snapshots
    const memoryValues = snapshots.map(s => s.memory.heapUsed);
    const timeSpan = snapshots[snapshots.length - 1].timestamp - snapshots[0].timestamp;

    let growthCount = 0;
    for (let i = 1; i < memoryValues.length; i++) {
      if (memoryValues[i] > memoryValues[i-1]) {
        growthCount++;
      }
    }

    const growthPercentage = (growthCount / (memoryValues.length - 1)) * 100;
    const totalGrowth = memoryValues[memoryValues.length - 1] - memoryValues[0];
    const growthRate = totalGrowth / (timeSpan / 60000); // Growth per minute

    let pattern = 'stable';
    if (growthPercentage > 80) pattern = 'increasing';
    else if (growthPercentage < 20) pattern = 'decreasing';
    else if (growthPercentage > 60) pattern = 'mostly_increasing';

    return { pattern, growthRate, growthPercentage };
  };

  const findMaxConcurrentUsers = () => {
    if (testMetrics.resourceUtilization.length === 0) return 0;
    return Math.max(...testMetrics.resourceUtilization.map(s => s.activeUsers));
  };

  const calculateAverageResponseTime = () => {
    if (testMetrics.responseTimeDistribution.length === 0) return 0;
    return testMetrics.responseTimeDistribution
      .reduce((sum, r) => sum + r.responseTime, 0) / testMetrics.responseTimeDistribution.length;
  };

  const calculateResponseTimePercentiles = () => {
    if (testMetrics.responseTimeDistribution.length === 0) return null;

    const responseTimes = testMetrics.responseTimeDistribution
      .map(r => r.responseTime)
      .sort((a, b) => a - b);

    return {
      p50: responseTimes[Math.floor(responseTimes.length * 0.5)],
      p75: responseTimes[Math.floor(responseTimes.length * 0.75)],
      p90: responseTimes[Math.floor(responseTimes.length * 0.90)],
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)]
    };
  };

  const calculateOverallErrorRate = () => {
    const totalRequests = testMetrics.responseTimeDistribution.length;
    const totalErrors = testMetrics.errorPatterns.length;
    return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  };

  const calculateThroughputAnalysis = () => {
    if (testMetrics.loadTests.length === 0) return null;

    const throughputs = testMetrics.loadTests.map(test => test.throughputAnalysis.requestsPerSecond);
    return {
      maxThroughput: Math.max(...throughputs),
      averageThroughput: throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length,
      minThroughput: Math.min(...throughputs)
    };
  };

  const findPeakResourceUsage = () => {
    if (testMetrics.resourceUtilization.length === 0) return null;

    return {
      peakMemory: Math.max(...testMetrics.resourceUtilization.map(s => s.memory.rss)),
      peakCpu: Math.max(...testMetrics.resourceUtilization.map(s => s.cpuUsage)),
      peakConnections: Math.max(...testMetrics.resourceUtilization.map(s => s.networkConnections))
    };
  };

  const evaluateLoadTestCompliance = () => {
    const responseTimePercentiles = calculateResponseTimePercentiles();
    const errorRate = calculateOverallErrorRate();
    const throughputAnalysis = calculateThroughputAnalysis();
    const peakResourceUsage = findPeakResourceUsage();

    const compliance = {
      responseTimeP95Compliant: responseTimePercentiles ? 
        responseTimePercentiles.p95 <= performanceTargets.responseTimeP95 : false,
      responseTimeP99Compliant: responseTimePercentiles ? 
        responseTimePercentiles.p99 <= performanceTargets.responseTimeP99 : false,
      errorRateCompliant: errorRate <= performanceTargets.errorRateThreshold,
      throughputCompliant: throughputAnalysis ? 
        throughputAnalysis.maxThroughput >= performanceTargets.throughputTarget : false,
      concurrentUserCompliant: findMaxConcurrentUsers() >= performanceTargets.concurrentUserSupport,
      resourceCompliant: peakResourceUsage ? 
        (peakResourceUsage.peakMemory < 2 * 1024 * 1024 * 1024) : false // Less than 2GB
    };

    const complianceCount = Object.values(compliance).filter(c => c).length;
    compliance.overallCompliant = complianceCount >= 4; // At least 4 out of 6 criteria met
    compliance.complianceScore = (complianceCount / Object.keys(compliance).length) * 100;

    return compliance;
  };

  const generateLoadTestReport = (summary) => {
    const report = {
      timestamp: new Date().toISOString(),
      summary,
      performanceTargets,
      loadTestResults: testMetrics.loadTests,
      responseTimeAnalysis: {
        distribution: testMetrics.responseTimeDistribution,
        percentiles: calculateResponseTimePercentiles()
      },
      errorAnalysis: {
        patterns: testMetrics.errorPatterns,
        overallErrorRate: calculateOverallErrorRate()
      },
      resourceUtilization: testMetrics.resourceUtilization,
      userSessionAnalysis: analyzeUserSessions(),
      recommendations: generateLoadTestRecommendations(summary)
    };

    const reportPath = path.join(__dirname, '../reports', 'high-concurrency-load-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate CSV data for external analysis
    generateLoadTestCSV();

    console.log(`📄 High Concurrency Load Test Report saved to: ${reportPath}`);
  };

  const analyzeUserSessions = () => {
    const completedSessions = testMetrics.userSessions.filter(s => s.status === 'completed');
    
    if (completedSessions.length === 0) return null;

    return {
      totalSessions: testMetrics.userSessions.length,
      completedSessions: completedSessions.length,
      averageSessionDuration: completedSessions.reduce((sum, s) => sum + s.duration, 0) / completedSessions.length,
      averageRequestsPerSession: completedSessions.reduce((sum, s) => sum + s.requestCount, 0) / completedSessions.length,
      averageErrorsPerSession: completedSessions.reduce((sum, s) => sum + s.errorCount, 0) / completedSessions.length,
      sessionSuccessRate: (completedSessions.length / testMetrics.userSessions.length) * 100
    };
  };

  const generateLoadTestCSV = () => {
    const csvData = testMetrics.responseTimeDistribution.map(entry => ({
      timestamp: new Date(entry.timestamp).toISOString(),
      userId: entry.userId,
      userType: entry.userType,
      endpoint: entry.endpoint,
      responseTime: entry.responseTime,
      statusCode: entry.statusCode
    }));

    const csvHeader = Object.keys(csvData[0] || {}).join(',');
    const csvRows = csvData.map(row => Object.values(row).join(','));
    const csvContent = [csvHeader, ...csvRows].join('\n');

    const csvPath = path.join(__dirname, '../reports', 'load-test-response-times.csv');
    fs.writeFileSync(csvPath, csvContent);

    console.log(`📊 Load Test CSV Data saved to: ${csvPath}`);
  };

  const generateLoadTestRecommendations = (summary) => {
    const recommendations = [];

    // Response time analysis
    if (summary.responseTimePercentiles && summary.responseTimePercentiles.p95 > performanceTargets.responseTimeP95) {
      recommendations.push({
        type: 'response_time',
        priority: 'high',
        message: `P95 response time (${summary.responseTimePercentiles.p95.toFixed(2)}ms) exceeds target (${performanceTargets.responseTimeP95}ms)`
      });
    }

    // Error rate analysis
    if (summary.errorRate > performanceTargets.errorRateThreshold) {
      recommendations.push({
        type: 'error_rate',
        priority: 'critical',
        message: `Error rate (${summary.errorRate.toFixed(2)}%) exceeds threshold (${performanceTargets.errorRateThreshold}%)`
      });
    }

    // Throughput analysis
    if (summary.throughputAnalysis && summary.throughputAnalysis.maxThroughput < performanceTargets.throughputTarget) {
      recommendations.push({
        type: 'throughput',
        priority: 'high',
        message: `Maximum throughput (${summary.throughputAnalysis.maxThroughput.toFixed(2)} req/sec) below target (${performanceTargets.throughputTarget} req/sec)`
      });
    }

    // Concurrent user support
    if (summary.maxConcurrentUsers < performanceTargets.concurrentUserSupport) {
      recommendations.push({
        type: 'concurrency',
        priority: 'medium',
        message: `Maximum concurrent users (${summary.maxConcurrentUsers}) below target (${performanceTargets.concurrentUserSupport})`
      });
    }

    // Resource utilization
    if (summary.resourcePeakUsage && summary.resourcePeakUsage.peakMemory > performanceTargets.memoryLeakThreshold * 10) {
      recommendations.push({
        type: 'resource_usage',
        priority: 'high',
        message: `Peak memory usage indicates potential memory issues`
      });
    }

    // Overall compliance
    if (summary.targetCompliance && !summary.targetCompliance.overallCompliant) {
      recommendations.push({
        type: 'overall_performance',
        priority: 'high',
        message: `System fails to meet performance targets under high load (${summary.targetCompliance.complianceScore?.toFixed(1) || 'N/A'}% compliance)`
      });
    }

    return recommendations;
  };
});