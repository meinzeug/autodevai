// AutoDev-AI Neural Bridge Platform - TypeScript Type Definitions
// Auto-generated from Rust types - do not edit manually

/**
 * System information structure
 */
export interface SystemInfo {
  /** Operating system platform */
  platform: string;
  /** System architecture */
  arch: string;
  /** Application version */
  version: string;
  /** Tauri version */
  tauriVersion: string;
  /** Rust version used to build */
  rustVersion?: string;
  /** Build timestamp */
  buildDate?: string;
  /** System uptime in seconds */
  uptime?: number;
  /** Available memory in bytes */
  memory?: number;
}

/**
 * Window state information
 */
export interface WindowState {
  /** Window label/identifier */
  label: string;
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Window width */
  width: number;
  /** Window height */
  height: number;
  /** Whether window is maximized */
  maximized: boolean;
  /** Whether window is minimized */
  minimized: boolean;
  /** Whether window is focused */
  focused: boolean;
  /** Whether window is visible */
  visible: boolean;
  /** Window scale factor */
  scaleFactor: number;
  /** Last updated timestamp */
  updatedAt: string;
}

/**
 * Application settings structure
 */
export interface AppSettings {
  /** Application theme (light, dark, auto) */
  theme: string;
  /** Language/locale setting */
  language: string;
  /** Auto-start with system */
  autoStart: boolean;
  /** Minimize to tray on close */
  minimizeToTray: boolean;
  /** Show notifications */
  showNotifications: boolean;
  /** Check for updates automatically */
  autoUpdate: boolean;
  /** Claude-Flow integration settings */
  claudeFlow: ClaudeFlowSettings;
  /** Developer settings */
  developer: DeveloperSettings;
  /** Security settings */
  security: SecuritySettings;
}

/**
 * Claude-Flow integration settings
 */
export interface ClaudeFlowSettings {
  /** Enable Claude-Flow integration */
  enabled: boolean;
  /** API endpoint URL */
  apiEndpoint: string;
  /** Authentication token */
  authToken?: string;
  /** Default swarm topology */
  defaultTopology: string;
  /** Maximum agents per swarm */
  maxAgents: number;
  /** Enable neural features */
  neuralEnabled: boolean;
  /** Memory persistence enabled */
  memoryPersistence: boolean;
}

/**
 * Developer settings
 */
export interface DeveloperSettings {
  /** Enable developer tools */
  devTools: boolean;
  /** Show debug information */
  debugMode: boolean;
  /** Enable hot reload */
  hotReload: boolean;
  /** Log level (trace, debug, info, warn, error) */
  logLevel: string;
  /** Enable performance monitoring */
  performanceMonitoring: boolean;
}

/**
 * Security settings
 */
export interface SecuritySettings {
  /** Enable IPC security validation */
  ipcSecurity: boolean;
  /** Session timeout in minutes */
  sessionTimeout: number;
  /** Maximum failed authentication attempts */
  maxAuthAttempts: number;
  /** Enable audit logging */
  auditLogging: boolean;
  /** Rate limiting enabled */
  rateLimiting: boolean;
  /** Rate limit requests per minute */
  rateLimitRpm: number;
}

/**
 * Event priority levels
 */
export type EventPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Event structure for the event system
 */
export interface AppEvent {
  /** Unique event identifier */
  id: string;
  /** Event type/name */
  eventType: string;
  /** Event payload data */
  payload: any;
  /** Event source component */
  source: string;
  /** Event target (optional) */
  target?: string;
  /** Event timestamp */
  timestamp: string;
  /** Event priority level */
  priority: EventPriority;
}

/**
 * API response structure
 */
export interface ApiResponse<T> {
  /** Response success status */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if any */
  error?: string;
  /** Response metadata */
  metadata?: Record<string, any>;
  /** Response timestamp */
  timestamp: string;
}

/**
 * Update information structure
 */
export interface UpdateInfo {
  /** Available update version */
  version: string;
  /** Update release notes */
  notes: string;
  /** Update download URL */
  downloadUrl: string;
  /** Update file size in bytes */
  size: number;
  /** Update signature for verification */
  signature: string;
  /** Whether update is critical */
  critical: boolean;
  /** Release date */
  releaseDate: string;
}

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  /** Database type (sqlite, postgres, mysql) */
  dbType: string;
  /** Connection URL or path */
  connection: string;
  /** Maximum connections in pool */
  maxConnections: number;
  /** Connection timeout in seconds */
  timeout: number;
  /** Enable SSL/TLS */
  sslEnabled: boolean;
}

