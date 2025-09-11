# AutoDev-AI Integration API Documentation

## Overview

The AutoDev-AI integration system provides a comprehensive API for orchestrating AI agents through
OpenRouter and Claude-Flow. This system enables dual-mode orchestration with intelligent model
selection, agent coordination, and advanced code generation capabilities.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Claude-Flow    │    │   OpenRouter     │    │   Codex         │
│  Orchestrator   │◄──►│   Client         │◄──►│   Integration   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Agent Swarms   │    │  Model Selection │    │  Code Analysis  │
│  & Coordination │    │  & Optimization  │    │  & Generation   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Services

### OpenRouter Client

The OpenRouter client handles multi-model AI orchestration with intelligent model selection based on
task complexity and requirements.

#### Key Features

- **Adaptive Model Selection**: Automatically selects optimal models based on task analysis
- **Fallback Mechanisms**: Provides robust error handling with model fallbacks
- **Performance Tracking**: Monitors model performance and costs
- **Cost Optimization**: Balances performance with cost efficiency

#### Configuration

```typescript
const config: OpenRouterConfig = {
  apiKey: 'your-openrouter-api-key',
  baseUrl: 'https://openrouter.ai/api/v1',
  defaultModel: 'anthropic/claude-3.5-sonnet',
  fallbackModels: ['anthropic/claude-3-haiku', 'openai/gpt-4-turbo', 'openai/gpt-3.5-turbo'],
  timeout: 30000,
  retryAttempts: 3,
};

const client = new OpenRouterClient(config);
```

#### Model Capabilities Matrix

| Model             | Reasoning | Coding | Analysis | Creativity | Speed | Cost |
| ----------------- | --------- | ------ | -------- | ---------- | ----- | ---- |
| Claude 3.5 Sonnet | 9.5       | 9.8    | 9.6      | 8.8        | 7.5   | 3.0  |
| Claude 3 Haiku    | 8.5       | 8.7    | 8.8      | 7.5        | 9.5   | 9.0  |
| GPT-4 Turbo       | 9.2       | 9.0    | 9.3      | 9.0        | 8.0   | 4.0  |
| GPT-3.5 Turbo     | 7.8       | 8.2    | 8.0      | 7.5        | 9.8   | 9.5  |
| CodeLlama 34B     | 7.5       | 9.8    | 7.2      | 6.0        | 8.8   | 8.0  |

### Claude-Flow Orchestrator

Manages AI agent swarms with sophisticated coordination protocols.

#### Swarm Topologies

- **Mesh**: Peer-to-peer communication, best for collaborative tasks
- **Hierarchical**: Tree structure, optimal for complex project management
- **Ring**: Circular coordination, efficient for sequential processing
- **Star**: Centralized coordination, ideal for simple task distribution

#### Agent Types

| Agent Type  | Specialization                               | Complexity Handling | Coordination Level |
| ----------- | -------------------------------------------- | ------------------- | ------------------ |
| Researcher  | Analysis, Investigation, Data Gathering      | 8.5                 | 7.0                |
| Coder       | Implementation, Debugging, Optimization      | 9.2                 | 8.5                |
| Architect   | System Design, Architecture, Planning        | 9.8                 | 9.5                |
| Tester      | Testing, Quality Assurance, Validation       | 8.0                 | 7.5                |
| Reviewer    | Code Review, Security, Best Practices        | 8.8                 | 8.0                |
| Optimizer   | Performance, Efficiency, Bottleneck Analysis | 9.0                 | 7.8                |
| Coordinator | Orchestration, Communication, Workflow       | 7.5                 | 9.8                |

### Codex Integration

Specialized code generation and analysis service using OpenAI models optimized for different
programming languages.

#### Language Specialists

| Language              | Optimal Model     | Specialization           |
| --------------------- | ----------------- | ------------------------ |
| TypeScript/JavaScript | Claude 3.5 Sonnet | Web development, Node.js |
| Python                | Claude 3.5 Sonnet | Data science, AI/ML      |
| Rust                  | Claude 3.5 Sonnet | Systems programming      |
| Go                    | GPT-4 Turbo       | Backend services         |
| Java                  | GPT-4 Turbo       | Enterprise applications  |
| C/C++                 | CodeLlama 34B     | Low-level optimization   |
| SQL                   | PaLM 2 CodeChat   | Database operations      |

## API Reference

### OpenRouter Client

#### `selectOptimalModel(task, complexity, constraints)`

Selects the best model for a given task based on requirements and constraints.

**Parameters:**

- `task` (string): Task description
- `complexity` (TaskComplexity): Complexity metrics
- `constraints` (object): Performance and cost constraints

**Returns:** Promise<string> - Selected model name

**Example:**

```typescript
const model = await client.selectOptimalModel(
  'Implement a distributed caching system',
  {
    computational: 0.8,
    logical: 0.9,
    creative: 0.6,
    domain_specific: 0.8,
  },
  {
    maxCost: 5.0,
    minSpeed: 7.0,
    prioritizeSpeed: false,
  }
);
```

