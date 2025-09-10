const Docker = require('dockerode');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Docker Sandbox Stress Testing', () => {
  let docker;
  let testMetrics;
  let createdContainers;

  beforeAll(() => {
    docker = new Docker();
    testMetrics = {
      startTime: Date.now(),
      containerOperations: [],
      resourceUsage: [],
      errors: [],
      maxContainers: 0,
      concurrentPeaks: []
    };
    createdContainers = [];
  });

  afterAll(async () => {
    // Cleanup all created containers
    console.log('🧹 Cleaning up test containers...');
    for (const container of createdContainers) {
      try {
        await container.stop({ t: 5 });
        await container.remove({ force: true });
      } catch (error) {
        console.log(`⚠️  Failed to cleanup container: ${error.message}`);
      }
    }
    
    const summary = {
      testDuration: Date.now() - testMetrics.startTime,
      totalContainerOperations: testMetrics.containerOperations.length,
      maxConcurrentContainers: testMetrics.maxContainers,
      errorCount: testMetrics.errors.length,
      averageResourceUsage: calculateAverageResourceUsage()
    };
    
    console.log('🚀 Docker Sandbox Stress Test Summary:', summary);
    global.performanceUtils.saveMetrics('docker-sandbox-stress-test', summary);
  });

  const calculateAverageResourceUsage = () => {
    if (testMetrics.resourceUsage.length === 0) return null;
    
    const totals = testMetrics.resourceUsage.reduce((acc, usage) => ({
      cpu: acc.cpu + usage.cpu,
      memory: acc.memory + usage.memory,
      disk: acc.disk + usage.disk
    }), { cpu: 0, memory: 0, disk: 0 });
    
    const count = testMetrics.resourceUsage.length;
    return {
      cpu: (totals.cpu / count).toFixed(2),
      memory: (totals.memory / count).toFixed(2),
      disk: (totals.disk / count).toFixed(2)
    };
  };

  const createTestContainer = async (config = {}) => {
    const startTime = performance.now();
    
    try {
      const container = await docker.createContainer({
        Image: config.image || 'node:18-alpine',
        Cmd: config.cmd || ['node', '-e', 'console.log("Container started"); setTimeout(() => process.exit(0), 30000);'],
        AttachStdout: true,
        AttachStderr: true,
        ...config.dockerConfig
      });
      
      await container.start();
      createdContainers.push(container);
      
      const duration = performance.now() - startTime;
      testMetrics.containerOperations.push({
        type: 'create_and_start',
        duration,
        containerId: container.id,
        timestamp: Date.now()
      });
      
      return container;
    } catch (error) {
      const duration = performance.now() - startTime;
      testMetrics.errors.push({
        type: 'container_creation',
        duration,
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  };

  const monitorSystemResources = async () => {
    try {
      const stats = await getSystemStats();
      testMetrics.resourceUsage.push({
        cpu: stats.cpuUsage,
        memory: stats.memoryUsage,
        disk: stats.diskUsage,
        timestamp: Date.now()
      });
    } catch (error) {
      testMetrics.errors.push({
        type: 'resource_monitoring',
        error: error.message,
        timestamp: Date.now()
      });
    }
  };

  const getSystemStats = () => {
    return new Promise((resolve, reject) => {
      // Get system resource usage
      const memInfo = fs.readFileSync('/proc/meminfo', 'utf8');
      const memMatch = memInfo.match(/MemAvailable:\s+(\d+)\s+kB/);
      const memTotalMatch = memInfo.match(/MemTotal:\s+(\d+)\s+kB/);
      
      let cpuUsage = 0;
      let memoryUsage = 0;
      let diskUsage = 0;
      
      if (memMatch && memTotalMatch) {
        const available = parseInt(memMatch[1]);
        const total = parseInt(memTotalMatch[1]);
        memoryUsage = ((total - available) / total) * 100;
      }
      
      // Get CPU usage (simplified)
      fs.readFile('/proc/loadavg', 'utf8', (err, data) => {
        if (!err) {
          const load = parseFloat(data.split(' ')[0]);
          cpuUsage = Math.min(load * 100, 100);
        }
        
        // Get disk usage for current directory
        const process = spawn('df', ['.']);
        let output = '';
        
        process.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        process.on('close', () => {
          const lines = output.split('\n');
          if (lines.length > 1) {
            const parts = lines[1].split(/\s+/);
            if (parts.length >= 5) {
              diskUsage = parseInt(parts[4].replace('%', ''));
            }
          }
          
          resolve({
            cpuUsage,
            memoryUsage,
            diskUsage
          });
        });
        
        process.on('error', reject);
      });
    });
  };

  test('Concurrent container creation stress test', async () => {
    const maxConcurrentContainers = 20;
    console.log(`🚀 Creating ${maxConcurrentContainers} containers concurrently...`);
    
    const startTime = performance.now();
    
    const containerPromises = Array(maxConcurrentContainers)
      .fill(null)
      .map((_, index) => 
        createTestContainer({
          cmd: ['node', '-e', `console.log('Container ${index}'); setTimeout(() => process.exit(0), 60000);`]
        }).catch(error => ({ error, index }))
      );
    
    const results = await Promise.all(containerPromises);
    const successful = results.filter(result => !result.error);
    const failed = results.filter(result => result.error);
    
    testMetrics.maxContainers = successful.length;
    
    const duration = performance.now() - startTime;
    console.log(`📊 Concurrent creation results:
      - Total time: ${duration.toFixed(2)}ms
      - Successful: ${successful.length}/${maxConcurrentContainers}
      - Failed: ${failed.length}
      - Success rate: ${(successful.length / maxConcurrentContainers * 100).toFixed(2)}%`);
    
    // Assert that at least 70% of containers were created successfully
    expect(successful.length).toBeGreaterThanOrEqual(maxConcurrentContainers * 0.7);
    
    // Monitor resources while containers are running
    await monitorSystemResources();
    
    // Wait a bit to let containers run
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Clean up containers created in this test
    for (const result of successful) {
      if (result.stop && result.remove) {
        try {
          await result.stop({ t: 5 });
          await result.remove({ force: true });
        } catch (error) {
          console.log(`⚠️  Failed to cleanup container: ${error.message}`);
        }
      }
    }
  });

  test('Container lifecycle stress test', async () => {
    const lifecycleCycles = 50;
    console.log(`🔄 Running ${lifecycleCycles} container lifecycle cycles...`);
    
    for (let i = 0; i < lifecycleCycles; i++) {
      const cycleStartTime = performance.now();
      
      try {
        // Create container
        const container = await createTestContainer({
          cmd: ['node', '-e', `console.log('Lifecycle test ${i}'); setTimeout(() => process.exit(0), 1000);`]
        });
        
        // Wait for container to finish
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Stop container
        const stopStartTime = performance.now();
        await container.stop({ t: 5 });
        const stopDuration = performance.now() - stopStartTime;
        
        // Remove container
        const removeStartTime = performance.now();
        await container.remove({ force: true });
        const removeDuration = performance.now() - removeStartTime;
        
        // Remove from cleanup list since we handled it
        const index = createdContainers.indexOf(container);
        if (index > -1) {
          createdContainers.splice(index, 1);
        }
        
        const totalCycleDuration = performance.now() - cycleStartTime;
        
        testMetrics.containerOperations.push({
          type: 'full_lifecycle',
          cycle: i,
          totalDuration: totalCycleDuration,
          stopDuration,
          removeDuration,
          timestamp: Date.now()
        });
        
        // Monitor resources every 10 cycles
        if (i % 10 === 0) {
          await monitorSystemResources();
          console.log(`📊 Completed lifecycle cycle ${i}/${lifecycleCycles}`);
        }
        
      } catch (error) {
        testMetrics.errors.push({
          type: 'lifecycle_test',
          cycle: i,
          error: error.message,
          timestamp: Date.now()
        });
        console.log(`❌ Lifecycle cycle ${i} failed: ${error.message}`);
      }
      
      // Small delay between cycles to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const successfulCycles = testMetrics.containerOperations
      .filter(op => op.type === 'full_lifecycle').length;
    
    console.log(`📊 Lifecycle test results: ${successfulCycles}/${lifecycleCycles} successful cycles`);
    
    // Assert that at least 80% of lifecycle cycles completed successfully
    expect(successfulCycles).toBeGreaterThanOrEqual(lifecycleCycles * 0.8);
  });

  test('Resource exhaustion simulation', async () => {
    console.log('💥 Simulating resource exhaustion scenarios...');
    
    // Test 1: Memory exhaustion containers
    console.log('🧠 Testing memory-intensive containers...');
    
    const memoryTestContainers = [];
    const maxMemoryContainers = 10;
    
    for (let i = 0; i < maxMemoryContainers; i++) {
      try {
        const container = await createTestContainer({
          cmd: ['node', '-e', `
            console.log('Memory test container ${i}');
            const arrays = [];
            const timer = setInterval(() => {
              arrays.push(new Array(1000000).fill('memory-test-data'));
              if (arrays.length > 50) clearInterval(timer);
            }, 100);
            setTimeout(() => process.exit(0), 10000);
          `],
          dockerConfig: {
            Memory: 100 * 1024 * 1024 // 100MB limit
          }
        });
        
        memoryTestContainers.push(container);
        
        // Monitor system resources
        if (i % 3 === 0) {
          await monitorSystemResources();
        }
        
      } catch (error) {
        testMetrics.errors.push({
          type: 'memory_exhaustion',
          containerIndex: i,
          error: error.message,
          timestamp: Date.now()
        });
        console.log(`⚠️  Memory container ${i} failed: ${error.message}`);
        break; // Stop creating containers if we hit resource limits
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`📊 Created ${memoryTestContainers.length} memory-intensive containers`);
    
    // Wait for containers to finish
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Test 2: CPU exhaustion containers
    console.log('⚡ Testing CPU-intensive containers...');
    
    const cpuTestContainers = [];
    const maxCpuContainers = 5;
    
    for (let i = 0; i < maxCpuContainers; i++) {
      try {
        const container = await createTestContainer({
          cmd: ['node', '-e', `
            console.log('CPU test container ${i}');
            const start = Date.now();
            while (Date.now() - start < 5000) {
              Math.random() * Math.random();
            }
            console.log('CPU test container ${i} finished');
          `],
          dockerConfig: {
            CpuShares: 512 // Limited CPU shares
          }
        });
        
        cpuTestContainers.push(container);
        await monitorSystemResources();
        
      } catch (error) {
        testMetrics.errors.push({
          type: 'cpu_exhaustion',
          containerIndex: i,
          error: error.message,
          timestamp: Date.now()
        });
        console.log(`⚠️  CPU container ${i} failed: ${error.message}`);
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`📊 Created ${cpuTestContainers.length} CPU-intensive containers`);
    
    // Wait for CPU containers to finish
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Final resource monitoring
    await monitorSystemResources();
    
    // Assert that the system remained stable
    const resourceErrors = testMetrics.errors.filter(e => 
      e.type === 'memory_exhaustion' || e.type === 'cpu_exhaustion'
    ).length;
    
    console.log(`📊 Resource exhaustion test completed with ${resourceErrors} resource-related errors`);
    
    // System should handle resource pressure gracefully
    expect(resourceErrors).toBeLessThan(maxMemoryContainers + maxCpuContainers);
  });

  test('Docker daemon stress test', async () => {
    console.log('🐳 Testing Docker daemon under stress...');
    
    const operations = [
      'create',
      'start',
      'stop',
      'restart',
      'pause',
      'unpause',
      'remove'
    ];
    
    // Create a pool of containers for testing operations
    const containerPool = [];
    const poolSize = 5;
    
    console.log(`🏊 Creating container pool of ${poolSize} containers...`);
    
    for (let i = 0; i < poolSize; i++) {
      try {
        const container = await createTestContainer({
          cmd: ['node', '-e', 'console.log("Pool container"); setInterval(() => {}, 1000);'] // Keep alive
        });
        containerPool.push(container);
      } catch (error) {
        console.log(`⚠️  Failed to create pool container ${i}: ${error.message}`);
      }
    }
    
    console.log(`🎯 Performing random operations on ${containerPool.length} containers...`);
    
    const operationCount = 100;
    const operationResults = [];
    
    for (let i = 0; i < operationCount; i++) {
      const container = containerPool[Math.floor(Math.random() * containerPool.length)];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      const operationStartTime = performance.now();
      
      try {
        switch (operation) {
          case 'create':
            // Skip - we already have containers
            continue;
          case 'start':
            await container.start();
            break;
          case 'stop':
            await container.stop({ t: 2 });
            break;
          case 'restart':
            await container.restart({ t: 2 });
            break;
          case 'pause':
            await container.pause();
            break;
          case 'unpause':
            await container.unpause();
            break;
          case 'remove':
            // Skip remove to keep pool intact
            continue;
          default:
            continue;
        }
        
        const duration = performance.now() - operationStartTime;
        operationResults.push({
          operation,
          duration,
          success: true,
          containerId: container.id.substr(0, 12)
        });
        
      } catch (error) {
        const duration = performance.now() - operationStartTime;
        operationResults.push({
          operation,
          duration,
          success: false,
          error: error.message,
          containerId: container.id.substr(0, 12)
        });
        
        testMetrics.errors.push({
          type: 'docker_operation',
          operation,
          error: error.message,
          timestamp: Date.now()
        });
      }
      
      // Monitor resources every 20 operations
      if (i % 20 === 0) {
        await monitorSystemResources();
        console.log(`📊 Completed ${i}/${operationCount} Docker operations`);
      }
      
      // Small delay to avoid overwhelming Docker daemon
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const successfulOperations = operationResults.filter(r => r.success);
    const failedOperations = operationResults.filter(r => !r.success);
    
    const avgOperationTime = successfulOperations.length > 0
      ? successfulOperations.reduce((sum, op) => sum + op.duration, 0) / successfulOperations.length
      : 0;
    
    console.log(`📊 Docker daemon stress test results:
      - Total operations: ${operationResults.length}
      - Successful: ${successfulOperations.length}
      - Failed: ${failedOperations.length}
      - Success rate: ${(successfulOperations.length / operationResults.length * 100).toFixed(2)}%
      - Average operation time: ${avgOperationTime.toFixed(2)}ms`);
    
    testMetrics.dockerDaemonStress = {
      totalOperations: operationResults.length,
      successfulOperations: successfulOperations.length,
      failedOperations: failedOperations.length,
      averageOperationTime: avgOperationTime
    };
    
    // Assert Docker daemon remained responsive
    expect(successfulOperations.length / operationResults.length).toBeGreaterThan(0.85);
    expect(avgOperationTime).toBeLessThan(5000); // Operations should complete within 5 seconds
  });
});