/**
 * Docker container configuration
 */
export interface DockerConfig {
  /** Container image name */
  image: string;
  /** Container name */
  name: string;
  /** Port mappings */
  ports: Record<string, string>;
  /** Environment variables */
  envVars: Record<string, string>;
  /** Volume mounts */
  volumes: Record<string, string>;
  /** Container labels */
  labels: Record<string, string>;
}

/**
 * Performance metrics structure
 */
export interface PerformanceMetrics {
  /** CPU usage percentage */
  cpuUsage: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Network bytes received */
  networkRx: number;
  /** Network bytes transmitted */
  networkTx: number;
  /** Disk read bytes */
  diskRead: number;
  /** Disk write bytes */
  diskWrite: number;
  /** Active connections count */
  activeConnections: number;
  /** Metrics timestamp */
  timestamp: string;
}

/**
 * Docker container information
 */
export interface DockerContainer {
  /** Container ID */
  id: string;
  /** Container name */
  name: string;
  /** Container image */
  image: string;
  /** Container status */
  status: string;
  /** Port mappings */
  ports: string[];
  /** Creation timestamp */
  created: string;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  /** Log entry timestamp */
  timestamp: string;
  /** Log level */
  level: string;
  /** Log message */
  message: string;
  /** Log target/module */
  target: string;
  /** Additional fields */
  fields: Record<string, any>;
}

/**
 * Error categories
 */
export type ErrorCategory = 
  | 'config'
  | 'database'
  | 'security'
  | 'windowState'
  | 'settings'
  | 'events'
  | 'api'
  | 'fileSystem'
  | 'network'
  | 'validation'
  | 'internal'
  | 'tauri'
  | 'docker'
  | 'claudeFlow';

/**
 * Neural Bridge error structure
 */
export interface NeuralBridgeError {
  /** Error type/category */
  type: ErrorCategory;
  /** Error data based on type */
  data: {
    message: string;
    status?: number;
  };
}

/**
 * Command output structure
 */
export interface CommandOutput {
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Exit code */
  exitCode: number;
  /** Execution time in milliseconds */
  executionTime: number;
}

/**
 * Backup metadata structure
 */
export interface BackupMetadata {
  /** Backup name */
  name: string;
  /** Creation timestamp */
  createdAt: string;
  /** Size in bytes */
  sizeBytes: number;
  /** Backup checksum */
  checksum: string;
  /** Database version */
  databaseVersion: string;
  /** Backup type */
  backupType: 'Full' | 'Incremental' | 'Schema';
}

/**
 * Log analysis results
 */
export interface LogAnalysis {
  /** Total log entries analyzed */
  totalEntries: number;
  /** Count by log level */
  levelCounts: Record<string, number>;
  /** Count by target/module */
  targetCounts: Record<string, number>;
  /** Error patterns found */
  errorPatterns: ErrorPattern[];
  /** Hourly distribution */
  hourlyDistribution: Record<string, number>;
}

/**
 * Error pattern structure
 */
export interface ErrorPattern {
  /** Error message pattern */
  message: string;
  /** Occurrence count */
  count: number;
  /** First seen timestamp */
  firstSeen: string;
  /** Last seen timestamp */
  lastSeen: string;
}

/**
 * Log statistics structure
 */
export interface LogStatistics {
  /** Total log entries */
  totalEntries: number;
  /** Trace level count */
  traceCount: number;
  /** Debug level count */
  debugCount: number;
  /** Info level count */
  infoCount: number;
  /** Warning level count */
  warnCount: number;
  /** Error level count */
  errorCount: number;
  /** Other level count */
  otherCount: number;
  /** Error rate percentage */
  errorRate: number;
}

/**
 * Project type enumeration
 */
export type ProjectType = 
  | 'WebApplication'
  | 'MobileApp'
  | 'Desktop'
  | 'Library'
  | 'Microservice'
  | 'MLModel'
  | { Other: string };

/**
 * Swarm topology enumeration
 */
export type SwarmTopology = 'Hierarchical' | 'Mesh' | 'Ring' | 'Star';

/**
 * Swarm status enumeration
 */
export type SwarmStatus = 
  | 'Initializing'
  | 'Active'
  | 'Paused'
  | 'Stopping'
  | 'Stopped'
  | { Error: string };

/**
 * Agent type enumeration
 */
