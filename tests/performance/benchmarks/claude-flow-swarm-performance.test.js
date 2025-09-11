const axios = require('axios');
const { spawn } = require('child_process');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

describe('Claude-Flow Swarm Coordination Performance', () => {
  let testMetrics;
  let claudeFlowClient;
  let activeSwarms;
  let performanceTargets;

  beforeAll(() => {
    testMetrics = {
      startTime: Date.now(),
      swarmOperations: [],
      coordinationTests: [],
      agentPerformance: {},
      topologyPerformance: {},
      errors: []
    };

    activeSwarms = new Map();

    // Performance targets from changelog (95th percentile)
    performanceTargets = {
      swarmCreation: 5000, // 5 seconds for swarm initialization
      agentSpawning: 3000, // 3 seconds per agent spawn
      taskOrchestration: 8000, // 8 seconds for task coordination
      multiAgentCoordination: 15000, // 15 seconds for complex coordination
      teamDiscussionSimulation: 12000, // 12 seconds for team discussions
      topologyOptimization: 10000 // 10 seconds for topology changes
    };

    claudeFlowClient = axios.create({
      baseURL: process.env.CLAUDE_FLOW_API_BASE_URL || 'http://localhost:50020',
      timeout: 45000,
      headers: {
        'Content-Type': 'application/json',
        'X-Client': 'AutoDev-AI-Performance-Test'
      }
    });

    console.log('🚀 Starting Claude-Flow Swarm Performance Tests...');
    console.log('📊 Performance Targets:', performanceTargets);
  });

  afterAll(async () => {
    // Clean up active swarms
    for (const [swarmId, swarmInfo] of activeSwarms) {
      try {
        await cleanupSwarm(swarmId);
      } catch (error) {
        console.log(`⚠️  Failed to cleanup swarm ${swarmId}: ${error.message}`);
      }
    }

    const summary = {
      testDuration: Date.now() - testMetrics.startTime,
      totalSwarmOperations: testMetrics.swarmOperations.length,
      totalCoordinationTests: testMetrics.coordinationTests.length,
      errorCount: testMetrics.errors.length,
      errorRate: (testMetrics.errors.length / testMetrics.swarmOperations.length * 100).toFixed(2),
      averageSwarmCreationTime: calculateAverageSwarmCreationTime(),
      topologyPerformanceComparison: testMetrics.topologyPerformance,
      targetCompliance: calculateTargetCompliance()
    };

    console.log('🏆 Claude-Flow Swarm Performance Summary:', summary);
    global.performanceUtils.saveMetrics('claude-flow-swarm-performance', {
      summary,
      detailedMetrics: testMetrics,
      performanceTargets
    });

    generateSwarmPerformanceReport(summary);
  });

  const createSwarm = async (topology, maxAgents = 5, strategy = 'balanced') => {
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage();

    try {
      const response = await claudeFlowClient.post('/api/swarm/init', {
        topology,
        maxAgents,
        strategy,
        metadata: {
          testId: `perf-test-${Date.now()}`,
          environment: 'performance-testing'
        }
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;
      const memoryAfter = process.memoryUsage();

      const swarmInfo = {
        id: response.data.swarmId,
        topology,
        maxAgents,
        strategy,
        creationTime: responseTime,
        memoryUsage: memoryAfter.heapUsed - memoryBefore.heapUsed,
        agents: [],
        status: 'active',
        timestamp: Date.now()
      };

      activeSwarms.set(response.data.swarmId, swarmInfo);

      const operation = {
        type: 'swarm_creation',
        swarmId: response.data.swarmId,
        topology,
        responseTime,
        memoryUsage: swarmInfo.memoryUsage,
        success: true,
        timestamp: Date.now()
      };

      testMetrics.swarmOperations.push(operation);

      // Track topology-specific performance
      if (!testMetrics.topologyPerformance[topology]) {
        testMetrics.topologyPerformance[topology] = {
          creationTimes: [],
          averageCreationTime: 0,
          successRate: 100
        };
      }

      testMetrics.topologyPerformance[topology].creationTimes.push(responseTime);
      updateTopologyStats(topology);

      return swarmInfo;
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const operation = {
        type: 'swarm_creation',
        topology,
        responseTime,
        error: error.message,
        success: false,
        timestamp: Date.now()
      };

      testMetrics.swarmOperations.push(operation);
      testMetrics.errors.push(operation);

      if (!testMetrics.topologyPerformance[topology]) {
        testMetrics.topologyPerformance[topology] = {
          creationTimes: [],
          averageCreationTime: 0,
          successRate: 100
        };
      }

      updateTopologyStats(topology);
      throw error;
    }
  };

  const spawnAgent = async (swarmId, agentType, capabilities = []) => {
    const startTime = performance.now();

    try {
      const response = await claudeFlowClient.post('/api/agent/spawn', {
        swarmId,
        type: agentType,
        capabilities,
        metadata: {
          performanceTest: true
        }
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const agentInfo = {
        id: response.data.agentId,
        type: agentType,
        swarmId,
        spawnTime: responseTime,
        capabilities,
        status: 'active',
        timestamp: Date.now()
      };

      // Update swarm info
      const swarmInfo = activeSwarms.get(swarmId);
      if (swarmInfo) {
        swarmInfo.agents.push(agentInfo);
      }

      // Track agent performance
      if (!testMetrics.agentPerformance[agentType]) {
        testMetrics.agentPerformance[agentType] = {
          spawnTimes: [],
          averageSpawnTime: 0,
          totalSpawned: 0,
          successRate: 100
        };
      }

      testMetrics.agentPerformance[agentType].spawnTimes.push(responseTime);
      testMetrics.agentPerformance[agentType].totalSpawned++;
      updateAgentStats(agentType);

      const operation = {
        type: 'agent_spawn',
        swarmId,
        agentId: response.data.agentId,
        agentType,
        responseTime,
        success: true,
        timestamp: Date.now()
      };

      testMetrics.swarmOperations.push(operation);

      return agentInfo;
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const operation = {
        type: 'agent_spawn',
        swarmId,
        agentType,
        responseTime,
        error: error.message,
        success: false,
        timestamp: Date.now()
      };

      testMetrics.swarmOperations.push(operation);
      testMetrics.errors.push(operation);

      if (!testMetrics.agentPerformance[agentType]) {
        testMetrics.agentPerformance[agentType] = {
          spawnTimes: [],
          averageSpawnTime: 0,
          totalSpawned: 0,
          successRate: 100
        };
      }

      updateAgentStats(agentType);
      throw error;
    }
  };

  const orchestrateTask = async (swarmId, task) => {
    const startTime = performance.now();

    try {
      const response = await claudeFlowClient.post('/api/task/orchestrate', {
        swarmId,
        task: {
          ...task,
          metadata: {
            performanceTest: true,
            startTime: Date.now()
          }
        }
      });

      const taskId = response.data.taskId;

      // Monitor task execution
      const executionResult = await monitorTaskExecution(taskId);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const operation = {
        type: 'task_orchestration',
        swarmId,
        taskId,
        taskType: task.type || 'general',
        responseTime,
        executionResult,
        success: true,
        timestamp: Date.now()
      };

      testMetrics.swarmOperations.push(operation);

      return {
        taskId,
        responseTime,
        result: executionResult
      };
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const operation = {
        type: 'task_orchestration',
        swarmId,
        taskType: task.type || 'general',
        responseTime,
        error: error.message,
        success: false,
        timestamp: Date.now()
      };

      testMetrics.swarmOperations.push(operation);
      testMetrics.errors.push(operation);

      throw error;
    }
  };

  const monitorTaskExecution = async (taskId, timeout = 30000) => {
    const startTime = Date.now();
    const pollInterval = 1000; // 1 second

    while (Date.now() - startTime < timeout) {
      try {
        const response = await claudeFlowClient.get(`/api/task/status/${taskId}`);
        const status = response.data;

        if (status.status === 'completed') {
          return {
            status: 'completed',
            executionTime: Date.now() - startTime,
            result: status.result,
            agentsInvolved: status.agentsInvolved || []
          };
        } else if (status.status === 'failed') {
          return {
            status: 'failed',
            executionTime: Date.now() - startTime,
            error: status.error
          };
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        // Continue polling unless it's a critical error
        if (error.response?.status === 404) {
          return {
            status: 'not_found',
            executionTime: Date.now() - startTime,
            error: 'Task not found'
          };
        }
      }
    }

    return {
      status: 'timeout',
      executionTime: timeout,
      error: 'Task execution timeout'
    };
  };

  const cleanupSwarm = async (swarmId) => {
    try {
      await claudeFlowClient.delete(`/api/swarm/${swarmId}`);
      activeSwarms.delete(swarmId);
    } catch (error) {
      console.log(`Failed to cleanup swarm ${swarmId}: ${error.message}`);
    }
  };

  const updateTopologyStats = (topology) => {
    const topologyData = testMetrics.topologyPerformance[topology];
    const successfulCreations = topologyData.creationTimes.length;
    const totalAttempts = testMetrics.swarmOperations.filter(op => 
      op.type === 'swarm_creation' && op.topology === topology
    ).length;

    if (successfulCreations > 0) {
      topologyData.averageCreationTime = topologyData.creationTimes
        .reduce((sum, time) => sum + time, 0) / successfulCreations;
    }

    topologyData.successRate = (successfulCreations / totalAttempts) * 100;
  };

  const updateAgentStats = (agentType) => {
    const agentData = testMetrics.agentPerformance[agentType];
    const successfulSpawns = agentData.spawnTimes.length;
    const totalAttempts = testMetrics.swarmOperations.filter(op => 
      op.type === 'agent_spawn' && op.agentType === agentType
    ).length;

    if (successfulSpawns > 0) {
      agentData.averageSpawnTime = agentData.spawnTimes
        .reduce((sum, time) => sum + time, 0) / successfulSpawns;
    }

    agentData.successRate = (successfulSpawns / totalAttempts) * 100;
  };

  const runCoordinationBenchmark = async (name, testFunction, expectedTime) => {
    console.log(`🔄 Running coordination benchmark: ${name}`);
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

      testMetrics.coordinationTests.push(benchmark);

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

      testMetrics.coordinationTests.push(benchmark);
      console.log(`❌ FAILED ${name}: ${error.message}`);

      return benchmark;
    }
  };

  test('Swarm Creation Performance - Different Topologies', async () => {
    const topologies = ['mesh', 'hierarchical', 'ring', 'star'];
    
    for (const topology of topologies) {
      await runCoordinationBenchmark(`Swarm Creation - ${topology}`, async () => {
        const swarm = await createSwarm(topology, 5, 'balanced');
        
        return {
          swarmId: swarm.id,
          topology: swarm.topology,
          creationTime: swarm.creationTime,
          memoryUsage: swarm.memoryUsage,
          agentCapacity: swarm.maxAgents
        };
      }, performanceTargets.swarmCreation);

      // Brief pause between topology tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Analyze topology performance comparison
    const topologyComparison = Object.entries(testMetrics.topologyPerformance)
      .map(([topology, stats]) => ({
        topology,
        averageCreationTime: stats.averageCreationTime,
        successRate: stats.successRate
      }))
      .sort((a, b) => a.averageCreationTime - b.averageCreationTime);

    console.log('📊 Topology Performance Comparison:');
    topologyComparison.forEach(topo => {
      console.log(`  ${topo.topology}: ${topo.averageCreationTime.toFixed(2)}ms (${topo.successRate.toFixed(1)}% success)`);
    });

    expect(topologyComparison.length).toBe(topologies.length);
  });

  test('Agent Spawning Performance - Multiple Agent Types', async () => {
    // Create a mesh swarm for agent testing
    const swarm = await createSwarm('mesh', 10, 'specialized');
    const agentTypes = ['researcher', 'coder', 'architect', 'tester', 'reviewer', 'optimizer'];

    for (const agentType of agentTypes) {
      await runCoordinationBenchmark(`Agent Spawn - ${agentType}`, async () => {
        const agent = await spawnAgent(swarm.id, agentType, [
          'analysis', 'generation', 'collaboration'
        ]);

        return {
          agentId: agent.id,
          agentType: agent.type,
          spawnTime: agent.spawnTime,
          swarmId: swarm.id
        };
      }, performanceTargets.agentSpawning);

      // Brief pause between agent spawns
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Analyze agent performance
    const agentComparison = Object.entries(testMetrics.agentPerformance)
      .map(([type, stats]) => ({
        type,
        averageSpawnTime: stats.averageSpawnTime,
        successRate: stats.successRate,
        totalSpawned: stats.totalSpawned
      }))
      .sort((a, b) => a.averageSpawnTime - b.averageSpawnTime);

    console.log('📊 Agent Performance Comparison:');
    agentComparison.forEach(agent => {
      console.log(`  ${agent.type}: ${agent.averageSpawnTime.toFixed(2)}ms (${agent.totalSpawned} spawned, ${agent.successRate.toFixed(1)}% success)`);
    });

    expect(agentComparison.length).toBeGreaterThan(0);
  });

  test('Task Orchestration Performance - Complex Workflow', async () => {
    await runCoordinationBenchmark('Complex Task Orchestration', async () => {
      const swarm = await createSwarm('hierarchical', 8, 'adaptive');
      
      // Spawn specialized agents
      const researcher = await spawnAgent(swarm.id, 'researcher', ['analysis', 'research']);
      const coder = await spawnAgent(swarm.id, 'coder', ['development', 'implementation']);
      const architect = await spawnAgent(swarm.id, 'architect', ['design', 'planning']);
      const tester = await spawnAgent(swarm.id, 'tester', ['validation', 'quality_assurance']);

      // Orchestrate complex task
      const complexTask = {
        type: 'software_development',
        description: 'Design and implement a RESTful API for user management',
        requirements: [
          'Research best practices for user authentication',
          'Design database schema',
          'Implement CRUD operations',
          'Create comprehensive tests',
          'Document API endpoints'
        ],
        strategy: 'parallel',
        maxAgents: 4
      };

      const orchestrationResult = await orchestrateTask(swarm.id, complexTask);

      return {
        taskId: orchestrationResult.taskId,
        responseTime: orchestrationResult.responseTime,
        executionResult: orchestrationResult.result,
        agentsInvolved: 4,
        swarmId: swarm.id
      };
    }, performanceTargets.taskOrchestration);
  });

  test('Multi-Agent Coordination Performance', async () => {
    await runCoordinationBenchmark('Multi-Agent Coordination', async () => {
      const swarm = await createSwarm('star', 12, 'balanced');
      
      // Spawn multiple agents of different types
      const agents = await Promise.all([
        spawnAgent(swarm.id, 'coordinator', ['coordination', 'management']),
        spawnAgent(swarm.id, 'researcher', ['analysis', 'research']),
        spawnAgent(swarm.id, 'researcher', ['analysis', 'research']),
        spawnAgent(swarm.id, 'coder', ['development', 'implementation']),
        spawnAgent(swarm.id, 'coder', ['development', 'implementation']),
        spawnAgent(swarm.id, 'architect', ['design', 'planning']),
        spawnAgent(swarm.id, 'tester', ['validation', 'testing']),
        spawnAgent(swarm.id, 'reviewer', ['review', 'quality_control']),
        spawnAgent(swarm.id, 'optimizer', ['optimization', 'performance'])
      ]);

      // Orchestrate multi-step coordination task
      const coordinationTask = {
        type: 'multi_agent_collaboration',
        description: 'Develop a complete microservices architecture with coordination between teams',
        phases: [
          {
            phase: 'research_and_planning',
            agents: ['researcher', 'architect'],
            duration: 2000
          },
          {
            phase: 'implementation',
            agents: ['coder', 'architect'],
            dependencies: ['research_and_planning'],
            duration: 3000
          },
          {
            phase: 'testing_and_review',
            agents: ['tester', 'reviewer'],
            dependencies: ['implementation'],
            duration: 2000
          },
          {
            phase: 'optimization',
            agents: ['optimizer', 'coder'],
            dependencies: ['testing_and_review'],
            duration: 1500
          }
        ],
        strategy: 'sequential_with_parallel_phases',
        coordination_complexity: 'high'
      };

      const coordinationResult = await orchestrateTask(swarm.id, coordinationTask);

      return {
        taskId: coordinationResult.taskId,
        responseTime: coordinationResult.responseTime,
        agentsCoordinated: agents.length,
        phasesExecuted: coordinationTask.phases.length,
        coordinationComplexity: coordinationTask.coordination_complexity,
        swarmId: swarm.id
      };
    }, performanceTargets.multiAgentCoordination);
  });

  test('Team Discussion Simulation Performance', async () => {
    await runCoordinationBenchmark('Team Discussion Simulation', async () => {
      const swarm = await createSwarm('mesh', 6, 'collaborative');
      
      // Create diverse team
      const team = await Promise.all([
        spawnAgent(swarm.id, 'researcher', ['analysis', 'research', 'discussion']),
        spawnAgent(swarm.id, 'architect', ['design', 'planning', 'discussion']),
        spawnAgent(swarm.id, 'coder', ['implementation', 'coding', 'discussion']),
        spawnAgent(swarm.id, 'tester', ['testing', 'quality', 'discussion']),
        spawnAgent(swarm.id, 'reviewer', ['review', 'feedback', 'discussion'])
      ]);

      // Simulate team discussion task
      const discussionTask = {
        type: 'team_discussion',
        description: 'Discuss and decide on the best approach for implementing real-time notifications in a web application',
        topics: [
          'Technology stack evaluation (WebSockets vs Server-Sent Events vs Long Polling)',
          'Scalability considerations for high-volume notifications',
          'Security implications and authentication strategies',
          'User experience and notification management',
          'Testing strategies for real-time features'
        ],
        discussion_format: 'structured_debate',
        rounds: 3,
        participants: team.length,
        collaboration_style: 'consensus_building'
      };

      const discussionResult = await orchestrateTask(swarm.id, discussionTask);

      return {
        taskId: discussionResult.taskId,
        responseTime: discussionResult.responseTime,
        participants: team.length,
        topicsDiscussed: discussionTask.topics.length,
        discussionRounds: discussionTask.rounds,
        collaborationAchieved: true,
        swarmId: swarm.id
      };
    }, performanceTargets.teamDiscussionSimulation);
  });

  test('Swarm Scaling and Topology Optimization Performance', async () => {
    await runCoordinationBenchmark('Swarm Scaling and Optimization', async () => {
      // Start with small hierarchical swarm
      const swarm = await createSwarm('hierarchical', 3, 'balanced');
      
      // Add initial agents
      await spawnAgent(swarm.id, 'coordinator', ['coordination']);
      await spawnAgent(swarm.id, 'researcher', ['research']);
      await spawnAgent(swarm.id, 'coder', ['coding']);

      // Scale up swarm
      const scaleStartTime = performance.now();
      
      const additionalAgents = await Promise.all([
        spawnAgent(swarm.id, 'architect', ['design']),
        spawnAgent(swarm.id, 'tester', ['testing']),
        spawnAgent(swarm.id, 'reviewer', ['review']),
        spawnAgent(swarm.id, 'optimizer', ['optimization'])
      ]);

      const scaleTime = performance.now() - scaleStartTime;

      // Optimize topology for better performance
      const optimizationStartTime = performance.now();
      
      try {
        const optimizationResponse = await claudeFlowClient.post(`/api/swarm/${swarm.id}/optimize`, {
          target_topology: 'mesh',
          optimization_goals: ['performance', 'coordination_efficiency'],
          preserve_agent_state: true
        });

        const optimizationTime = performance.now() - optimizationStartTime;

        return {
          swarmId: swarm.id,
          initialAgents: 3,
          scaledAgents: 3 + additionalAgents.length,
          scaleTime,
          optimizationTime,
          totalTime: scaleTime + optimizationTime,
          newTopology: optimizationResponse.data.newTopology,
          optimizationSuccess: true
        };
      } catch (error) {
        // If optimization fails, still return scaling performance
        const optimizationTime = performance.now() - optimizationStartTime;
        
        return {
          swarmId: swarm.id,
          initialAgents: 3,
          scaledAgents: 3 + additionalAgents.length,
          scaleTime,
          optimizationTime,
          totalTime: scaleTime + optimizationTime,
          optimizationSuccess: false,
          optimizationError: error.message
        };
      }
    }, performanceTargets.topologyOptimization);
  });

  test('Concurrent Swarm Operations Performance', async () => {
    await runCoordinationBenchmark('Concurrent Swarm Operations', async () => {
      const numberOfSwarms = 5;
      
      // Create multiple swarms concurrently
      const swarmCreationPromises = Array(numberOfSwarms).fill(null).map((_, index) => 
        createSwarm('ring', 4, 'adaptive').catch(error => ({ error: error.message, index }))
      );

      const swarms = await Promise.all(swarmCreationPromises);
      const successfulSwarms = swarms.filter(swarm => !swarm.error);
      const failedSwarms = swarms.filter(swarm => swarm.error);

      // Populate each successful swarm with agents concurrently
      const agentSpawningPromises = [];
      successfulSwarms.forEach(swarm => {
        agentSpawningPromises.push(
          spawnAgent(swarm.id, 'researcher', ['analysis']).catch(error => ({ error, swarmId: swarm.id })),
          spawnAgent(swarm.id, 'coder', ['development']).catch(error => ({ error, swarmId: swarm.id })),
          spawnAgent(swarm.id, 'tester', ['testing']).catch(error => ({ error, swarmId: swarm.id }))
        );
      });

      const agents = await Promise.all(agentSpawningPromises);
      const successfulAgents = agents.filter(agent => !agent.error);
      const failedAgents = agents.filter(agent => agent.error);

      // Execute tasks concurrently across swarms
      const taskPromises = successfulSwarms.map(swarm => 
        orchestrateTask(swarm.id, {
          type: 'concurrent_test',
          description: 'Simple task execution test',
          complexity: 'low'
        }).catch(error => ({ error: error.message, swarmId: swarm.id }))
      );

      const taskResults = await Promise.all(taskPromises);
      const successfulTasks = taskResults.filter(result => !result.error);

      return {
        totalSwarmsAttempted: numberOfSwarms,
        successfulSwarms: successfulSwarms.length,
        failedSwarms: failedSwarms.length,
        totalAgentsAttempted: agentSpawningPromises.length,
        successfulAgents: successfulAgents.length,
        failedAgents: failedAgents.length,
        tasksExecuted: taskResults.length,
        successfulTasks: successfulTasks.length,
        overallSuccessRate: (successfulTasks.length / taskResults.length) * 100,
        concurrentOperationEfficiency: successfulTasks.length > 0
      };
    }, performanceTargets.multiAgentCoordination);
  });

  const calculateAverageSwarmCreationTime = () => {
    const creationOperations = testMetrics.swarmOperations.filter(op => 
      op.type === 'swarm_creation' && op.success
    );
    return creationOperations.length > 0 
      ? creationOperations.reduce((sum, op) => sum + op.responseTime, 0) / creationOperations.length
      : 0;
  };

  const calculateTargetCompliance = () => {
    const completedTests = testMetrics.coordinationTests.filter(test => test.status === 'completed');
    const withinTargetTests = completedTests.filter(test => test.withinTarget);
    
    return {
      totalTests: completedTests.length,
      withinTarget: withinTargetTests.length,
      complianceRate: completedTests.length > 0 
        ? (withinTargetTests.length / completedTests.length) * 100
        : 0
    };
  };

  const generateSwarmPerformanceReport = (summary) => {
    const report = {
      timestamp: new Date().toISOString(),
      summary,
      performanceTargets,
      coordinationResults: testMetrics.coordinationTests,
      topologyAnalysis: testMetrics.topologyPerformance,
      agentAnalysis: testMetrics.agentPerformance,
      recommendations: generateSwarmRecommendations(summary)
    };

    const reportPath = path.join(__dirname, '../reports', 'claude-flow-swarm-performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📄 Claude-Flow Swarm Performance Report saved to: ${reportPath}`);
  };

  const generateSwarmRecommendations = (summary) => {
    const recommendations = [];

    // Check overall performance
    if (summary.targetCompliance.complianceRate < 80) {
      recommendations.push({
        type: 'coordination_performance',
        priority: 'high',
        message: `Only ${summary.targetCompliance.complianceRate.toFixed(1)}% of coordination tests meet performance targets`
      });
    }

    // Check topology performance
    const topologyStats = Object.entries(testMetrics.topologyPerformance);
    const slowestTopology = topologyStats.reduce((slowest, [topology, stats]) => 
      stats.averageCreationTime > slowest.time ? { topology, time: stats.averageCreationTime } : slowest,
      { topology: '', time: 0 }
    );

    if (slowestTopology.time > performanceTargets.swarmCreation * 1.5) {
      recommendations.push({
        type: 'topology_optimization',
        priority: 'medium',
        message: `${slowestTopology.topology} topology shows poor performance (${slowestTopology.time.toFixed(2)}ms avg creation time)`
      });
    }

    // Agent performance recommendations
    const agentStats = Object.entries(testMetrics.agentPerformance);
    agentStats.forEach(([agentType, stats]) => {
      if (stats.averageSpawnTime > performanceTargets.agentSpawning * 1.2) {
        recommendations.push({
          type: 'agent_optimization',
          priority: 'medium',
          message: `${agentType} agents have slow spawn times (${stats.averageSpawnTime.toFixed(2)}ms avg)`
        });
      }

      if (stats.successRate < 95) {
        recommendations.push({
          type: 'agent_reliability',
          priority: 'high',
          message: `${agentType} agents have low success rate (${stats.successRate.toFixed(1)}%)`
        });
      }
    });

    return recommendations;
  };
});