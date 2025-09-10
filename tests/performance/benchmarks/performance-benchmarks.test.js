const { performance } = require('perf_hooks');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

describe('Performance Benchmarks', () => {
  let testMetrics;
  let benchmarkResults;

  beforeAll(() => {
    testMetrics = {
      startTime: Date.now(),
      benchmarks: [],
      comparisons: [],
      regressions: [],
      improvements: []
    };
    
    benchmarkResults = {
      aiModelPerformance: {},
      systemPerformance: {},
      networkPerformance: {},
      databasePerformance: {},
      resourceUtilization: {}
    };
    
    console.log('🏁 Starting comprehensive performance benchmark suite...');
  });

  afterAll(() => {
    const summary = {
      testDuration: Date.now() - testMetrics.startTime,
      totalBenchmarks: testMetrics.benchmarks.length,
      regressions: testMetrics.regressions.length,
      improvements: testMetrics.improvements.length,
      overallScore: calculateOverallPerformanceScore()
    };
    
    console.log('🏆 Performance Benchmark Summary:', summary);
    global.performanceUtils.saveMetrics('performance-benchmarks', {
      summary,
      detailedResults: benchmarkResults,
      testMetrics
    });
    
    // Generate benchmark report
    generateBenchmarkReport();
  });

  const calculateOverallPerformanceScore = () => {
    const scores = testMetrics.benchmarks
      .filter(b => b.score !== undefined)
      .map(b => b.score);
    
    return scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0;
  };

  const runBenchmark = async (name, testFunction, expectedRange = null) => {
    console.log(`🚀 Running benchmark: ${name}`);
    const startTime = performance.now();
    
    try {
      const result = await testFunction();
      const duration = performance.now() - startTime;
      
      let score = 100;
      if (expectedRange) {
        const { min, max } = expectedRange;
        if (result.value < min) {
          score = Math.max(0, 100 - ((min - result.value) / min) * 100);
        } else if (result.value > max) {
          score = Math.max(0, 100 - ((result.value - max) / max) * 100);
        }
      }
      
      const benchmark = {
        name,
        duration,
        result,
        score,
        timestamp: Date.now(),
        status: 'completed'
      };
      
      testMetrics.benchmarks.push(benchmark);
      console.log(`✅ ${name}: ${JSON.stringify(result)} (Score: ${score.toFixed(1)})`);
      
      return benchmark;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      const benchmark = {
        name,
        duration,
        error: error.message,
        score: 0,
        timestamp: Date.now(),
        status: 'failed'
      };
      
      testMetrics.benchmarks.push(benchmark);
      console.log(`❌ ${name}: Failed - ${error.message}`);
      
      return benchmark;
    }
  };

  test('AI Model Inference Benchmarks', async () => {
    console.log('🤖 Running AI model inference benchmarks...');
    
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
    
    // Text Generation Benchmark
    await runBenchmark('Text Generation - Small Prompt', async () => {
      const startTime = performance.now();
      const response = await axios.post(`${baseURL}/api/ai/models/text-generation/predict`, {
        prompt: 'Write a brief summary of machine learning',
        maxTokens: 100,
        temperature: 0.7
      }, {
        timeout: 30000,
        validateStatus: () => true
      });
      
      const duration = performance.now() - startTime;
      const tokensPerSecond = response.data?.tokens ? (response.data.tokens / (duration / 1000)) : 0;
      
      return {
        responseTime: duration,
        tokensGenerated: response.data?.tokens || 0,
        tokensPerSecond: tokensPerSecond,
        value: duration // For scoring
      };
    }, { min: 500, max: 5000 }); // 500ms to 5s expected range
    
    // Text Generation - Large Prompt
    await runBenchmark('Text Generation - Large Prompt', async () => {
      const largePrompt = 'Explain in detail the architecture of modern neural networks, ' +
        'including attention mechanisms, transformer models, and their applications in ' +
        'natural language processing. Discuss the training process and optimization techniques.';
      
      const startTime = performance.now();
      const response = await axios.post(`${baseURL}/api/ai/models/text-generation/predict`, {
        prompt: largePrompt,
        maxTokens: 500,
        temperature: 0.7
      }, {
        timeout: 60000,
        validateStatus: () => true
      });
      
      const duration = performance.now() - startTime;
      const tokensPerSecond = response.data?.tokens ? (response.data.tokens / (duration / 1000)) : 0;
      
      return {
        responseTime: duration,
        tokensGenerated: response.data?.tokens || 0,
        tokensPerSecond: tokensPerSecond,
        value: duration
      };
    }, { min: 2000, max: 15000 });
    
    // Code Analysis Benchmark
    await runBenchmark('Code Analysis Performance', async () => {
      const complexCode = `
        class DatabaseConnection {
          constructor(config) {
            this.config = config;
            this.pool = null;
            this.cache = new Map();
          }
          
          async connect() {
            try {
              this.pool = await createPool(this.config);
              return true;
            } catch (error) {
              console.error('Connection failed:', error);
              return false;
            }
          }
          
          async query(sql, params = []) {
            const cacheKey = sql + JSON.stringify(params);
            if (this.cache.has(cacheKey)) {
              return this.cache.get(cacheKey);
            }
            
            const result = await this.pool.query(sql, params);
            this.cache.set(cacheKey, result);
            return result;
          }
        }
      `;
      
      const startTime = performance.now();
      const response = await axios.post(`${baseURL}/api/ai/models/code-analysis/analyze`, {
        code: complexCode,
        language: 'javascript',
        analysisType: 'comprehensive'
      }, {
        timeout: 30000,
        validateStatus: () => true
      });
      
      const duration = performance.now() - startTime;
      
      return {
        responseTime: duration,
        analysisComplete: response.status < 400,
        linesAnalyzed: complexCode.split('\n').length,
        value: duration
      };
    }, { min: 1000, max: 8000 });
    
    benchmarkResults.aiModelPerformance = {
      textGeneration: testMetrics.benchmarks.filter(b => b.name.includes('Text Generation')),
      codeAnalysis: testMetrics.benchmarks.filter(b => b.name.includes('Code Analysis'))
    };
  });

  test('System Resource Benchmarks', async () => {
    console.log('⚡ Running system resource benchmarks...');
    
    // CPU Intensive Benchmark
    await runBenchmark('CPU Intensive Operations', async () => {
      const iterations = 1000000;
      const startTime = performance.now();
      
      let result = 0;
      for (let i = 0; i < iterations; i++) {
        result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
      }
      
      const duration = performance.now() - startTime;
      const operationsPerSecond = iterations / (duration / 1000);
      
      return {
        duration,
        iterations,
        operationsPerSecond,
        result: result.toFixed(2),
        value: operationsPerSecond // Higher is better
      };
    }, { min: 100000, max: 1000000 });
    
    // Memory Allocation Benchmark
    await runBenchmark('Memory Allocation Performance', async () => {
      const startTime = performance.now();
      const memoryBefore = process.memoryUsage();
      
      const arrays = [];
      const arrayCount = 10000;
      const arraySize = 1000;
      
      for (let i = 0; i < arrayCount; i++) {
        arrays.push(new Array(arraySize).fill(Math.random()));
      }
      
      const allocationDuration = performance.now() - startTime;
      const memoryAfter = process.memoryUsage();
      
      // Clean up
      arrays.length = 0;
      if (global.gc) global.gc();
      
      const cleanupTime = performance.now();
      const memoryDelta = memoryAfter.heapUsed - memoryBefore.heapUsed;
      
      return {
        allocationDuration,
        cleanupDuration: cleanupTime - startTime - allocationDuration,
        memoryAllocated: memoryDelta,
        arraysCreated: arrayCount,
        allocationRate: arrayCount / (allocationDuration / 1000),
        value: allocationDuration // Lower is better
      };
    }, { min: 50, max: 500 });
    
    // File I/O Benchmark
    await runBenchmark('File I/O Performance', async () => {
      const testDir = path.join(__dirname, '../temp-benchmark');
      const fileCount = 100;
      const fileSize = 1024; // 1KB files
      
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      
      const testData = 'x'.repeat(fileSize);
      
      // Write benchmark
      const writeStartTime = performance.now();
      for (let i = 0; i < fileCount; i++) {
        const filePath = path.join(testDir, `test-${i}.txt`);
        fs.writeFileSync(filePath, testData);
      }
      const writeDuration = performance.now() - writeStartTime;
      
      // Read benchmark
      const readStartTime = performance.now();
      for (let i = 0; i < fileCount; i++) {
        const filePath = path.join(testDir, `test-${i}.txt`);
        fs.readFileSync(filePath);
      }
      const readDuration = performance.now() - readStartTime;
      
      // Cleanup
      for (let i = 0; i < fileCount; i++) {
        const filePath = path.join(testDir, `test-${i}.txt`);
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      
      try {
        fs.rmdirSync(testDir);
      } catch (error) {
        // Ignore directory removal errors
      }
      
      const totalDuration = writeDuration + readDuration;
      const throughput = (fileCount * fileSize * 2) / (totalDuration / 1000); // bytes per second
      
      return {
        writeDuration,
        readDuration,
        totalDuration,
        fileCount,
        throughput,
        writeRate: fileCount / (writeDuration / 1000),
        readRate: fileCount / (readDuration / 1000),
        value: totalDuration // Lower is better
      };
    }, { min: 50, max: 1000 });
    
    benchmarkResults.systemPerformance = {
      cpu: testMetrics.benchmarks.filter(b => b.name.includes('CPU')),
      memory: testMetrics.benchmarks.filter(b => b.name.includes('Memory')),
      fileIO: testMetrics.benchmarks.filter(b => b.name.includes('File I/O'))
    };
  });

  test('Network Performance Benchmarks', async () => {
    console.log('🌐 Running network performance benchmarks...');
    
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
    
    // Latency Benchmark
    await runBenchmark('Network Latency Test', async () => {
      const measurements = [];
      const pingCount = 10;
      
      for (let i = 0; i < pingCount; i++) {
        const startTime = performance.now();
        try {
          await axios.get(`${baseURL}/api/health`, { timeout: 5000 });
          const latency = performance.now() - startTime;
          measurements.push(latency);
        } catch (error) {
          measurements.push(null);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const validMeasurements = measurements.filter(m => m !== null);
      const averageLatency = validMeasurements.length > 0 
        ? validMeasurements.reduce((a, b) => a + b, 0) / validMeasurements.length
        : Infinity;
      
      return {
        averageLatency,
        minLatency: Math.min(...validMeasurements),
        maxLatency: Math.max(...validMeasurements),
        successfulPings: validMeasurements.length,
        totalPings: pingCount,
        successRate: (validMeasurements.length / pingCount) * 100,
        value: averageLatency // Lower is better
      };
    }, { min: 1, max: 100 });
    
    // Throughput Benchmark
    await runBenchmark('Network Throughput Test', async () => {
      const concurrentRequests = 20;
      const requestsPerClient = 10;
      const startTime = performance.now();
      
      const clientPromises = Array(concurrentRequests).fill(null).map(async (_, clientIndex) => {
        const clientRequests = [];
        
        for (let i = 0; i < requestsPerClient; i++) {
          clientRequests.push(
            axios.get(`${baseURL}/api/health`, {
              timeout: 10000,
              validateStatus: () => true
            }).catch(error => ({ error: error.message }))
          );
        }
        
        return Promise.all(clientRequests);
      });
      
      const results = await Promise.all(clientPromises);
      const duration = performance.now() - startTime;
      
      const totalRequests = concurrentRequests * requestsPerClient;
      const successfulRequests = results.flat().filter(r => !r.error).length;
      const requestsPerSecond = totalRequests / (duration / 1000);
      
      return {
        duration,
        totalRequests,
        successfulRequests,
        failedRequests: totalRequests - successfulRequests,
        requestsPerSecond,
        successRate: (successfulRequests / totalRequests) * 100,
        value: requestsPerSecond // Higher is better
      };
    }, { min: 50, max: 500 });
    
    benchmarkResults.networkPerformance = {
      latency: testMetrics.benchmarks.filter(b => b.name.includes('Latency')),
      throughput: testMetrics.benchmarks.filter(b => b.name.includes('Throughput'))
    };
  });

  test('Docker Container Performance Benchmarks', async () => {
    console.log('🐳 Running Docker container performance benchmarks...');
    
    const Docker = require('dockerode');
    const docker = new Docker();
    
    // Container Creation Benchmark
    await runBenchmark('Container Creation Speed', async () => {
      const containerCount = 10;
      const creationTimes = [];
      const containers = [];
      
      for (let i = 0; i < containerCount; i++) {
        const startTime = performance.now();
        
        try {
          const container = await docker.createContainer({
            Image: 'node:18-alpine',
            Cmd: ['node', '-e', `console.log('Benchmark container ${i}'); process.exit(0);`]
          });
          
          const creationTime = performance.now() - startTime;
          creationTimes.push(creationTime);
          containers.push(container);
          
        } catch (error) {
          creationTimes.push(null);
        }
      }
      
      // Cleanup
      for (const container of containers) {
        try {
          await container.remove({ force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      
      const validTimes = creationTimes.filter(t => t !== null);
      const averageCreationTime = validTimes.length > 0
        ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length
        : Infinity;
      
      return {
        averageCreationTime,
        minCreationTime: Math.min(...validTimes),
        maxCreationTime: Math.max(...validTimes),
        successfulCreations: validTimes.length,
        totalAttempts: containerCount,
        successRate: (validTimes.length / containerCount) * 100,
        value: averageCreationTime // Lower is better
      };
    }, { min: 100, max: 2000 });
    
    // Container Startup Benchmark
    await runBenchmark('Container Startup Performance', async () => {
      const containerCount = 5;
      const startupTimes = [];
      const containers = [];
      
      for (let i = 0; i < containerCount; i++) {
        try {
          const container = await docker.createContainer({
            Image: 'node:18-alpine',
            Cmd: ['node', '-e', `console.log('Startup test ${i}'); setTimeout(() => process.exit(0), 1000);`]
          });
          
          const startTime = performance.now();
          await container.start();
          
          // Wait for container to be running
          let isRunning = false;
          while (!isRunning && performance.now() - startTime < 10000) {
            const info = await container.inspect();
            isRunning = info.State.Running;
            if (!isRunning) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          
          const startupTime = performance.now() - startTime;
          startupTimes.push(startupTime);
          containers.push(container);
          
        } catch (error) {
          startupTimes.push(null);
        }
      }
      
      // Cleanup
      for (const container of containers) {
        try {
          await container.stop({ t: 5 });
          await container.remove({ force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      
      const validTimes = startupTimes.filter(t => t !== null);
      const averageStartupTime = validTimes.length > 0
        ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length
        : Infinity;
      
      return {
        averageStartupTime,
        minStartupTime: Math.min(...validTimes),
        maxStartupTime: Math.max(...validTimes),
        successfulStartups: validTimes.length,
        totalAttempts: containerCount,
        successRate: (validTimes.length / containerCount) * 100,
        value: averageStartupTime // Lower is better
      };
    }, { min: 200, max: 3000 });
    
    benchmarkResults.dockerPerformance = {
      creation: testMetrics.benchmarks.filter(b => b.name.includes('Creation')),
      startup: testMetrics.benchmarks.filter(b => b.name.includes('Startup'))
    };
  });

  test('Resource Utilization Benchmarks', async () => {
    console.log('📊 Running resource utilization benchmarks...');
    
    // Memory Efficiency Benchmark
    await runBenchmark('Memory Efficiency Test', async () => {
      const baselineMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const dataStructures = {
        arrays: [],
        objects: [],
        strings: []
      };
      
      const itemCount = 50000;
      
      // Arrays
      for (let i = 0; i < itemCount; i++) {
        dataStructures.arrays.push(new Array(10).fill(i));
      }
      
      // Objects
      for (let i = 0; i < itemCount; i++) {
        dataStructures.objects.push({
          id: i,
          name: `object-${i}`,
          data: Math.random(),
          timestamp: Date.now()
        });
      }
      
      // Strings
      for (let i = 0; i < itemCount; i++) {
        dataStructures.strings.push(`string-data-${i}-${Math.random()}`);
      }
      
      const peakMemory = process.memoryUsage();
      const memoryIncrease = peakMemory.heapUsed - baselineMemory.heapUsed;
      
      // Cleanup
      dataStructures.arrays = [];
      dataStructures.objects = [];
      dataStructures.strings = [];
      
      if (global.gc) global.gc();
      
      const finalMemory = process.memoryUsage();
      const memoryRecovered = peakMemory.heapUsed - finalMemory.heapUsed;
      const recoveryRate = (memoryRecovered / memoryIncrease) * 100;
      
      const memoryPerItem = memoryIncrease / (itemCount * 3);
      
      return {
        memoryIncrease,
        memoryRecovered,
        recoveryRate,
        itemsCreated: itemCount * 3,
        memoryPerItem,
        memoryEfficiency: memoryPerItem < 1000 ? 'good' : 'poor', // Less than 1KB per item
        value: memoryPerItem // Lower is better
      };
    }, { min: 100, max: 2000 });
    
    // CPU Utilization Benchmark
    await runBenchmark('CPU Utilization Pattern', async () => {
      const startCpuUsage = process.cpuUsage();
      const startTime = performance.now();
      
      // Simulate mixed CPU workload
      const results = [];
      const workloadDuration = 5000; // 5 seconds
      const workloadStart = performance.now();
      
      while (performance.now() - workloadStart < workloadDuration) {
        // Light computation
        for (let i = 0; i < 10000; i++) {
          results.push(Math.sqrt(i));
        }
        
        // Brief pause
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const endTime = performance.now();
      const endCpuUsage = process.cpuUsage(startCpuUsage);
      
      const totalDuration = endTime - startTime;
      const cpuTime = (endCpuUsage.user + endCpuUsage.system) / 1000; // Convert to milliseconds
      const cpuUtilization = (cpuTime / totalDuration) * 100;
      
      return {
        totalDuration,
        cpuTime,
        cpuUtilization,
        computationsPerformed: results.length,
        computationRate: results.length / (totalDuration / 1000),
        efficiency: cpuUtilization > 20 && cpuUtilization < 80 ? 'optimal' : 'suboptimal',
        value: cpuUtilization // Target range: 20-80%
      };
    }, { min: 20, max: 80 });
    
    benchmarkResults.resourceUtilization = {
      memory: testMetrics.benchmarks.filter(b => b.name.includes('Memory Efficiency')),
      cpu: testMetrics.benchmarks.filter(b => b.name.includes('CPU Utilization'))
    };
  });

  test('Performance Regression Detection', async () => {
    console.log('📈 Running performance regression detection...');
    
    // Load baseline benchmarks if they exist
    const baselinePath = path.join(__dirname, '../reports', 'baseline-benchmarks.json');
    let baseline = null;
    
    try {
      if (fs.existsSync(baselinePath)) {
        baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        console.log('📊 Loaded baseline benchmarks for comparison');
      }
    } catch (error) {
      console.log('⚠️  Could not load baseline benchmarks:', error.message);
    }
    
    // Compare current results with baseline
    if (baseline) {
      for (const currentBenchmark of testMetrics.benchmarks) {
        const baselineBenchmark = baseline.benchmarks?.find(b => b.name === currentBenchmark.name);
        
        if (baselineBenchmark && currentBenchmark.status === 'completed' && baselineBenchmark.status === 'completed') {
          const performanceChange = calculatePerformanceChange(baselineBenchmark, currentBenchmark);
          
          const comparison = {
            benchmarkName: currentBenchmark.name,
            baseline: baselineBenchmark.result,
            current: currentBenchmark.result,
            change: performanceChange,
            isRegression: performanceChange.isRegression,
            isImprovement: performanceChange.isImprovement,
            significance: performanceChange.significance
          };
          
          testMetrics.comparisons.push(comparison);
          
          if (performanceChange.isRegression) {
            testMetrics.regressions.push(comparison);
            console.log(`📉 Regression detected in ${currentBenchmark.name}: ${performanceChange.changePercent.toFixed(2)}% worse`);
          } else if (performanceChange.isImprovement) {
            testMetrics.improvements.push(comparison);
            console.log(`📈 Improvement detected in ${currentBenchmark.name}: ${performanceChange.changePercent.toFixed(2)}% better`);
          }
        }
      }
      
      console.log(`📊 Performance comparison results:
        - Regressions: ${testMetrics.regressions.length}
        - Improvements: ${testMetrics.improvements.length}
        - Stable: ${testMetrics.comparisons.length - testMetrics.regressions.length - testMetrics.improvements.length}`);
    }
    
    // Save current results as new baseline
    const currentBaseline = {
      timestamp: Date.now(),
      benchmarks: testMetrics.benchmarks,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
    
    fs.writeFileSync(baselinePath, JSON.stringify(currentBaseline, null, 2));
    console.log('💾 Saved current benchmarks as new baseline');
    
    // Assert no critical regressions
    const criticalRegressions = testMetrics.regressions.filter(r => r.significance === 'high');
    expect(criticalRegressions.length).toBe(0);
  });

  function calculatePerformanceChange(baseline, current) {
    const baselineValue = baseline.result?.value || baseline.score || baseline.duration || 0;
    const currentValue = current.result?.value || current.score || current.duration || 0;
    
    if (baselineValue === 0) return { changePercent: 0, isRegression: false, isImprovement: false, significance: 'none' };
    
    const changePercent = ((currentValue - baselineValue) / baselineValue) * 100;
    const absChangePercent = Math.abs(changePercent);
    
    // Determine if this is a regression or improvement based on the metric type
    const isTimeBasedMetric = baseline.name.toLowerCase().includes('latency') || 
                              baseline.name.toLowerCase().includes('duration') ||
                              baseline.name.toLowerCase().includes('time');
    
    const isRegression = isTimeBasedMetric ? changePercent > 10 : changePercent < -10; // 10% threshold
    const isImprovement = isTimeBasedMetric ? changePercent < -10 : changePercent > 10;
    
    let significance = 'none';
    if (absChangePercent > 30) significance = 'high';
    else if (absChangePercent > 15) significance = 'medium';
    else if (absChangePercent > 5) significance = 'low';
    
    return {
      changePercent,
      isRegression,
      isImprovement,
      significance,
      baselineValue,
      currentValue
    };
  }

  function generateBenchmarkReport() {
    const reportData = {
      summary: {
        timestamp: new Date().toISOString(),
        totalBenchmarks: testMetrics.benchmarks.length,
        successfulBenchmarks: testMetrics.benchmarks.filter(b => b.status === 'completed').length,
        failedBenchmarks: testMetrics.benchmarks.filter(b => b.status === 'failed').length,
        averageScore: calculateOverallPerformanceScore(),
        testDuration: Date.now() - testMetrics.startTime
      },
      benchmarks: testMetrics.benchmarks,
      comparisons: testMetrics.comparisons,
      regressions: testMetrics.regressions,
      improvements: testMetrics.improvements,
      detailedResults: benchmarkResults,
      recommendations: generatePerformanceRecommendations()
    };
    
    const reportPath = path.join(__dirname, '../reports', 'benchmark-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    // Generate HTML report
    const htmlReport = generateHTMLReport(reportData);
    const htmlPath = path.join(__dirname, '../reports', 'benchmark-report.html');
    fs.writeFileSync(htmlPath, htmlReport);
    
    console.log(`📄 Benchmark reports generated:
      - JSON: ${reportPath}
      - HTML: ${htmlPath}`);
  }

  function generatePerformanceRecommendations() {
    const recommendations = [];
    
    // Analyze benchmark results for recommendations
    for (const benchmark of testMetrics.benchmarks) {
      if (benchmark.status === 'failed') {
        recommendations.push({
          type: 'error',
          priority: 'high',
          benchmark: benchmark.name,
          message: `Benchmark failed: ${benchmark.error}`
        });
      } else if (benchmark.score < 50) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          benchmark: benchmark.name,
          message: `Low performance score (${benchmark.score.toFixed(1)}). Consider optimization.`
        });
      }
    }
    
    // AI model specific recommendations
    const aiModelBenchmarks = testMetrics.benchmarks.filter(b => b.name.includes('Generation') || b.name.includes('Analysis'));
    const avgAIResponseTime = aiModelBenchmarks.reduce((sum, b) => sum + (b.result?.responseTime || 0), 0) / aiModelBenchmarks.length;
    
    if (avgAIResponseTime > 3000) {
      recommendations.push({
        type: 'ai_performance',
        priority: 'high',
        message: `AI model response times are high (${avgAIResponseTime.toFixed(0)}ms average). Consider model optimization or scaling.`
      });
    }
    
    // Resource utilization recommendations
    const memoryBenchmarks = testMetrics.benchmarks.filter(b => b.name.includes('Memory'));
    if (memoryBenchmarks.length > 0) {
      const avgMemoryPerItem = memoryBenchmarks.reduce((sum, b) => sum + (b.result?.memoryPerItem || 0), 0) / memoryBenchmarks.length;
      
      if (avgMemoryPerItem > 1000) {
        recommendations.push({
          type: 'memory',
          priority: 'medium',
          message: `High memory usage per item (${avgMemoryPerItem.toFixed(0)} bytes). Consider memory optimization.`
        });
      }
    }
    
    return recommendations;
  }

  function generateHTMLReport(reportData) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Benchmark Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .benchmark { background: #fff; border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 4px; }
        .success { border-left: 4px solid #4CAF50; }
        .failed { border-left: 4px solid #f44336; }
        .regression { border-left: 4px solid #ff9800; }
        .improvement { border-left: 4px solid #2196F3; }
        .score { float: right; font-weight: bold; font-size: 18px; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 4px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>AutoDev-AI Performance Benchmark Report</h1>
        <p>Generated: ${reportData.summary.timestamp}</p>
        <p>Total Benchmarks: ${reportData.summary.totalBenchmarks} | 
           Successful: ${reportData.summary.successfulBenchmarks} | 
           Failed: ${reportData.summary.failedBenchmarks}</p>
        <p>Overall Score: ${reportData.summary.averageScore.toFixed(1)}/100</p>
    </div>

    <h2>Benchmark Results</h2>
    ${reportData.benchmarks.map(b => `
        <div class="benchmark ${b.status}">
            <h3>${b.name} <span class="score">${b.score ? b.score.toFixed(1) : 'N/A'}</span></h3>
            <p>Duration: ${b.duration.toFixed(2)}ms | Status: ${b.status}</p>
            ${b.result ? `<pre>${JSON.stringify(b.result, null, 2)}</pre>` : ''}
            ${b.error ? `<p style="color: red;">Error: ${b.error}</p>` : ''}
        </div>
    `).join('')}

    ${reportData.regressions.length > 0 ? `
        <h2>Performance Regressions</h2>
        ${reportData.regressions.map(r => `
            <div class="benchmark regression">
                <h3>${r.benchmarkName}</h3>
                <p>Performance degraded by ${Math.abs(r.change.changePercent).toFixed(2)}% (${r.change.significance} significance)</p>
            </div>
        `).join('')}
    ` : ''}

    ${reportData.improvements.length > 0 ? `
        <h2>Performance Improvements</h2>
        ${reportData.improvements.map(i => `
            <div class="benchmark improvement">
                <h3>${i.benchmarkName}</h3>
                <p>Performance improved by ${Math.abs(i.change.changePercent).toFixed(2)}% (${i.change.significance} significance)</p>
            </div>
        `).join('')}
    ` : ''}

    ${reportData.recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>Recommendations</h2>
            ${reportData.recommendations.map(r => `
                <p><strong>${r.type.toUpperCase()}</strong> (${r.priority}): ${r.message}</p>
            `).join('')}
        </div>
    ` : ''}
</body>
</html>
    `;
  }
});