export type AgentType = 
  | 'Coordinator'
  | 'Analyst'
  | 'Optimizer'
  | 'Documenter'
  | 'Monitor'
  | { Specialist: string }
  | 'Architect'
  | 'TaskOrchestrator'
  | 'CodeAnalyzer'
  | 'PerformanceAnalyzer'
  | 'Researcher'
  | 'Coder'
  | 'Tester'
  | 'Reviewer';

/**
 * Agent status enumeration
 */
export type AgentStatus = 
  | 'Idle'
  | 'Working'
  | 'Blocked'
  | { Error: string }
  | 'Offline';

/**
 * Task priority enumeration
 */
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

/**
 * Task status enumeration
 */
export type TaskStatus = 
  | 'Pending'
  | 'InProgress'
  | 'Completed'
  | 'Failed'
  | 'Cancelled'
  | 'Blocked';

/**
 * Audit action enumeration
 */
export type AuditAction = 
  | 'Create'
  | 'Update'
  | 'Delete'
  | 'Login'
  | 'Logout'
  | 'Access'
  | 'Execute'
  | 'Deploy';

/**
 * User model
 */
export interface User {
  /** User ID */
  id: string;
  /** Username */
  username: string;
  /** Email address */
  email: string;
  /** Password hash */
  passwordHash: string;
  /** Account active status */
  isActive: boolean;
  /** Account creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Last login timestamp */
  lastLogin?: string;
  /** User settings */
  settings: UserSettings;
}

/**
 * User settings model
 */
export interface UserSettings {
  /** UI theme */
  theme: string;
  /** Language preference */
  language: string;
  /** Notifications enabled */
  notificationsEnabled: boolean;
  /** Auto-save interval in seconds */
  autoSaveInterval: number;
  /** Privacy mode enabled */
  privacyMode: boolean;
}

/**
 * Project model
 */
export interface Project {
  /** Project ID */
  id: string;
  /** Project name */
  name: string;
  /** Project description */
  description?: string;
  /** Owner user ID */
  ownerId: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Archived status */
  isArchived: boolean;
  /** Project type */
  projectType: ProjectType;
  /** Project settings */
  settings: ProjectSettings;
}

/**
 * Project settings
 */
export interface ProjectSettings {
  /** Auto-deploy enabled */
  autoDeploy: boolean;
  /** Branch protection enabled */
  branchProtection: boolean;
  /** Code review required */
  codeReviewRequired: boolean;
  /** CI/CD enabled */
  ciCdEnabled: boolean;
  /** Docker enabled */
  dockerEnabled: boolean;
}

/**
 * Swarm model
 */
export interface Swarm {
  /** Swarm ID */
  id: string;
  /** Project ID */
  projectId: string;
  /** Swarm name */
  name: string;
  /** Swarm topology */
  topology: SwarmTopology;
  /** Maximum agents */
  maxAgents: number;
  /** Creation timestamp */
  createdAt: string;
  /** Current status */
  status: SwarmStatus;
  /** Swarm configuration */
  configuration: SwarmConfiguration;
}

/**
 * Swarm configuration
 */
export interface SwarmConfiguration {
  /** Neural features enabled */
  neuralEnabled: boolean;
  /** Memory persistence enabled */
  memoryPersistence: boolean;
  /** Auto-scaling enabled */
  autoScaling: boolean;
  /** Resource limits */
  resourceLimits: ResourceLimits;
}

/**
 * Resource limits
 */
export interface ResourceLimits {
  /** Maximum memory in MB */
  maxMemoryMb: number;
  /** Maximum CPU percentage */
  maxCpuPercent: number;
  /** Maximum execution time in seconds */
  maxExecutionTime: number;
  /** Maximum concurrent tasks */
  maxConcurrentTasks: number;
}

/**
 * Agent model
 */
export interface Agent {
  /** Agent ID */
  id: string;
  /** Swarm ID */
  swarmId: string;
  /** Agent type */
  agentType: AgentType;
  /** Agent name */
  name: string;
  /** Agent capabilities */
  capabilities: string[];
  /** Current status */
  status: AgentStatus;
  /** Creation timestamp */
  createdAt: string;
  /** Last active timestamp */
  lastActive: string;
  /** Performance metrics */
  performanceMetrics: AgentMetrics;
}

/**
 * Agent performance metrics
 */
export interface AgentMetrics {
  /** Tasks completed */
  tasksCompleted: number;
  /** Tasks failed */
  tasksFailed: number;
  /** Average execution time */
  averageExecutionTime: number;
  /** CPU usage percentage */
  cpuUsage: number;
  /** Memory usage in MB */
  memoryUsage: number;
  /** Success rate percentage */
  successRate: number;
}

