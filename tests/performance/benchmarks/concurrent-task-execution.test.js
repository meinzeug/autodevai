const axios = require('axios');
const { performance } = require('perf_hooks');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');

describe('Concurrent Task Execution Performance Benchmarks', () => {
  let testMetrics;
  let performanceTargets;

  beforeAll(() => {
    testMetrics = {
      startTime: Date.now(),
      concurrencyTests: [],
      taskExecutions: [],
      threadPoolAnalysis: {},
      loadBalancingMetrics: {},
      scalabilityAnalysis: {},
      errors: []
    };

    // Performance targets based on architecture specs
    performanceTargets = {
      maxConcurrentTasks: 100, // 100 concurrent tasks
      taskThroughput: 50, // 50 tasks per second
      concurrencyOverhead: 20, // 20% max overhead for concurrency
      threadPoolEfficiency: 80, // 80% thread utilization
      taskQueueLatency: 100, // 100ms max queue latency
      loadBalancingEfficiency: 90, // 90% load balancing efficiency
      scalabilityFactor: 0.8, // 80% performance retention at scale
      errorRate: 2 // 2% max error rate under load
    };

    console.log('🚀 Starting Concurrent Task Execution Benchmarks...');
    console.log('📊 Performance Targets:', performanceTargets);
  });

  afterAll(() => {
    const summary = {
      testDuration: Date.now() - testMetrics.startTime,
      totalConcurrencyTests: testMetrics.concurrencyTests.length,
      totalTaskExecutions: testMetrics.taskExecutions.length,
      errorCount: testMetrics.errors.length,
      errorRate: (testMetrics.errors.length / testMetrics.taskExecutions.length * 100).toFixed(2),
      maxConcurrencyAchieved: findMaxConcurrencyAchieved(),
      averageTaskThroughput: calculateAverageThroughput(),
      scalabilityScore: calculateScalabilityScore(),
      targetCompliance: calculateConcurrencyCompliance()
    };

    console.log('🏆 Concurrent Task Execution Summary:', summary);
    global.performanceUtils.saveMetrics('concurrent-task-execution', {
      summary,
      detailedMetrics: testMetrics,
      performanceTargets
    });

    generateConcurrencyReport(summary);
  });

  // Simple worker thread implementation for CPU-intensive tasks
  const createWorker = (taskData) => {
    return new Promise((resolve, reject) => {
      const workerCode = `
        const { parentPort, workerData } = require('worker_threads');
        
        function performCPUIntensiveTask(data) {
          const { iterations, complexity } = data;
          let result = 0;
          
          for (let i = 0; i < iterations; i++) {
            // Simulate different complexity levels
            if (complexity === 'light') {
              result += Math.sqrt(i);
            } else if (complexity === 'medium') {
              result += Math.sin(i) * Math.cos(i);
            } else { // heavy
              result += Math.pow(Math.sin(i), 2) + Math.pow(Math.cos(i), 2);
            }
          }
          
          return result;
        }
        
        const startTime = Date.now();
        const result = performCPUIntensiveTask(workerData);
        const executionTime = Date.now() - startTime;
        
        parentPort.postMessage({
          result,
          executionTime,
          workerId: workerData.workerId,
          success: true
        });
      `;

      try {
        const worker = new Worker(workerCode, { 
          eval: true,
          workerData: taskData
        });

        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error('Worker timeout'));
        }, 30000);

        worker.on('message', (data) => {
          clearTimeout(timeout);
          worker.terminate();
          resolve(data);
        });

        worker.on('error', (error) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(error);
        });

        worker.on('exit', (code) => {
          clearTimeout(timeout);
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  };

  const executeTaskBatch = async (tasks, concurrencyLimit = 10) => {
    const results = [];
    const errors = [];
    const executing = new Set();
    let taskIndex = 0;
    const startTime = performance.now();

    const executeNext = async () => {
      if (taskIndex >= tasks.length) return;

      const currentTaskIndex = taskIndex++;
      const task = tasks[currentTaskIndex];
      const taskStartTime = performance.now();

      executing.add(currentTaskIndex);

      try {
        const result = await task.execute();
        const taskEndTime = performance.now();
        const taskDuration = taskEndTime - taskStartTime;

        results.push({
          taskIndex: currentTaskIndex,
          taskType: task.type,
          result,
          duration: taskDuration,
          success: true,
          timestamp: Date.now()
        });

        testMetrics.taskExecutions.push({
          taskIndex: currentTaskIndex,
          taskType: task.type,
          duration: taskDuration,
          concurrencyLevel: executing.size,
          success: true
        });
      } catch (error) {
        const taskEndTime = performance.now();
        const taskDuration = taskEndTime - taskStartTime;

        errors.push({
          taskIndex: currentTaskIndex,
          taskType: task.type,
          error: error.message,
          duration: taskDuration,
          timestamp: Date.now()
        });

        testMetrics.taskExecutions.push({
          taskIndex: currentTaskIndex,
          taskType: task.type,
          duration: taskDuration,
          concurrencyLevel: executing.size,
          success: false,
          error: error.message
        });

        testMetrics.errors.push({
          taskIndex: currentTaskIndex,
          error: error.message,
          taskType: task.type
        });
      }

      executing.delete(currentTaskIndex);

      // Continue with next task if available
      if (taskIndex < tasks.length) {
        await executeNext();
      }
    };

    // Start initial batch of concurrent tasks
    const initialPromises = [];
    for (let i = 0; i < Math.min(concurrencyLimit, tasks.length); i++) {
      initialPromises.push(executeNext());
    }

    await Promise.all(initialPromises);

    const totalTime = performance.now() - startTime;
    const throughput = results.length / (totalTime / 1000);

    return {
      totalTasks: tasks.length,
      successfulTasks: results.length,
      failedTasks: errors.length,
      totalTime,
      throughput,
      results,
      errors,
      averageTaskDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length
    };
  };

  const runConcurrencyBenchmark = async (name, testFunction, expectedBehavior) => {
    console.log(`🔄 Running concurrency benchmark: ${name}`);
    const startTime = performance.now();

    try {
      const result = await testFunction();
      const duration = performance.now() - startTime;

      const benchmark = {
        name,
        duration,
        result,
        expectedBehavior,
        meetsExpectation: evaluateConcurrencyBehavior(result, expectedBehavior),
        timestamp: Date.now(),
        status: 'completed'
      };

      testMetrics.concurrencyTests.push(benchmark);

      const status = benchmark.meetsExpectation ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${name}: ${duration.toFixed(2)}ms`);

      return benchmark;
    } catch (error) {
      const duration = performance.now() - startTime;

      const benchmark = {
        name,
        duration,
        error: error.message,
        expectedBehavior,
        meetsExpectation: false,
        timestamp: Date.now(),
        status: 'failed'
      };

      testMetrics.concurrencyTests.push(benchmark);
      console.log(`❌ FAILED ${name}: ${error.message}`);

      return benchmark;
    }
  };

  const evaluateConcurrencyBehavior = (result, expectedBehavior) => {
    switch (expectedBehavior) {
      case 'high_throughput':
        return result.throughput && result.throughput > performanceTargets.taskThroughput;
      case 'low_error_rate':
        return result.errorRate && result.errorRate < performanceTargets.errorRate;
      case 'efficient_scaling':
        return result.scalingEfficiency && result.scalingEfficiency > performanceTargets.scalabilityFactor;
      case 'load_balanced':
        return result.loadBalance && result.loadBalance > performanceTargets.loadBalancingEfficiency;
      default:
        return true;
    }
  };

  test('Basic Concurrency - CPU Intensive Tasks', async () => {
    await runConcurrencyBenchmark('CPU Intensive Concurrency', async () => {
      const taskCount = 50;
      const concurrencyLevels = [1, 5, 10, 20, 30];
      const results = [];

      for (const concurrency of concurrencyLevels) {
        const tasks = Array(taskCount).fill(null).map((_, index) => ({
          type: 'cpu_intensive',
          execute: () => createWorker({
            workerId: index,
            iterations: 1000000,
            complexity: 'medium'
          })
        }));

        const batchResult = await executeTaskBatch(tasks, concurrency);
        
        results.push({
          concurrencyLevel: concurrency,
          throughput: batchResult.throughput,
          totalTime: batchResult.totalTime,
          successRate: (batchResult.successfulTasks / batchResult.totalTasks) * 100,
          averageDuration: batchResult.averageTaskDuration
        });

        console.log(`  Concurrency ${concurrency}: ${batchResult.throughput.toFixed(2)} tasks/sec`);
      }

      // Analyze scaling efficiency
      const baselineThroughput = results[0].throughput;
      const scalingEfficiencies = results.map(r => ({
        concurrency: r.concurrencyLevel,
        efficiency: r.throughput / (baselineThroughput * r.concurrencyLevel) * 100
      }));

      return {
        taskCount,
        concurrencyResults: results,
        scalingEfficiencies,
        maxThroughput: Math.max(...results.map(r => r.throughput)),
        scalingEfficiency: scalingEfficiencies[scalingEfficiencies.length - 1].efficiency
      };
    }, 'efficient_scaling');
  });

  test('I/O Intensive Concurrency - API Calls', async () => {
    await runConcurrencyBenchmark('I/O Intensive Concurrency', async () => {
      const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
      const taskCount = 100;
      const concurrencyLevels = [10, 25, 50, 75, 100];
      const results = [];

      for (const concurrency of concurrencyLevels) {
        const tasks = Array(taskCount).fill(null).map((_, index) => ({
          type: 'api_call',
          execute: async () => {
            const startTime = performance.now();
            try {
              const response = await axios.get(`${baseURL}/api/health`, {
                timeout: 10000,
                headers: { 'X-Test-ID': index }
              });
              return {
                statusCode: response.status,
                responseTime: performance.now() - startTime,
                success: true
              };
            } catch (error) {
              return {
                error: error.message,
                responseTime: performance.now() - startTime,
                success: false
              };
            }
          }
        }));

        const batchResult = await executeTaskBatch(tasks, concurrency);
        
        results.push({
          concurrencyLevel: concurrency,
          throughput: batchResult.throughput,
          totalTime: batchResult.totalTime,
          successRate: (batchResult.successfulTasks / batchResult.totalTasks) * 100,
          averageResponseTime: batchResult.results
            .filter(r => r.result.success)
            .reduce((sum, r) => sum + r.result.responseTime, 0) / 
            batchResult.results.filter(r => r.result.success).length,
          errorRate: (batchResult.failedTasks / batchResult.totalTasks) * 100
        });

        console.log(`  API Concurrency ${concurrency}: ${batchResult.throughput.toFixed(2)} req/sec, ${results[results.length-1].errorRate.toFixed(2)}% errors`);

        // Brief pause between concurrency levels
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return {
        taskCount,
        concurrencyResults: results,
        maxThroughput: Math.max(...results.map(r => r.throughput)),
        errorRate: results[results.length - 1].errorRate
      };
    }, 'high_throughput');
  });

  test('Mixed Workload Concurrency', async () => {
    await runConcurrencyBenchmark('Mixed Workload Concurrency', async () => {
      const taskTypes = [
        {
          type: 'cpu_light',
          weight: 40,
          execute: () => createWorker({
            workerId: Math.random(),
            iterations: 100000,
            complexity: 'light'
          })
        },
        {
          type: 'cpu_heavy',
          weight: 20,
          execute: () => createWorker({
            workerId: Math.random(),
            iterations: 2000000,
            complexity: 'heavy'
          })
        },
        {
          type: 'io_api',
          weight: 30,
          execute: async () => {
            const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
            try {
              const response = await axios.get(`${baseURL}/api/health`, { timeout: 5000 });
              return { success: true, statusCode: response.status };
            } catch (error) {
              return { success: false, error: error.message };
            }
          }
        },
        {
          type: 'memory_intensive',
          weight: 10,
          execute: async () => {
            const data = [];
            for (let i = 0; i < 10000; i++) {
              data.push({ 
                id: i, 
                payload: new Array(100).fill(Math.random()),
                timestamp: Date.now() 
              });
            }
            // Process data
            const processed = data.map(item => ({
              ...item,
              processed: true,
              hash: item.payload.reduce((sum, val) => sum + val, 0)
            }));
            return { processedItems: processed.length };
          }
        }
      ];

      // Generate mixed workload based on weights
      const totalTasks = 150;
      const tasks = [];
      
      taskTypes.forEach(taskType => {
        const count = Math.floor((taskType.weight / 100) * totalTasks);
        for (let i = 0; i < count; i++) {
          tasks.push({
            type: taskType.type,
            execute: taskType.execute
          });
        }
      });

      // Shuffle tasks to simulate realistic mixed workload
      for (let i = tasks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tasks[i], tasks[j]] = [tasks[j], tasks[i]];
      }

      const concurrencyLevel = 25;
      const batchResult = await executeTaskBatch(tasks, concurrencyLevel);

      // Analyze performance by task type
      const taskTypeAnalysis = {};
      batchResult.results.forEach(result => {
        if (!taskTypeAnalysis[result.taskType]) {
          taskTypeAnalysis[result.taskType] = {
            count: 0,
            totalDuration: 0,
            successCount: 0
          };
        }
        
        taskTypeAnalysis[result.taskType].count++;
        taskTypeAnalysis[result.taskType].totalDuration += result.duration;
        if (result.success) {
          taskTypeAnalysis[result.taskType].successCount++;
        }
      });

      // Calculate averages and success rates
      Object.keys(taskTypeAnalysis).forEach(taskType => {
        const analysis = taskTypeAnalysis[taskType];
        analysis.averageDuration = analysis.totalDuration / analysis.count;
        analysis.successRate = (analysis.successCount / analysis.count) * 100;
      });

      return {
        totalTasks: tasks.length,
        concurrencyLevel,
        throughput: batchResult.throughput,
        overallSuccessRate: (batchResult.successfulTasks / batchResult.totalTasks) * 100,
        taskTypeAnalysis,
        loadBalance: calculateLoadBalance(taskTypeAnalysis)
      };
    }, 'load_balanced');
  });

  test('Scalability Analysis - Progressive Load Increase', async () => {
    await runConcurrencyBenchmark('Scalability Analysis', async () => {
      const baseTaskCount = 20;
      const scaleFactors = [1, 2, 3, 4, 5]; // 20, 40, 60, 80, 100 tasks
      const concurrency = 20;
      const scalabilityResults = [];

      for (const factor of scaleFactors) {
        const taskCount = baseTaskCount * factor;
        
        const tasks = Array(taskCount).fill(null).map((_, index) => ({
          type: 'scalability_test',
          execute: async () => {
            // Simulate mixed CPU and I/O work
            const cpuWork = () => {
              let result = 0;
              for (let i = 0; i < 100000; i++) {
                result += Math.sqrt(i);
              }
              return result;
            };

            const ioWork = async () => {
              return new Promise(resolve => {
                setTimeout(() => resolve(Math.random()), Math.random() * 100);
              });
            };

            const cpuResult = cpuWork();
            const ioResult = await ioWork();
            
            return { cpuResult, ioResult, taskIndex: index };
          }
        }));

        const batchResult = await executeTaskBatch(tasks, concurrency);
        
        const scalabilityMetric = {
          scaleFactor: factor,
          taskCount,
          throughput: batchResult.throughput,
          averageDuration: batchResult.averageTaskDuration,
          successRate: (batchResult.successfulTasks / batchResult.totalTasks) * 100,
          totalTime: batchResult.totalTime
        };

        scalabilityResults.push(scalabilityMetric);

        console.log(`  Scale ${factor}x (${taskCount} tasks): ${batchResult.throughput.toFixed(2)} tasks/sec`);

        // Brief pause between scale tests
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Calculate scalability efficiency
      const baselineThroughput = scalabilityResults[0].throughput;
      const scalabilityEfficiencies = scalabilityResults.map(result => ({
        scaleFactor: result.scaleFactor,
        efficiency: result.throughput / baselineThroughput,
        expectedEfficiency: 1.0, // Ideal would maintain baseline throughput
        efficiencyPercentage: (result.throughput / baselineThroughput) * 100
      }));

      const overallScalabilityScore = scalabilityEfficiencies
        .reduce((sum, eff) => sum + eff.efficiencyPercentage, 0) / scalabilityEfficiencies.length;

      return {
        scalabilityResults,
        scalabilityEfficiencies,
        overallScalabilityScore,
        scalingEfficiency: overallScalabilityScore / 100
      };
    }, 'efficient_scaling');
  });

  test('Queue Management and Task Prioritization', async () => {
    await runConcurrencyBenchmark('Queue Management', async () => {
      const priorities = ['high', 'medium', 'low'];
      const tasksPerPriority = 30;
      const concurrency = 15;

      // Create tasks with different priorities and processing times
      const tasks = [];
      priorities.forEach((priority, priorityIndex) => {
        for (let i = 0; i < tasksPerPriority; i++) {
          tasks.push({
            type: `${priority}_priority`,
            priority: priorityIndex, // 0 = high, 1 = medium, 2 = low
            createdAt: Date.now() + (Math.random() * 1000), // Simulate staggered arrival
            execute: async () => {
              // Different processing times based on priority
              const processingTime = priority === 'high' ? 200 : 
                                   priority === 'medium' ? 500 : 1000;
              
              return new Promise(resolve => {
                setTimeout(() => {
                  resolve({
                    priority,
                    processingTime,
                    completedAt: Date.now()
                  });
                }, processingTime + (Math.random() * 100));
              });
            }
          });
        }
      });

      // Sort tasks by priority (simulate priority queue)
      tasks.sort((a, b) => a.priority - b.priority);

      const batchResult = await executeTaskBatch(tasks, concurrency);

      // Analyze queue performance
      const queueAnalysis = {
        totalTasks: tasks.length,
        averageQueueTime: batchResult.totalTime / tasks.length,
        priorityAnalysis: {}
      };

      // Group results by priority
      batchResult.results.forEach(result => {
        const priority = result.result.priority;
        if (!queueAnalysis.priorityAnalysis[priority]) {
          queueAnalysis.priorityAnalysis[priority] = {
            count: 0,
            totalDuration: 0,
            averageDuration: 0
          };
        }

        queueAnalysis.priorityAnalysis[priority].count++;
        queueAnalysis.priorityAnalysis[priority].totalDuration += result.duration;
      });

      // Calculate averages
      Object.keys(queueAnalysis.priorityAnalysis).forEach(priority => {
        const analysis = queueAnalysis.priorityAnalysis[priority];
        analysis.averageDuration = analysis.totalDuration / analysis.count;
      });

      // Check if high priority tasks completed faster on average
      const highPriorityAvg = queueAnalysis.priorityAnalysis.high?.averageDuration || 0;
      const lowPriorityAvg = queueAnalysis.priorityAnalysis.low?.averageDuration || 0;
      const prioritizationWorking = highPriorityAvg > 0 && lowPriorityAvg > 0 && 
                                   highPriorityAvg < lowPriorityAvg;

      return {
        queueAnalysis,
        prioritizationWorking,
        queueLatency: batchResult.totalTime / tasks.length,
        throughput: batchResult.throughput
      };
    }, 'low_error_rate');
  });

  test('Error Handling and Recovery Under Concurrency', async () => {
    await runConcurrencyBenchmark('Error Handling Under Load', async () => {
      const totalTasks = 100;
      const failureRate = 0.2; // 20% of tasks will fail
      const concurrency = 30;

      const tasks = Array(totalTasks).fill(null).map((_, index) => ({
        type: 'error_prone_task',
        execute: async () => {
          // Simulate varying processing times
          const processingTime = 200 + (Math.random() * 800);
          
          await new Promise(resolve => setTimeout(resolve, processingTime));

          // Randomly fail some tasks
          if (Math.random() < failureRate) {
            throw new Error(`Simulated failure in task ${index}`);
          }

          return {
            taskIndex: index,
            processingTime,
            success: true,
            timestamp: Date.now()
          };
        }
      }));

      const batchResult = await executeTaskBatch(tasks, concurrency);

      // Analyze error patterns
      const errorAnalysis = {
        totalTasks,
        successfulTasks: batchResult.successfulTasks,
        failedTasks: batchResult.failedTasks,
        actualErrorRate: (batchResult.failedTasks / totalTasks) * 100,
        expectedErrorRate: failureRate * 100,
        errorRateVariance: Math.abs((batchResult.failedTasks / totalTasks) - failureRate),
        throughputWithErrors: batchResult.throughput,
        averageSuccessfulTaskDuration: batchResult.results
          .filter(r => r.success)
          .reduce((sum, r) => sum + r.duration, 0) / batchResult.results.filter(r => r.success).length
      };

      // Check if system maintained performance despite errors
      const performanceDegradation = errorAnalysis.averageSuccessfulTaskDuration > 2000; // 2s threshold

      return {
        errorAnalysis,
        performanceDegradation,
        errorRate: errorAnalysis.actualErrorRate,
        resilientToErrors: !performanceDegradation && errorAnalysis.actualErrorRate < performanceTargets.errorRate * 2
      };
    }, 'low_error_rate');
  });

  test('Memory Usage Under High Concurrency', async () => {
    await runConcurrencyBenchmark('Memory Usage Under Concurrency', async () => {
      const memorySnapshots = [];
      const concurrency = 50;
      const taskCount = 200;

      const captureMemorySnapshot = (label) => {
        const usage = process.memoryUsage();
        memorySnapshots.push({
          label,
          timestamp: Date.now(),
          heapUsed: usage.heapUsed,
          heapTotal: usage.heapTotal,
          rss: usage.rss
        });
        return usage;
      };

      captureMemorySnapshot('before_concurrent_execution');

      // Create memory-intensive tasks
      const tasks = Array(taskCount).fill(null).map((_, index) => ({
        type: 'memory_intensive',
        execute: async () => {
          // Create temporary data structures
          const data = [];
          for (let i = 0; i < 5000; i++) {
            data.push({
              id: i,
              payload: new Array(50).fill(Math.random()),
              metadata: {
                taskIndex: index,
                timestamp: Date.now(),
                randomValue: Math.random()
              }
            });
          }

          // Process data (simulate work)
          const processed = data.map(item => ({
            ...item.metadata,
            processedPayloadSum: item.payload.reduce((sum, val) => sum + val, 0)
          }));

          // Simulate async I/O
          await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

          return {
            processedItems: processed.length,
            dataSize: data.length
          };
        }
      }));

      // Monitor memory during execution
      const memoryMonitoringInterval = setInterval(() => {
        captureMemorySnapshot('during_execution');
      }, 1000);

      const batchResult = await executeTaskBatch(tasks, concurrency);

      clearInterval(memoryMonitoringInterval);
      captureMemorySnapshot('after_concurrent_execution');

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 1000));
        captureMemorySnapshot('after_gc');
      }

      // Analyze memory usage patterns
      const memoryAnalysis = {
        memorySnapshots,
        peakMemoryUsage: Math.max(...memorySnapshots.map(s => s.heapUsed)),
        memoryGrowthDuringExecution: 0,
        memoryRecoveredAfterExecution: 0
      };

      if (memorySnapshots.length >= 3) {
        const beforeMem = memorySnapshots[0].heapUsed;
        const afterMem = memorySnapshots[memorySnapshots.length - 1].heapUsed;
        memoryAnalysis.memoryGrowthDuringExecution = afterMem - beforeMem;
        
        if (global.gc && memorySnapshots.length >= 4) {
          const afterGcMem = memorySnapshots[memorySnapshots.length - 1].heapUsed;
          memoryAnalysis.memoryRecoveredAfterExecution = afterMem - afterGcMem;
        }
      }

      return {
        concurrency,
        taskCount,
        throughput: batchResult.throughput,
        successRate: (batchResult.successfulTasks / batchResult.totalTasks) * 100,
        memoryAnalysis,
        memoryEfficient: memoryAnalysis.memoryGrowthDuringExecution < (100 * 1024 * 1024) // Less than 100MB growth
      };
    }, 'high_throughput');
  });

  const calculateLoadBalance = (taskTypeAnalysis) => {
    const durations = Object.values(taskTypeAnalysis).map(analysis => analysis.averageDuration);
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    
    // Perfect load balance would have equal durations
    const balanceScore = (1 - ((maxDuration - minDuration) / maxDuration)) * 100;
    return Math.max(0, balanceScore);
  };

  const findMaxConcurrencyAchieved = () => {
    const maxConcurrency = Math.max(...testMetrics.taskExecutions.map(task => task.concurrencyLevel || 0));
    return maxConcurrency || 0;
  };

  const calculateAverageThroughput = () => {
    const throughputResults = testMetrics.concurrencyTests
      .filter(test => test.result && test.result.throughput)
      .map(test => test.result.throughput);

    return throughputResults.length > 0 
      ? throughputResults.reduce((sum, throughput) => sum + throughput, 0) / throughputResults.length
      : 0;
  };

  const calculateScalabilityScore = () => {
    const scalabilityTests = testMetrics.concurrencyTests
      .filter(test => test.result && test.result.scalingEfficiency !== undefined);

    if (scalabilityTests.length === 0) return 0;

    const avgScalability = scalabilityTests
      .reduce((sum, test) => sum + test.result.scalingEfficiency, 0) / scalabilityTests.length;

    return avgScalability;
  };

  const calculateConcurrencyCompliance = () => {
    const completedTests = testMetrics.concurrencyTests.filter(test => test.status === 'completed');
    const passedTests = completedTests.filter(test => test.meetsExpectation);
    
    return {
      totalTests: completedTests.length,
      passedTests: passedTests.length,
      complianceRate: completedTests.length > 0 
        ? (passedTests.length / completedTests.length) * 100
        : 0
    };
  };

  const generateConcurrencyReport = (summary) => {
    const report = {
      timestamp: new Date().toISOString(),
      summary,
      performanceTargets,
      concurrencyTests: testMetrics.concurrencyTests,
      taskExecutionMetrics: testMetrics.taskExecutions,
      threadPoolAnalysis: testMetrics.threadPoolAnalysis,
      scalabilityAnalysis: testMetrics.scalabilityAnalysis,
      recommendations: generateConcurrencyRecommendations(summary)
    };

    const reportPath = path.join(__dirname, '../reports', 'concurrent-task-execution-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📄 Concurrent Task Execution Report saved to: ${reportPath}`);
  };

  const generateConcurrencyRecommendations = (summary) => {
    const recommendations = [];

    // Throughput analysis
    if (summary.averageTaskThroughput < performanceTargets.taskThroughput) {
      recommendations.push({
        type: 'throughput',
        priority: 'high',
        message: `Low task throughput (${summary.averageTaskThroughput.toFixed(2)} tasks/sec). Consider optimizing task execution or increasing concurrency.`
      });
    }

    // Error rate analysis
    if (parseFloat(summary.errorRate) > performanceTargets.errorRate) {
      recommendations.push({
        type: 'error_rate',
        priority: 'high',
        message: `High error rate (${summary.errorRate}%) under concurrent load. Review error handling and resource management.`
      });
    }

    // Scalability analysis
    if (summary.scalabilityScore < performanceTargets.scalabilityFactor) {
      recommendations.push({
        type: 'scalability',
        priority: 'medium',
        message: `Poor scalability score (${(summary.scalabilityScore * 100).toFixed(1)}%). System may not scale well with increased load.`
      });
    }

    // Concurrency analysis
    if (summary.maxConcurrencyAchieved < performanceTargets.maxConcurrentTasks * 0.8) {
      recommendations.push({
        type: 'concurrency',
        priority: 'medium',
        message: `Maximum concurrency (${summary.maxConcurrencyAchieved}) below target. May indicate bottlenecks in task execution.`
      });
    }

    // Overall compliance
    if (summary.targetCompliance.complianceRate < 80) {
      recommendations.push({
        type: 'overall_performance',
        priority: 'high',
        message: `Only ${summary.targetCompliance.complianceRate.toFixed(1)}% of concurrency tests meet performance targets.`
      });
    }

    return recommendations;
  };
});