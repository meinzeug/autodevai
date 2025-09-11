export interface ExecutionResult {
  success: boolean;
  output: string;
  tool_used: string;
  duration_ms: number;
}

export interface PrerequisiteStatus {
  claude_flow_ready: boolean;
  codex_ready: boolean;
  claude_code_ready: boolean;
  docker_ready: boolean;
}

export interface SystemInfo {
  os: string;
  kernel: string;
  memory_total: number;
  memory_available: number;
  disk_total: number;
  disk_available: number;
}

export interface Settings {
  default_mode: OrchestrationMode;
  default_tool: string;
  openrouter_key?: string;
  docker_enabled: boolean;
  auto_quality_check: boolean;
}

export type OrchestrationMode = 'single' | 'dual';
export type Tool = 'claude-flow' | 'openai-codex';
export type CodexMode = 'suggest' | 'auto-edit' | 'full-auto';
export type ClaudeFlowCommand = 'swarm' | 'sparc' | 'hive-mind' | 'memory';

export interface Task {
  id: string;
  description: string;
  mode: OrchestrationMode;
  tool?: Tool;
  status: TaskStatus;
  created_at: string;
  completed_at?: string;
  result?: ExecutionResult;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface DockerContainer {
  id: string;
  name: string;
  status: string;
  ports: string[];
}

// EMERGENCY REPAIR: Adding ALL missing critical interfaces

// Component Interfaces
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  icon?: React.ReactNode;
  'aria-label'?: string;
}

export interface HeaderProps {
  title?: string;
  showStatusIndicators?: boolean;
  statusIndicators?: StatusIndicator[];
  onMenuClick?: () => void;
  className?: string;
}

export interface StatusBarProps {
  status?: string;
  progress?: number;
  showProgress?: boolean;
  statusType?: 'info' | 'success' | 'warning' | 'error';
  className?: string;
  systemHealth?: Record<string, any>;
  activeConnections?: number;
  lastUpdate?: string;
}

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  overlay?: boolean;
  className?: string;
}

export interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  navigationItems?: NavigationItem[];
  className?: string;
}

// Navigation Interfaces
export interface NavigationItem {
  id: string;
  label: string;
  icon?: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  subItems?: NavigationItem[];
}

export interface StatusIndicator {
  id?: string;
  label: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  value?: string | number;
  icon?: string;
}

// Configuration Interfaces
export interface OrchestrationConfig {
  mode: OrchestrationMode;
  tool: Tool;
  executionMode: ExecutionMode;
  primaryModel: string;
  secondaryModel?: string | undefined;
  dockerEnabled: boolean;
  autoRestart: boolean;
  maxRetries: number;
  timeout: number;
  customSettings?: Record<string, any>;
}

export interface ExecutionOutput {
  id: string;
  timestamp: string;
  command?: string;
  output?: string;
  error?: string;
  success?: boolean;
  executionTime?: number;
  metadata?: Record<string, any>;
  type?: 'info' | 'success' | 'warning' | 'error';
  content?: string;
  source?: string;
}

export interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary';
}

// Execution Mode Interface
export type ExecutionMode = 'standard' | 'enhanced' | 'turbo' | 'custom';

// Generic Component Props
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  'data-testid'?: string;
}

// Theme Provider Interface for useTheme
export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark';
  storageKey?: string;
}

// Add missing ClaudeFlowCommand extension
export interface ClaudeFlowCommandExtended {
  command: ClaudeFlowCommand;
  task?: string;
  mode?: string;
  options?: Record<string, any>;
}

// Union type for extended command usage
export type ClaudeFlowCommandWithTask = ClaudeFlowCommand | {
  command: ClaudeFlowCommand;
  task?: string;
  mode?: OrchestrationMode;
  options?: Record<string, any>;
};