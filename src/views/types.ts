// View Component Props Types

export interface MonitoringDashboardProps {
  className?: string;
  realTime?: boolean;
  onAlert?: (alert: AlertData) => void;
}

export interface OrchestrationViewProps {
  config: import('../types').OrchestrationConfig;
  onConfigChange: (config: import('../types').OrchestrationConfig) => void;
  onExecute: (command: import('../types').ClaudeFlowCommand) => void;
  isExecuting?: boolean;
  className?: string;
}

export interface HistoryViewProps {
  outputs: import('../types').ExecutionOutput[];
  onClear?: () => void;
  onExport?: (data: import('../types').ExecutionOutput[]) => void;
  className?: string;
}

export interface SandboxViewProps {
  className?: string;
  dockerEnabled?: boolean;
  onDockerToggle?: (enabled: boolean) => void;
}

export interface MonitoringViewProps {
  className?: string;
  realTime?: boolean;
}

export interface TerminalViewProps {
  className?: string;
  onExecute?: (command: string, sessionId: string) => Promise<string>;
}

// Shared Types
export interface AlertData {
  id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}