/**
 * Task model
 */
export interface Task {
  /** Task ID */
  id: string;
  /** Project ID */
  projectId: string;
  /** Swarm ID */
  swarmId?: string;
  /** Assigned agent ID */
  assignedAgentId?: string;
  /** Task title */
  title: string;
  /** Task description */
  description: string;
  /** Task priority */
  priority: TaskPriority;
  /** Current status */
  status: TaskStatus;
  /** Creation timestamp */
  createdAt: string;
  /** Start timestamp */
  startedAt?: string;
  /** Completion timestamp */
  completedAt?: string;
  /** Estimated duration in seconds */
  estimatedDuration?: number;
  /** Actual duration in seconds */
  actualDuration?: number;
  /** Task dependencies (task IDs) */
  dependencies: string[];
  /** Task tags */
  tags: string[];
  /** Additional metadata */
  metadata: any;
}

/**
 * Audit log entry
 */
export interface AuditLog {
  /** Log entry ID */
  id: string;
  /** User ID (optional) */
  userId?: string;
  /** Entity type */
  entityType: string;
  /** Entity ID */
  entityId: string;
  /** Action performed */
  action: AuditAction;
  /** Action details */
  details: any;
  /** IP address */
  ipAddress: string;
  /** User agent */
  userAgent: string;
  /** Timestamp */
  createdAt: string;
}

/**
 * Configuration entry
 */
export interface Configuration {
  /** Configuration ID */
  id: string;
  /** Configuration key */
  key: string;
  /** Configuration value */
  value: any;
  /** Description */
  description?: string;
  /** Sensitive data flag */
  isSensitive: boolean;
  /** Creation timestamp */
  createdAt: string;
  /** Update timestamp */
  updatedAt: string;
  /** Updated by user ID */
  updatedBy: string;
}

/**
 * File storage entry
 */
export interface FileStorage {
  /** File ID */
  id: string;
  /** Project ID (optional) */
  projectId?: string;
  /** Original filename */
  filename: string;
  /** Storage file path */
  filePath: string;
  /** File size in bytes */
  fileSize: number;
  /** MIME type */
  mimeType: string;
  /** File checksum */
  checksum: string;
  /** Uploaded by user ID */
  uploadedBy: string;
  /** Upload timestamp */
  createdAt: string;
  /** Deletion flag */
  isDeleted: boolean;
}

/**
 * Tauri command types for type-safe IPC
 */
export interface TauriCommands {
  // Core system commands
  health_check(): Promise<ApiResponse<string>>;
  get_system_info(): Promise<ApiResponse<SystemInfo>>;
  get_performance_metrics(): Promise<ApiResponse<PerformanceMetrics>>;
  
  // Configuration commands
  validate_config(config: any): Promise<ApiResponse<boolean>>;
  
  // System commands
  execute_system_command(command: string, args: string[]): Promise<ApiResponse<any>>;
  emergency_shutdown(): Promise<ApiResponse<void>>;
  
  // Claude-Flow commands
  init_claude_flow(topology: string, maxAgents?: number): Promise<ApiResponse<string>>;
  execute_claude_flow_task(taskDescription: string, priority?: string): Promise<ApiResponse<string>>;
  
  // Docker commands
  get_docker_status(): Promise<ApiResponse<DockerContainer[]>>;
  create_docker_container(image: string, name: string, config: any): Promise<ApiResponse<string>>;
  
  // Backup commands
  create_backup(backupPath?: string): Promise<ApiResponse<string>>;
  restore_backup(backupPath: string): Promise<ApiResponse<boolean>>;
  
  // Logging commands
  search_logs(query: string, startDate?: string, endDate?: string, level?: string): Promise<ApiResponse<LogEntry[]>>;
}

/**
 * Event payloads for Tauri events
 */
export interface EventPayloads {
  'log-entry': LogEntry;
  'error-tracked': any;
  'system-update': SystemInfo;
  'swarm-status': any;
  'container-status': DockerContainer;
  'performance-update': PerformanceMetrics;
  'backup-complete': { path: string; success: boolean };
  'task-complete': { taskId: string; result: any };
}

/**
 * Utility type for Tauri event listeners
 */
export type EventCallback<T extends keyof EventPayloads> = (event: {
  payload: EventPayloads[T];
  windowLabel: string;
  id: number;
}) => void;