# AutoDev-AI Neural Bridge Platform - API Documentation

## Overview

The AutoDev-AI Neural Bridge Platform provides a comprehensive REST API for integrating with
Claude-Flow orchestration, Docker container management, and application lifecycle operations. This
document serves as the complete API reference.

## Version Information

- **API Version**: 1.0.0
- **Platform Version**: 0.1.0
- **Build**: Neural Bridge Platform v0.1.0
- **Rust Version**: 1.75+
- **Tauri Version**: 2.0

## Authentication

The API uses bearer token authentication for secure operations:

```http
Authorization: Bearer YOUR_API_TOKEN
```

Authentication is handled through the security layer with session management and rate limiting.

## Base URLs

- **Development**: `http://localhost:8080/api/v1`
- **Production**: `https://api.neural-bridge.dev/v1`

## Core Endpoints

### Health & System

#### GET `/health`

Check system health and status.

**Response**:

```json
{
  "success": true,
  "data": "Neural Bridge Platform is running",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### GET `/system/info`

Get comprehensive system information.

**Response**:

```json
{
  "success": true,
  "data": {
    "platform": "linux",
    "arch": "x86_64",
    "version": "0.1.0",
    "tauriVersion": "2.0",
    "rustVersion": "1.75.0",
    "buildDate": "2025-01-15T08:00:00Z",
    "uptime": 3600,
    "memory": 8589934592
  }
}
```

#### GET `/system/metrics`

Get current performance metrics.

**Response**:

```json
{
  "success": true,
  "data": {
    "cpuUsage": 25.5,
    "memoryUsage": 1073741824,
    "networkRx": 1048576,
    "networkTx": 524288,
    "diskRead": 2097152,
    "diskWrite": 1048576,
    "activeConnections": 5,
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### Configuration

#### POST `/config/validate`

Validate application configuration.

**Request Body**:

```json
{
  "theme": "dark",
  "language": "en",
  "claudeFlow": {
    "enabled": true,
    "apiEndpoint": "http://localhost:3000",
    "maxAgents": 8
  }
}
```

**Response**:

```json
{
  "success": true,
  "data": true
}
```

### Claude-Flow Integration

#### POST `/claude-flow/init`

Initialize Claude-Flow swarm.

**Request Body**:

```json
{
  "topology": "hierarchical",
  "maxAgents": 8
}
```

**Response**:

```json
{
  "success": true,
  "data": "swarm-12345-abcde"
}
```

#### POST `/claude-flow/task`

Execute task with Claude-Flow orchestration.

**Request Body**:

```json
{
  "taskDescription": "Implement user authentication system",
  "priority": "high"
}
```

**Response**:

```json
{
  "success": true,
  "data": "task-67890-fghij"
}
```

### Docker Management

#### GET `/docker/status`

Get Docker container status.

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": "container-123",
      "name": "neural-bridge-db",
      "image": "postgres:15",
      "status": "running",
      "ports": ["5432:5432"],
      "created": "2025-01-15T09:00:00Z"
    }
  ]
}
```

#### POST `/docker/container`

Create and start Docker container.

**Request Body**:

```json
{
  "image": "nginx:latest",
  "name": "web-server",
  "config": {
    "ports": {
      "80": "8080"
    },
    "env": ["NODE_ENV=production"],
    "volumes": {
      "/app": "/usr/share/nginx/html"
    }
  }
}
```

**Response**:

```json
{
  "success": true,
  "data": "container-456-xyz"
}
```

### Data Management

#### POST `/backup/create`

Create application data backup.

**Request Body**:

```json
{
  "backupPath": "/path/to/backup.db" // optional
}
```

**Response**:

```json
{
  "success": true,
  "data": "/backups/neural_bridge_backup_20250115_103000.db"
}
```

#### POST `/backup/restore`

Restore application data from backup.

**Request Body**:

```json
{
  "backupPath": "/backups/neural_bridge_backup_20250115_103000.db"
}
```

**Response**:

```json
{
  "success": true,
  "data": true
}
```

### Logging & Monitoring

#### GET `/logs/search`

Search application logs.

**Query Parameters**:

- `query` (string): Search query
- `startDate` (string): Start date (ISO 8601)
- `endDate` (string): End date (ISO 8601)
- `level` (string): Log level filter

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2025-01-15T10:30:00Z",
      "level": "info",
      "message": "Application started successfully",
      "target": "neural_bridge_platform::main",
      "fields": {}
    }
  ]
}
```

## TypeScript Bindings

The platform automatically generates TypeScript bindings for all Rust types:

### Core Types

```typescript
// System Information
interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  tauriVersion: string;
  rustVersion?: string;
  buildDate?: string;
  uptime?: number;
  memory?: number;
}

// API Response
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

// Application Settings
interface AppSettings {
  theme: string;
  language: string;
  autoStart: boolean;
  minimizeToTray: boolean;
  showNotifications: boolean;
  autoUpdate: boolean;
  claudeFlow: ClaudeFlowSettings;
  developer: DeveloperSettings;
  security: SecuritySettings;
}

// Claude-Flow Settings
interface ClaudeFlowSettings {
  enabled: boolean;
  apiEndpoint: string;
  authToken?: string;
  defaultTopology: string;
  maxAgents: number;
  neuralEnabled: boolean;
  memoryPersistence: boolean;
}

// Performance Metrics
interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkRx: number;
  networkTx: number;
  diskRead: number;
  diskWrite: number;
  activeConnections: number;
  timestamp: string;
}

// Docker Container
interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  ports: string[];
  created: string;
}

// Log Entry
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  target: string;
  fields: Record<string, any>;
}
```

### Tauri Commands

