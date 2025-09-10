export interface ExecutionMode {
  type: 'single' | 'dual';
  primaryModel: 'claude' | 'codex';
  secondaryModel?: 'claude' | 'codex';
}

export interface ClaudeFlowCommand {
  mode: string;
  task: string;
  options: Record<string, any>;
}

export interface ToolStatus {
  name: string;
  status: 'active' | 'inactive' | 'error' | 'loading';
  version?: string;
  lastPing?: Date;
  errorMessage?: string;
}

export interface ExecutionOutput {
  id: string;
  timestamp: Date;
  type: 'stdout' | 'stderr' | 'info' | 'error' | 'success';
  content: string;
  source?: string;
}

export interface DockerContainer {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  image: string;
  ports: string[];
  created: Date;
}

export interface OrchestrationConfig {
  mode: ExecutionMode;
  dockerEnabled: boolean;
  autoRestart: boolean;
  maxRetries: number;
  timeout: number;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkActivity: number;
  activeProcesses: number;
}

export interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  dismissible: boolean;
}