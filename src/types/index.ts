/**
 * Type definitions index for AutoDev-AI Neural Bridge Platform
 * 
 * This file provides convenient access to all type definitions
 * used throughout the application.
 */

// Re-export all Tauri types
export * from './tauri-types';

// Legacy types (maintained for backward compatibility)
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

// Additional application-specific types
export interface AppConfig {
  debug: boolean;
  apiUrl: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
}

export interface AppState {
  initialized: boolean;
  loading: boolean;
  error: string | null;
  user: User | null;
  settings: AppSettings;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: boolean;
  autoSave: boolean;
}

export interface AppSettings {
  ui: {
    theme: 'light' | 'dark' | 'auto';
    fontSize: number;
    animations: boolean;
  };
  ai: {
    defaultModel: string;
    temperature: number;
    maxTokens: number;
  };
  performance: {
    cacheEnabled: boolean;
    maxConcurrentRequests: number;
  };
  security: {
    sessionTimeout: number;
    auditLogging: boolean;
  };
}

// Frontend Component Types
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface StatusIndicator {
  status: 'online' | 'offline' | 'warning' | 'error';
  label: string;
  value?: string | number;
}

export interface HeaderProps extends ComponentProps {
  title?: string;
  statusIndicators?: StatusIndicator[];
  onMenuClick?: () => void;
}

export interface SidebarProps extends ComponentProps {
  isOpen: boolean;
  onClose: () => void;
  navigationItems: NavigationItem[];
}

export interface NavigationItem {
  id: string;
  label: string;
  icon?: string;
  active?: boolean;
  onClick?: () => void;
  subItems?: NavigationItem[];
}

export interface StatusBarProps extends ComponentProps {
  systemHealth: {
    cpu: number;
    memory: number;
    disk: number;
    network: 'connected' | 'disconnected' | 'slow';
  };
  activeConnections: number;
  lastUpdate: Date;
}

export interface LoadingSpinnerProps extends ComponentProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'dots' | 'pulse' | 'ring';
  text?: string;
}

export interface ButtonProps extends ComponentProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: ((event: React.MouseEvent<HTMLButtonElement>) => void) | undefined;
}

// Enhanced component types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  testId?: string;
}

// API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Pagination types
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea';
  required: boolean;
  validation?: ValidationRule[];
  options?: SelectOption[];
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Notification types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

// Modal types
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

// Loading states
export interface LoadingState {
  loading: boolean;
  progress?: number;
  message?: string;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  stack?: string;
}

// File types
export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  path?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Search and filter types
export interface SearchOptions {
  query: string;
  filters: SearchFilter[];
  sorting: SortOption;
  pagination: PaginationOptions;
}

export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'between';
  value: any;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

// Chart and data visualization types
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

// WebSocket types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  id?: string;
}

export interface WebSocketConnection {
  connected: boolean;
  reconnecting: boolean;
  lastError?: string;
  connectionTime?: string;
}

// Theme types
export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      xxl: string;
    };
    fontWeight: {
      light: number;
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// Export utility types
export type Maybe<T> = T | null | undefined;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Event handler types
export type EventHandler<T = any> = (event: T) => void;
export type AsyncEventHandler<T = any> = (event: T) => Promise<void>;

// Generic callback types
export type Callback = () => void;
export type AsyncCallback = () => Promise<void>;
export type CallbackWithArgs<T = any> = (args: T) => void;
export type AsyncCallbackWithArgs<T = any> = (args: T) => Promise<void>;

// Key-value types
export type StringRecord = Record<string, string>;
export type NumberRecord = Record<string, number>;
export type AnyRecord = Record<string, any>;

// Default export
export default {
  // This namespace can be used for type guards and utilities
  utils: {
    isAppError: (error: any): error is AppError => {
      return error && typeof error === 'object' && 'code' in error && 'message' in error;
    },
    isFileInfo: (file: any): file is FileInfo => {
      return file && typeof file === 'object' && 'name' in file && 'size' in file;
    },
    isNotification: (notification: any): notification is Notification => {
      return notification && typeof notification === 'object' && 'id' in notification && 'type' in notification;
    },
  },
};