#### `completion(params)`

Generates AI completion with automatic model selection and fallback handling.

**Parameters:**

- `model` (string, optional): Specific model to use
- `messages` (Array): Conversation messages
- `temperature` (number, optional): Response randomness (0-1)
- `max_tokens` (number, optional): Maximum response length
- `task_description` (string, optional): Task context for model selection
- `complexity` (TaskComplexity, optional): Task complexity metrics
- `constraints` (object, optional): Performance constraints

**Returns:** Promise<OpenRouterResponse>

### Claude-Flow Orchestrator

#### `initializeSwarm(topology)`

Creates a new agent swarm with specified topology.

**Parameters:**

- `topology` (SwarmTopology): Swarm configuration

**Returns:** Promise<string> - Swarm ID

**Example:**

```typescript
const swarmId = await orchestrator.initializeSwarm({
  type: 'mesh',
  maxAgents: 8,
  strategy: 'specialized',
});
```

#### `spawnAgent(swarmId, agentType, customCapabilities?)`

Spawns a new agent in the specified swarm.

**Parameters:**

- `swarmId` (string): Target swarm identifier
- `agentType` (string): Agent specialization type
- `customCapabilities` (string[], optional): Additional capabilities

**Returns:** Promise<string> - Agent ID

#### `orchestrateTask(params)`

Orchestrates a task across multiple agents with intelligent coordination.

**Parameters:**

- `swarmId` (string): Target swarm
- `task` (string): Task description
- `priority` (TaskPriority): Task priority and dependencies
- `complexity` (TaskComplexity): Task complexity metrics
- `maxAgents` (number, optional): Maximum agents to use
- `strategy` ('parallel' | 'sequential' | 'adaptive', optional): Execution strategy

**Returns:** Promise<string> - Task ID

**Example:**

```typescript
const taskId = await orchestrator.orchestrateTask({
  swarmId: 'swarm_123',
  task: 'Build a REST API with authentication',
  priority: { level: 'high', dependencies: [] },
  complexity: {
    computational: 0.7,
    logical: 0.8,
    creative: 0.5,
    domain_specific: 0.9,
  },
  maxAgents: 4,
  strategy: 'adaptive',
});
```

#### `simulateTeamDiscussion(topic, participants)`

Simulates a team discussion with multiple AI agents.

**Parameters:**

- `topic` (string): Discussion topic
- `participants` (string[]): Agent types to participate

**Returns:** Promise<string> - Discussion transcript

### Codex Integration

#### `generateCode(request)`

Generates code based on specific requirements and language.

**Parameters:**

- `request` (CodexRequest): Code generation request

**Returns:** Promise<CodexResponse>

**Example:**

```typescript
const result = await codex.generateCode({
  prompt: 'Create a binary search tree implementation',
  language: 'typescript',
  task_type: 'generation',
  context: 'For a data structures library',
  max_tokens: 1500,
  temperature: 0.3,
});
```

#### `analyzeCode(code, language)`

Analyzes code for quality, security, and performance issues.

**Parameters:**

- `code` (string): Source code to analyze
- `language` (string): Programming language

**Returns:** Promise<CodeAnalysis>

#### `optimizeCode(code, language, focusAreas?)`

Optimizes code for performance, readability, or other criteria.

**Parameters:**

- `code` (string): Source code to optimize
- `language` (string): Programming language
- `focusAreas` (string[], optional): Optimization focus areas

**Returns:** Promise<CodeOptimization>

#### `debugCode(code, language, error_message?)`

Debugs code and provides corrected versions.

**Parameters:**

- `code` (string): Code with bugs
- `language` (string): Programming language
- `error_message` (string, optional): Error message context

**Returns:** Promise<CodexResponse>

## Integration Patterns

### Task Routing

Tasks are automatically routed to optimal agents based on complexity analysis:

```typescript
// High complexity → Sequential execution with handoffs
if (complexityScore > 0.7 && agentCount > 1) {
  await executeSequentialTask(task);
} else {
  // Lower complexity → Parallel execution
  await executeParallelTask(task);
}
```

### Quality Control

Multi-layer quality assurance through agent coordination:

1. **Generation Phase**: Code generation with optimal model selection
2. **Review Phase**: Automated code review by reviewer agent
3. **Testing Phase**: Test generation and execution by tester agent
4. **Optimization Phase**: Performance optimization by optimizer agent

### Error Recovery

Robust error handling with automatic fallbacks:

1. **Model Fallback**: Switch to alternative models on API failures
2. **Agent Redistribution**: Reassign tasks if agents become unavailable
3. **Strategy Adaptation**: Change execution strategy based on performance
4. **Context Preservation**: Maintain task context through failures

### Performance Monitoring

Real-time monitoring of system performance:

- **Response Times**: Track model and agent response times
- **Cost Analysis**: Monitor API costs and optimize usage
- **Success Rates**: Track task completion rates
- **Quality Metrics**: Assess output quality and user satisfaction

