const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

describe('OpenRouter API Performance Benchmarks', () => {
  let testMetrics;
  let apiClient;
  let performanceTargets;

  beforeAll(() => {
    testMetrics = {
      startTime: Date.now(),
      benchmarks: [],
      apiCalls: [],
      errors: [],
      modelPerformance: {}
    };

    // Performance targets from changelog (95th percentile)
    performanceTargets = {
      simpleCodeGeneration: 2000, // 2 seconds
      complexSystemDesign: 8000, // 8 seconds
      codeAnalysisReview: 5000, // 5 seconds
      multiAgentCoordination: 15000, // 15 seconds
      teamDiscussionSimulation: 12000 // 12 seconds
    };

    apiClient = axios.create({
      baseURL: process.env.OPENROUTER_API_BASE_URL || 'https://openrouter.ai/api/v1',
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || 'test-key'}`,
        'HTTP-Referer': 'https://autodev-ai.github.io',
        'X-Title': 'AutoDev-AI Performance Test',
        'Content-Type': 'application/json'
      }
    });

    console.log('🚀 Starting OpenRouter API Performance Benchmarks...');
    console.log('📊 Performance Targets (95th percentile):', performanceTargets);
  });

  afterAll(() => {
    const summary = {
      testDuration: Date.now() - testMetrics.startTime,
      totalBenchmarks: testMetrics.benchmarks.length,
      totalApiCalls: testMetrics.apiCalls.length,
      errorCount: testMetrics.errors.length,
      errorRate: (testMetrics.errors.length / testMetrics.apiCalls.length * 100).toFixed(2),
      averageResponseTime: calculateAverageResponseTime(),
      targetCompliance: calculateTargetCompliance(),
      modelPerformance: testMetrics.modelPerformance
    };

    console.log('🏆 OpenRouter API Performance Summary:', summary);
    global.performanceUtils.saveMetrics('openrouter-api-benchmarks', {
      summary,
      detailedMetrics: testMetrics,
      performanceTargets
    });

    generatePerformanceReport(summary);
  });

  const makeApiCall = async (model, prompt, options = {}) => {
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage();

    try {
      const requestData = {
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0,
        stream: false,
        ...options.additionalParams
      };

      const response = await apiClient.post('/chat/completions', requestData);
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      const memoryAfter = process.memoryUsage();

      const apiCall = {
        model,
        responseTime,
        tokensUsed: response.data.usage?.total_tokens || 0,
        promptTokens: response.data.usage?.prompt_tokens || 0,
        completionTokens: response.data.usage?.completion_tokens || 0,
        tokensPerSecond: response.data.usage?.completion_tokens ? 
          (response.data.usage.completion_tokens / (responseTime / 1000)) : 0,
        memoryDelta: memoryAfter.heapUsed - memoryBefore.heapUsed,
        statusCode: response.status,
        timestamp: Date.now(),
        success: true,
        content: response.data.choices[0]?.message?.content || '',
        finishReason: response.data.choices[0]?.finish_reason
      };

      testMetrics.apiCalls.push(apiCall);

      // Track model-specific performance
      if (!testMetrics.modelPerformance[model]) {
        testMetrics.modelPerformance[model] = {
          calls: [],
          averageResponseTime: 0,
          averageTokensPerSecond: 0,
          totalTokens: 0,
          successRate: 100
        };
      }

      testMetrics.modelPerformance[model].calls.push(apiCall);
      updateModelStats(model);

      return apiCall;
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const errorCall = {
        model,
        responseTime,
        error: error.message,
        statusCode: error.response?.status || 0,
        timestamp: Date.now(),
        success: false
      };

      testMetrics.errors.push(errorCall);
      testMetrics.apiCalls.push(errorCall);

      if (!testMetrics.modelPerformance[model]) {
        testMetrics.modelPerformance[model] = {
          calls: [],
          averageResponseTime: 0,
          averageTokensPerSecond: 0,
          totalTokens: 0,
          successRate: 100
        };
      }

      testMetrics.modelPerformance[model].calls.push(errorCall);
      updateModelStats(model);

      throw error;
    }
  };

  const updateModelStats = (model) => {
    const modelData = testMetrics.modelPerformance[model];
    const successfulCalls = modelData.calls.filter(call => call.success);
    
    if (successfulCalls.length > 0) {
      modelData.averageResponseTime = successfulCalls.reduce((sum, call) => sum + call.responseTime, 0) / successfulCalls.length;
      modelData.averageTokensPerSecond = successfulCalls.reduce((sum, call) => sum + (call.tokensPerSecond || 0), 0) / successfulCalls.length;
      modelData.totalTokens = successfulCalls.reduce((sum, call) => sum + (call.tokensUsed || 0), 0);
    }

    modelData.successRate = (successfulCalls.length / modelData.calls.length) * 100;
  };

  const runBenchmark = async (name, testFunction, expectedTime) => {
    console.log(`🏃 Running benchmark: ${name}`);
    const startTime = performance.now();

    try {
      const result = await testFunction();
      const duration = performance.now() - startTime;

      const benchmark = {
        name,
        duration,
        result,
        expectedTime,
        withinTarget: duration <= expectedTime,
        overheadPercentage: ((duration - expectedTime) / expectedTime) * 100,
        timestamp: Date.now(),
        status: 'completed'
      };

      testMetrics.benchmarks.push(benchmark);

      const targetStatus = benchmark.withinTarget ? '✅ PASS' : '❌ FAIL';
      const overheadInfo = benchmark.withinTarget ? '' : ` (${benchmark.overheadPercentage.toFixed(1)}% over target)`;
      
      console.log(`${targetStatus} ${name}: ${duration.toFixed(2)}ms${overheadInfo}`);

      return benchmark;
    } catch (error) {
      const duration = performance.now() - startTime;

      const benchmark = {
        name,
        duration,
        error: error.message,
        expectedTime,
        withinTarget: false,
        timestamp: Date.now(),
        status: 'failed'
      };

      testMetrics.benchmarks.push(benchmark);
      console.log(`❌ FAILED ${name}: ${error.message}`);

      return benchmark;
    }
  };

  test('Simple Code Generation Performance - Claude 3.5 Sonnet', async () => {
    await runBenchmark('Simple Code Generation - Claude 3.5 Sonnet', async () => {
      const prompt = `Write a simple JavaScript function that calculates the factorial of a number. Include error handling for invalid inputs.`;
      
      const result = await makeApiCall('anthropic/claude-3.5-sonnet', prompt, {
        maxTokens: 500,
        temperature: 0.3
      });

      return {
        responseTime: result.responseTime,
        tokensGenerated: result.completionTokens,
        tokensPerSecond: result.tokensPerSecond,
        codeGenerated: result.content.length > 0
      };
    }, performanceTargets.simpleCodeGeneration);
  });

  test('Simple Code Generation Performance - GPT-4 Turbo', async () => {
    await runBenchmark('Simple Code Generation - GPT-4 Turbo', async () => {
      const prompt = `Create a Python class for a simple to-do list manager with methods to add, remove, and list tasks.`;
      
      const result = await makeApiCall('openai/gpt-4-turbo', prompt, {
        maxTokens: 600,
        temperature: 0.2
      });

      return {
        responseTime: result.responseTime,
        tokensGenerated: result.completionTokens,
        tokensPerSecond: result.tokensPerSecond,
        codeGenerated: result.content.includes('class')
      };
    }, performanceTargets.simpleCodeGeneration);
  });

  test('Code Analysis and Review Performance', async () => {
    await runBenchmark('Code Analysis and Review', async () => {
      const codeToAnalyze = `
        function processUserData(users) {
          var result = [];
          for (var i = 0; i < users.length; i++) {
            if (users[i].age > 18) {
              result.push({
                name: users[i].name.toUpperCase(),
                email: users[i].email,
                category: users[i].age > 65 ? 'senior' : 'adult'
              });
            }
          }
          return result;
        }
      `;

      const prompt = `Analyze this JavaScript code for potential improvements, bugs, and best practices. Provide specific recommendations:

${codeToAnalyze}

Please review for:
1. Performance optimizations
2. Code style and readability
3. Potential bugs or edge cases
4. Modern JavaScript features that could be used
5. Error handling improvements`;

      const result = await makeApiCall('anthropic/claude-3.5-sonnet', prompt, {
        maxTokens: 1000,
        temperature: 0.1
      });

      return {
        responseTime: result.responseTime,
        analysisProvided: result.content.length > 500,
        containsRecommendations: result.content.toLowerCase().includes('recommend'),
        tokensPerSecond: result.tokensPerSecond
      };
    }, performanceTargets.codeAnalysisReview);
  });

  test('Complex System Design Performance', async () => {
    await runBenchmark('Complex System Design', async () => {
      const prompt = `Design a scalable microservices architecture for an e-commerce platform that needs to handle:
      
- 10,000+ concurrent users
- Product catalog with 1M+ items
- Real-time inventory management
- Payment processing
- Order fulfillment
- User recommendations
- Analytics and reporting

Include:
1. Service decomposition strategy
2. Database design and data partitioning
3. API gateway configuration
4. Caching layers
5. Message queuing systems
6. Monitoring and observability
7. Deployment and scaling strategies
8. Security considerations

Provide architectural diagrams in text format and detailed implementation notes.`;

      const result = await makeApiCall('anthropic/claude-3.5-sonnet', prompt, {
        maxTokens: 2500,
        temperature: 0.4
      });

      return {
        responseTime: result.responseTime,
        tokensGenerated: result.completionTokens,
        comprehensiveDesign: result.content.length > 2000,
        includesArchitecture: result.content.toLowerCase().includes('architecture'),
        includesDatabase: result.content.toLowerCase().includes('database'),
        tokensPerSecond: result.tokensPerSecond
      };
    }, performanceTargets.complexSystemDesign);
  });

  test('Multi-Model Performance Comparison', async () => {
    const models = [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4-turbo',
      'openai/gpt-3.5-turbo',
      'google/palm-2-codechat-bison'
    ];

    const testPrompt = `Write a REST API endpoint in Node.js with Express that handles user authentication using JWT tokens. Include input validation, error handling, and basic security measures.`;

    const modelResults = [];

    for (const model of models) {
      try {
        console.log(`🧪 Testing model: ${model}`);
        const result = await makeApiCall(model, testPrompt, {
          maxTokens: 800,
          temperature: 0.3
        });

        modelResults.push({
          model,
          responseTime: result.responseTime,
          tokensPerSecond: result.tokensPerSecond,
          tokensGenerated: result.completionTokens,
          success: true
        });

        // Brief pause between model calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        modelResults.push({
          model,
          error: error.message,
          success: false
        });
      }
    }

    const successfulResults = modelResults.filter(r => r.success);
    const fastestModel = successfulResults.reduce((fastest, current) => 
      current.responseTime < fastest.responseTime ? current : fastest
    );

    console.log('📊 Multi-Model Performance Results:');
    modelResults.forEach(result => {
      if (result.success) {
        console.log(`  ${result.model}: ${result.responseTime.toFixed(2)}ms (${result.tokensPerSecond.toFixed(1)} tok/sec)`);
      } else {
        console.log(`  ${result.model}: FAILED - ${result.error}`);
      }
    });

    console.log(`🏆 Fastest Model: ${fastestModel.model} (${fastestModel.responseTime.toFixed(2)}ms)`);

    const benchmark = {
      name: 'Multi-Model Performance Comparison',
      results: modelResults,
      fastestModel: fastestModel,
      successfulModels: successfulResults.length,
      totalModels: models.length
    };

    testMetrics.benchmarks.push(benchmark);

    expect(successfulResults.length).toBeGreaterThan(0);
    expect(fastestModel.responseTime).toBeLessThan(performanceTargets.simpleCodeGeneration);
  });

  test('Concurrent API Call Performance', async () => {
    await runBenchmark('Concurrent API Calls', async () => {
      const concurrentCalls = 10;
      const prompt = 'Write a simple "Hello World" program in Python.';

      console.log(`🚀 Making ${concurrentCalls} concurrent API calls...`);

      const promises = Array(concurrentCalls).fill(null).map((_, index) => 
        makeApiCall('openai/gpt-3.5-turbo', `${prompt} (Request ${index + 1})`, {
          maxTokens: 100,
          temperature: 0.1
        }).catch(error => ({ error: error.message, index }))
      );

      const results = await Promise.all(promises);
      const successful = results.filter(r => !r.error);
      const failed = results.filter(r => r.error);

      const averageResponseTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
      const totalTokens = successful.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);

      return {
        totalCalls: concurrentCalls,
        successful: successful.length,
        failed: failed.length,
        successRate: (successful.length / concurrentCalls) * 100,
        averageResponseTime,
        totalTokens,
        concurrentPerformance: averageResponseTime < performanceTargets.simpleCodeGeneration * 1.5 // Allow 50% overhead for concurrency
      };
    }, performanceTargets.simpleCodeGeneration * 1.5);
  });

  test('Token Efficiency and Cost Analysis', async () => {
    const testCases = [
      {
        name: 'Short Code Generation',
        prompt: 'Write a function to reverse a string.',
        expectedTokens: 100
      },
      {
        name: 'Medium Complexity Task',
        prompt: 'Create a React component with state management for a counter with increment/decrement buttons.',
        expectedTokens: 300
      },
      {
        name: 'Complex Algorithm',
        prompt: 'Implement a binary search tree with insert, delete, and search operations, including proper error handling and edge cases.',
        expectedTokens: 600
      }
    ];

    const tokenEfficiencyResults = [];

    for (const testCase of testCases) {
      try {
        const result = await makeApiCall('anthropic/claude-3.5-sonnet', testCase.prompt, {
          maxTokens: testCase.expectedTokens + 200,
          temperature: 0.2
        });

        const efficiency = {
          name: testCase.name,
          expectedTokens: testCase.expectedTokens,
          actualTokens: result.tokensUsed,
          efficiency: (testCase.expectedTokens / result.tokensUsed) * 100,
          responseTime: result.responseTime,
          tokensPerSecond: result.tokensPerSecond,
          costEfficient: result.tokensUsed <= testCase.expectedTokens * 1.5
        };

        tokenEfficiencyResults.push(efficiency);
        console.log(`💰 ${testCase.name}: ${result.tokensUsed} tokens (${efficiency.efficiency.toFixed(1)}% efficiency)`);

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        tokenEfficiencyResults.push({
          name: testCase.name,
          error: error.message,
          costEfficient: false
        });
      }
    }

    const avgEfficiency = tokenEfficiencyResults
      .filter(r => !r.error)
      .reduce((sum, r) => sum + r.efficiency, 0) / tokenEfficiencyResults.filter(r => !r.error).length;

    const benchmark = {
      name: 'Token Efficiency Analysis',
      results: tokenEfficiencyResults,
      averageEfficiency: avgEfficiency,
      overallCostEfficient: avgEfficiency > 70
    };

    testMetrics.benchmarks.push(benchmark);

    expect(avgEfficiency).toBeGreaterThan(50); // At least 50% token efficiency
  });

  test('Error Recovery and Retry Performance', async () => {
    await runBenchmark('Error Recovery and Retry', async () => {
      const maxRetries = 3;
      let attempts = 0;
      let finalResult = null;
      const retryDelays = [];

      const attemptApiCall = async () => {
        attempts++;
        
        try {
          // Simulate potential failure by using an edge case prompt
          const result = await makeApiCall('openai/gpt-4-turbo', 
            'Generate a very long and detailed explanation of quantum computing', {
            maxTokens: 50, // Intentionally low to potentially cause truncation issues
            temperature: 0.8
          });
          
          return result;
        } catch (error) {
          if (attempts < maxRetries) {
            const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
            retryDelays.push(delay);
            console.log(`🔄 Retry attempt ${attempts} failed, waiting ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return attemptApiCall();
          }
          throw error;
        }
      };

      try {
        finalResult = await attemptApiCall();
      } catch (error) {
        // If all retries fail, that's still valid data for the benchmark
        finalResult = { error: error.message };
      }

      return {
        totalAttempts: attempts,
        retryDelays,
        successful: !finalResult.error,
        finalResponseTime: finalResult.responseTime || 0,
        recoveryStrategy: 'exponential_backoff'
      };
    }, performanceTargets.simpleCodeGeneration * 3); // Allow extra time for retries
  });

  const calculateAverageResponseTime = () => {
    const successfulCalls = testMetrics.apiCalls.filter(call => call.success);
    return successfulCalls.length > 0 
      ? successfulCalls.reduce((sum, call) => sum + call.responseTime, 0) / successfulCalls.length
      : 0;
  };

  const calculateTargetCompliance = () => {
    const completedBenchmarks = testMetrics.benchmarks.filter(b => b.status === 'completed');
    const withinTargetBenchmarks = completedBenchmarks.filter(b => b.withinTarget);
    
    return {
      totalBenchmarks: completedBenchmarks.length,
      withinTarget: withinTargetBenchmarks.length,
      complianceRate: completedBenchmarks.length > 0 
        ? (withinTargetBenchmarks.length / completedBenchmarks.length) * 100
        : 0
    };
  };

  const generatePerformanceReport = (summary) => {
    const report = {
      timestamp: new Date().toISOString(),
      summary,
      performanceTargets,
      benchmarkResults: testMetrics.benchmarks,
      modelComparison: testMetrics.modelPerformance,
      recommendations: generateRecommendations(summary)
    };

    const reportPath = path.join(__dirname, '../reports', 'openrouter-api-performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📄 OpenRouter API Performance Report saved to: ${reportPath}`);
  };

  const generateRecommendations = (summary) => {
    const recommendations = [];

    // Check overall performance
    if (summary.targetCompliance.complianceRate < 80) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `Only ${summary.targetCompliance.complianceRate.toFixed(1)}% of benchmarks meet performance targets`
      });
    }

    // Check error rate
    if (parseFloat(summary.errorRate) > 5) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: `High error rate (${summary.errorRate}%) indicates API reliability issues`
      });
    }

    // Model-specific recommendations
    Object.entries(testMetrics.modelPerformance).forEach(([model, performance]) => {
      if (performance.averageResponseTime > performanceTargets.simpleCodeGeneration * 1.5) {
        recommendations.push({
          type: 'model_optimization',
          priority: 'medium',
          message: `Model ${model} has slow response times (${performance.averageResponseTime.toFixed(2)}ms avg)`
        });
      }

      if (performance.successRate < 95) {
        recommendations.push({
          type: 'model_reliability',
          priority: 'high',
          message: `Model ${model} has low success rate (${performance.successRate.toFixed(1)}%)`
        });
      }
    });

    return recommendations;
  };
});