export interface ExecutionResult {
  success: boolean;
  output: string;
  tool_used: string;
  duration_ms: number;
  timestamp?: string;
  message?: string;
}

export interface PrerequisiteStatus {
  claude_flow_ready: boolean;
  codex_ready: boolean;
  claude_code_ready: boolean;
  docker_ready: boolean;
  version?: string;
  claudeFlow?: boolean;
}

export interface SystemInfo {
  os: string;
  kernel: string;
  memory_total: number;
  memory_available: number;
  disk_total: number;
  disk_available: number;
  platform?: string;
}

export interface Settings {
  default_mode: OrchestrationMode;
  default_tool: string;
  openrouter_key?: string;
  openrouterKey?: string;
  docker_enabled: boolean;
  auto_quality_check: boolean;
  claudeFlowPath?: string;
}

// OrchestrationMode can be both string literal and object with properties
export type OrchestrationMode = 'single' | 'dual' | {
  type: 'single' | 'dual';
  primaryModel: string;
  secondaryModel?: string;
};
export type Tool = 'claude-flow' | 'openai-codex';
export type CodexMode = 'suggest' | 'auto-edit' | 'full-auto';
// ClaudeFlowCommand can be both string and object with task/mode/options
export type ClaudeFlowCommand = 'swarm' | 'sparc' | 'hive-mind' | 'memory' | {
  command?: string;
  task?: string;
  mode?: string;
  options?: Record<string, any>;
};

// Add missing ClaudeFlowCommandType for backwards compatibility
export type ClaudeFlowCommandType = 'swarm' | 'sparc' | 'hive-mind' | 'memory';

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
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'default' | 'outline';
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
  children?: React.ReactNode;
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
  children?: React.ReactNode;
}

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large' | 'sm' | 'md' | 'lg';
  message?: string;
  overlay?: boolean;
  className?: string;
  variant?: 'default' | 'dots' | 'pulse' | 'ring';
  text?: string;
  children?: React.ReactNode;
}

// Add missing interface for ui/button.tsx compatibility
export interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  navigationItems?: NavigationItem[];
  className?: string;
  children?: React.ReactNode;
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
  type: 'info' | 'success' | 'warning' | 'error';
  content: string;
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

// Add missing interfaces for component props
export interface ResultCardProps {
  id: string;
  title: string;
  status: TaskStatus;
  success: boolean;
  output: string;
  tool_used: string;
  duration_ms: number;
  timestamp?: string;
  metadata: {
    created: string;
    completed: string;
    mode: OrchestrationMode;
    tool: Tool;
  };
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

// Add performance metrics interfaces
export interface PerformanceMetrics {
  cls: number;
  fcp: number;
  lcp: number;
  ttfb: number;
}

// Add layout config interface
export interface LayoutConfig {
  desktop?: any;
  tablet?: any;
  mobile?: any;
}

// Add Metric interface
export interface Metric {
  name: string;
  value: number;
  unit?: string;
  timestamp?: string;
}