## Authentication & Configuration

### Environment Variables

```bash
OPENROUTER_API_KEY=your_openrouter_api_key
CLAUDE_FLOW_SESSION_ID=session_identifier
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_COST_OPTIMIZATION=true
DEFAULT_TEMPERATURE=0.7
MAX_RETRY_ATTEMPTS=3
```

### Configuration File

```json
{
  "openrouter": {
    "baseUrl": "https://openrouter.ai/api/v1",
    "timeout": 30000,
    "defaultModel": "anthropic/claude-3.5-sonnet"
  },
  "claudeFlow": {
    "defaultTopology": "mesh",
    "maxAgents": 8,
    "enableHooks": true
  },
  "codex": {
    "defaultTemperature": 0.3,
    "maxTokens": 2000,
    "enableOptimization": true
  }
}
```

## Error Handling

### Common Error Codes

| Code                   | Description                     | Recovery Action                   |
| ---------------------- | ------------------------------- | --------------------------------- |
| `MODEL_UNAVAILABLE`    | Selected model is not available | Switch to fallback model          |
| `RATE_LIMIT_EXCEEDED`  | API rate limit reached          | Implement exponential backoff     |
| `SWARM_NOT_FOUND`      | Invalid swarm ID                | Verify swarm exists or create new |
| `AGENT_SPAWN_FAILED`   | Agent creation failed           | Retry with different agent type   |
| `TASK_TIMEOUT`         | Task execution timed out        | Increase timeout or split task    |
| `INSUFFICIENT_CREDITS` | API credits exhausted           | Check billing or reduce usage     |

### Error Recovery Strategies

```typescript
try {
  const result = await client.completion(params);
  return result;
} catch (error) {
  if (error.code === 'MODEL_UNAVAILABLE') {
    // Try fallback model
    return await client.completion({
      ...params,
      model: 'anthropic/claude-3-haiku',
    });
  }

  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Exponential backoff
    await delay(Math.pow(2, retryCount) * 1000);
    return await client.completion(params);
  }

  throw error;
}
```

## Best Practices

### Model Selection

- Use Claude 3.5 Sonnet for complex reasoning and coding tasks
- Use Claude 3 Haiku for fast, simple operations
- Use GPT-4 Turbo for creative and general-purpose tasks
- Use CodeLlama for specialized C/C++ optimization

### Agent Coordination

- Start with mesh topology for collaborative projects
- Use hierarchical topology for large, structured projects
- Limit concurrent agents to optimize performance
- Enable hooks for automatic coordination

### Cost Optimization

- Set cost constraints for budget-sensitive operations
- Use faster, cheaper models for simple tasks
- Monitor token usage and implement caching
- Batch similar requests for efficiency

### Performance Tuning

- Adjust temperature based on task type (lower for code, higher for creativity)
- Set appropriate max_tokens to avoid truncation
- Use parallel execution for independent tasks
- Implement result caching for repeated operations

## Examples

### Complete Integration Setup

```typescript
import { OpenRouterClient, ClaudeFlowOrchestrator, CodexIntegration } from './services';

// Initialize services
const openRouter = new OpenRouterClient({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseUrl: 'https://openrouter.ai/api/v1',
  defaultModel: 'anthropic/claude-3.5-sonnet',
  fallbackModels: ['anthropic/claude-3-haiku', 'openai/gpt-4-turbo'],
  timeout: 30000,
  retryAttempts: 3,
});

const orchestrator = new ClaudeFlowOrchestrator(openRouter);
const codex = new CodexIntegration(openRouter);

// Create development swarm
const swarmId = await orchestrator.initializeSwarm({
  type: 'mesh',
  maxAgents: 6,
  strategy: 'specialized',
});

// Spawn specialized agents
const agents = await Promise.all([
  orchestrator.spawnAgent(swarmId, 'architect'),
  orchestrator.spawnAgent(swarmId, 'coder'),
  orchestrator.spawnAgent(swarmId, 'tester'),
  orchestrator.spawnAgent(swarmId, 'reviewer'),
]);

// Execute complex development task
const taskId = await orchestrator.orchestrateTask({
  swarmId,
  task: 'Build a microservices architecture with authentication',
  priority: { level: 'high', dependencies: [] },
  complexity: {
    computational: 0.8,
    logical: 0.9,
    creative: 0.6,
    domain_specific: 0.9,
  },
  strategy: 'adaptive',
});

// Generate specific code components
const authService = await codex.generateCode({
  prompt: 'JWT authentication service with refresh tokens',
  language: 'typescript',
  task_type: 'generation',
  context: 'Express.js microservice',
});

// Monitor progress
const status = await orchestrator.getTaskStatus(taskId);
console.log('Task status:', status);
```

This API documentation provides comprehensive coverage of the AutoDev-AI integration system,
enabling developers to effectively utilize the multi-model orchestration capabilities for complex
AI-driven development tasks.
