const axios = require('axios');
const { EventEmitter } = require('events');

describe('AI Model Load Testing', () => {
  let baseURL;
  let testMetrics;

  beforeAll(() => {
    baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
    testMetrics = {
      startTime: Date.now(),
      requests: [],
      errors: [],
      responseTimeStats: {
        min: Infinity,
        max: 0,
        sum: 0,
        count: 0
      }
    };
  });

  afterAll(() => {
    const duration = Date.now() - testMetrics.startTime;
    const avgResponseTime = testMetrics.responseTimeStats.sum / testMetrics.responseTimeStats.count;
    
    const summary = {
      testDuration: duration,
      totalRequests: testMetrics.requests.length,
      errorCount: testMetrics.errors.length,
      errorRate: (testMetrics.errors.length / testMetrics.requests.length * 100).toFixed(2),
      averageResponseTime: avgResponseTime.toFixed(2),
      minResponseTime: testMetrics.responseTimeStats.min,
      maxResponseTime: testMetrics.responseTimeStats.max,
      requestsPerSecond: (testMetrics.requests.length / (duration / 1000)).toFixed(2)
    };
    
    console.log('🚀 AI Model Load Test Summary:', summary);
    global.performanceUtils.saveMetrics('ai-model-load-test', summary);
  });

  const makeModelRequest = async (modelType, requestData, index = 0) => {
    const startTime = performance.now();
    
    try {
      const response = await axios.post(`${baseURL}/api/ai/models/${modelType}/predict`, {
        ...requestData,
        requestId: `load-test-${index}-${Date.now()}`
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Type': 'load-test'
        }
      });
      
      const duration = performance.now() - startTime;
      
      testMetrics.requests.push({
        index,
        modelType,
        duration,
        status: response.status,
        timestamp: Date.now()
      });
      
      // Update response time statistics
      testMetrics.responseTimeStats.min = Math.min(testMetrics.responseTimeStats.min, duration);
      testMetrics.responseTimeStats.max = Math.max(testMetrics.responseTimeStats.max, duration);
      testMetrics.responseTimeStats.sum += duration;
      testMetrics.responseTimeStats.count++;
      
      return response.data;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      testMetrics.errors.push({
        index,
        modelType,
        duration,
        error: error.message,
        status: error.response?.status || 'network_error',
        timestamp: Date.now()
      });
      
      throw error;
    }
  };

  test('Concurrent text generation model requests', async () => {
    const concurrentRequests = 50;
    const testData = {
      prompt: "Generate a comprehensive technical documentation for a REST API",
      maxTokens: 1000,
      temperature: 0.7
    };

    console.log(`🚀 Starting ${concurrentRequests} concurrent text generation requests...`);
    
    const results = await global.performanceUtils.generateConcurrentRequests(
      (index) => makeModelRequest('text-generation', testData, index),
      concurrentRequests
    );

    const successfulRequests = results.filter(result => !result.error);
    const failedRequests = results.filter(result => result.error);

    console.log(`✅ Successful requests: ${successfulRequests.length}`);
    console.log(`❌ Failed requests: ${failedRequests.length}`);

    // Assert that at least 80% of requests succeed
    expect(successfulRequests.length / results.length).toBeGreaterThanOrEqual(0.8);
    
    // Assert average response time is under threshold
    if (testMetrics.responseTimeStats.count > 0) {
      const avgResponseTime = testMetrics.responseTimeStats.sum / testMetrics.responseTimeStats.count;
      expect(avgResponseTime).toBeLessThan(10000); // 10 seconds max average
    }
  });

  test('Concurrent code analysis model requests', async () => {
    const concurrentRequests = 30;
    const testData = {
      code: `
        function fibonacci(n) {
          if (n <= 1) return n;
          return fibonacci(n - 1) + fibonacci(n - 2);
        }
        
        const result = fibonacci(10);
        console.log(result);
      `,
      analysisType: 'performance',
      language: 'javascript'
    };

    console.log(`🔍 Starting ${concurrentRequests} concurrent code analysis requests...`);
    
    const results = await global.performanceUtils.generateConcurrentRequests(
      (index) => makeModelRequest('code-analysis', testData, index),
      concurrentRequests
    );

    const successfulRequests = results.filter(result => !result.error);
    expect(successfulRequests.length).toBeGreaterThan(concurrentRequests * 0.75);
  });

  test('Mixed model type load test', async () => {
    const modelTypes = ['text-generation', 'code-analysis', 'code-completion', 'documentation'];
    const requestsPerType = 20;
    
    const testPromises = [];
    
    for (const modelType of modelTypes) {
      const testData = getTestDataForModel(modelType);
      
      for (let i = 0; i < requestsPerType; i++) {
        testPromises.push(
          makeModelRequest(modelType, testData, `${modelType}-${i}`)
            .catch(error => ({ error, modelType, index: i }))
        );
      }
    }

    console.log(`🔄 Starting mixed load test with ${testPromises.length} requests across ${modelTypes.length} model types...`);
    
    const results = await Promise.all(testPromises);
    const successfulRequests = results.filter(result => !result.error);
    
    console.log(`📊 Mixed load test results: ${successfulRequests.length}/${results.length} successful`);
    
    // Group results by model type
    const resultsByType = {};
    results.forEach(result => {
      const type = result.error ? result.modelType : 'success';
      if (!resultsByType[type]) resultsByType[type] = 0;
      resultsByType[type]++;
    });
    
    console.log('📈 Results by model type:', resultsByType);
    
    expect(successfulRequests.length).toBeGreaterThan(results.length * 0.7);
  });

  test('Sustained load test - 5 minutes', async () => {
    const testDuration = 5 * 60 * 1000; // 5 minutes
    const requestInterval = 1000; // 1 second between requests
    const startTime = Date.now();
    
    console.log('⏳ Starting 5-minute sustained load test...');
    
    const sustainedMetrics = {
      totalRequests: 0,
      errors: 0,
      responseTimes: []
    };
    
    while (Date.now() - startTime < testDuration) {
      try {
        const { duration } = await global.performanceUtils.measureTime(
          () => makeModelRequest('text-generation', {
            prompt: `Sustained load test request at ${new Date().toISOString()}`,
            maxTokens: 100
          }),
          `Request ${sustainedMetrics.totalRequests + 1}`
        );
        
        sustainedMetrics.totalRequests++;
        sustainedMetrics.responseTimes.push(duration);
        
        // Check memory usage every 10 requests
        if (sustainedMetrics.totalRequests % 10 === 0) {
          global.performanceUtils.measureMemory(`Request ${sustainedMetrics.totalRequests}`);
        }
        
      } catch (error) {
        sustainedMetrics.errors++;
        console.log(`❌ Request failed: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, requestInterval));
    }
    
    const avgResponseTime = sustainedMetrics.responseTimes.reduce((a, b) => a + b, 0) / sustainedMetrics.responseTimes.length;
    const errorRate = (sustainedMetrics.errors / sustainedMetrics.totalRequests) * 100;
    
    console.log(`📊 Sustained Load Test Results:
      - Total Requests: ${sustainedMetrics.totalRequests}
      - Errors: ${sustainedMetrics.errors} (${errorRate.toFixed(2)}%)
      - Average Response Time: ${avgResponseTime.toFixed(2)}ms
      - Duration: ${((Date.now() - startTime) / 1000 / 60).toFixed(2)} minutes`);
    
    // Assert performance criteria
    expect(errorRate).toBeLessThan(10); // Less than 10% error rate
    expect(avgResponseTime).toBeLessThan(5000); // Less than 5 seconds average
  });

  function getTestDataForModel(modelType) {
    const testData = {
      'text-generation': {
        prompt: "Write a brief technical summary",
        maxTokens: 200,
        temperature: 0.5
      },
      'code-analysis': {
        code: "const x = 1; const y = 2; console.log(x + y);",
        analysisType: 'quality',
        language: 'javascript'
      },
      'code-completion': {
        code: "function add(a, b) {",
        language: 'javascript',
        maxSuggestions: 3
      },
      'documentation': {
        code: "class UserService { constructor() {} getUser(id) {} }",
        language: 'javascript',
        style: 'jsdoc'
      }
    };
    
    return testData[modelType] || testData['text-generation'];
  }
});