```typescript
import { invoke } from '@tauri-apps/api/core';

// Health check
const health = await invoke<ApiResponse<string>>('health_check');

// Get system info
const systemInfo = await invoke<ApiResponse<SystemInfo>>('get_system_info');

// Get performance metrics
const metrics = await invoke<ApiResponse<PerformanceMetrics>>('get_performance_metrics');

// Validate configuration
const isValid = await invoke<ApiResponse<boolean>>('validate_config', {
  config: appSettings,
});

// Execute system command
const result = await invoke<ApiResponse<any>>('execute_system_command', {
  command: 'docker',
  args: ['ps', '-a'],
});

// Initialize Claude-Flow
const swarmId = await invoke<ApiResponse<string>>('init_claude_flow', {
  topology: 'hierarchical',
  maxAgents: 8,
});

// Execute Claude-Flow task
const taskId = await invoke<ApiResponse<string>>('execute_claude_flow_task', {
  taskDescription: 'Implement user authentication',
  priority: 'high',
});

// Get Docker status
const containers = await invoke<ApiResponse<DockerContainer[]>>('get_docker_status');

// Create Docker container
const containerId = await invoke<ApiResponse<string>>('create_docker_container', {
  image: 'nginx:latest',
  name: 'web-server',
  config: { ports: { '80': '8080' } },
});

// Create backup
const backupPath = await invoke<ApiResponse<string>>('create_backup', {
  backupPath: '/path/to/backup.db',
});

// Restore backup
const restored = await invoke<ApiResponse<boolean>>('restore_backup', {
  backupPath: '/path/to/backup.db',
});

// Search logs
const logs = await invoke<ApiResponse<LogEntry[]>>('search_logs', {
  query: 'error',
  startDate: '2025-01-15T00:00:00Z',
  endDate: '2025-01-15T23:59:59Z',
  level: 'error',
});
```

## Error Handling

All API responses follow a consistent error format:

```json
{
  "success": false,
  "error": "Detailed error message",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Error Categories

- **Config**: Configuration related errors
- **Database**: Database operation errors
- **Security**: Authentication and security errors
- **WindowState**: Window state management errors
- **Settings**: Settings management errors
- **Events**: Event system errors
- **Api**: API communication errors
- **FileSystem**: File system operation errors
- **Network**: Network operation errors
- **Validation**: Input validation errors
- **Internal**: Internal application errors
- **Tauri**: Tauri specific errors
- **Docker**: Docker integration errors
- **ClaudeFlow**: Claude-Flow orchestration errors

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Default**: 100 requests per minute per IP
- **Authentication**: 10 requests per minute per IP
- **Heavy operations**: 5 requests per minute per IP

Rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642251600
```

## Security

### Authentication

- Bearer token authentication
- Session-based security with configurable timeout
- Automatic session renewal

### Command Validation

- Whitelist-based command validation
- Input sanitization for all parameters
- Audit logging for all operations

### Rate Limiting

- Configurable rate limits per endpoint
- IP-based and user-based rate limiting
- Automatic blocking of suspicious activity

## WebSocket Events

The platform supports real-time updates via WebSocket:

```typescript
// Listen for system events
window.__TAURI__.event.listen('system-update', event => {
  console.log('System update:', event.payload);
});

// Listen for Claude-Flow events
window.__TAURI__.event.listen('swarm-status', event => {
  console.log('Swarm status:', event.payload);
});

// Listen for Docker events
window.__TAURI__.event.listen('container-status', event => {
  console.log('Container status:', event.payload);
});
```

## SDK Examples

### JavaScript/TypeScript SDK

```typescript
class NeuralBridgeClient {
  async initializeSwarm(topology: string, maxAgents: number = 8) {
    return await invoke<ApiResponse<string>>('init_claude_flow', {
      topology,
      maxAgents,
    });
  }

  async executeTask(description: string, priority: string = 'medium') {
    return await invoke<ApiResponse<string>>('execute_claude_flow_task', {
      taskDescription: description,
      priority,
    });
  }

  async getSystemStatus() {
    return await invoke<ApiResponse<SystemInfo>>('get_system_info');
  }

  async searchLogs(query: string, options: LogSearchOptions = {}) {
    return await invoke<ApiResponse<LogEntry[]>>('search_logs', {
      query,
      ...options,
    });
  }
}

const client = new NeuralBridgeClient();
```

## Testing

### API Testing

```bash
# Health check
curl -X GET http://localhost:8080/api/v1/health

# System info
curl -X GET http://localhost:8080/api/v1/system/info

# Initialize swarm
curl -X POST http://localhost:8080/api/v1/claude-flow/init \
  -H "Content-Type: application/json" \
  -d '{"topology": "hierarchical", "maxAgents": 8}'
```

### Integration Tests

```typescript
describe('Neural Bridge API', () => {
  test('should initialize system', async () => {
    const response = await invoke('health_check');
    expect(response.success).toBe(true);
  });

  test('should create Claude-Flow swarm', async () => {
    const response = await invoke('init_claude_flow', {
      topology: 'hierarchical',
      maxAgents: 4,
    });
    expect(response.success).toBe(true);
    expect(typeof response.data).toBe('string');
  });
});
```

## Changelog

### Version 1.0.0 (2025-01-15)

- Initial API release
- Claude-Flow integration
- Docker management
- Comprehensive error handling
- TypeScript bindings
- Real-time events
- Security layer
- Performance monitoring
- Backup/restore functionality

## Support

- **Documentation**: [https://docs.neural-bridge.dev](https://docs.neural-bridge.dev)
- **Issues**:
  [https://github.com/autodev-ai/neural-bridge/issues](https://github.com/autodev-ai/neural-bridge/issues)
- **Discord**: [https://discord.gg/neural-bridge](https://discord.gg/neural-bridge)

---

_Generated automatically from Rust code using cargo doc and custom tooling._
