// Optimized version of App.tsx with performance improvements
import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Settings, Maximize2, Minimize2, Download } from 'lucide-react';
import { ErrorBoundary } from './views/shared/ErrorBoundary';
import { ProgressTracker } from './components/ProgressTracker';
import { UpdateManager } from './components/UpdateManager';
import { Header, Sidebar, StatusBar, IconButton } from './components';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useSystemMonitor } from './hooks/useSystemMonitor';
import { useOptimizedCallback, useApiCallback } from './hooks/useOptimizedCallback';
import { TauriService } from './services/tauri';
import { cn } from './utils/cn';
import { hiveCoordinator } from './utils/hive-coordination';
import {
  ExecutionOutput,
  ClaudeFlowCommand,
  OrchestrationConfig,
  NotificationMessage,
  OrchestrationMode,
  Tool,
  ExecutionMode,
} from './types';
import toast from 'react-hot-toast';

// Lazy load heavy components
const MonitoringDashboard = lazy(() => 
  import('./views').then(module => ({ default: module.MonitoringDashboard }))
);
const OrchestrationView = lazy(() => 
  import('./views').then(module => ({ default: module.OrchestrationView }))
);
const HistoryView = lazy(() => 
  import('./views').then(module => ({ default: module.HistoryView }))
);
const SandboxView = lazy(() => 
  import('./views').then(module => ({ default: module.SandboxView }))
);
const MonitoringView = lazy(() => 
  import('./views').then(module => ({ default: module.MonitoringView }))
);
const TerminalView = lazy(() => 
  import('./views').then(module => ({ default: module.TerminalView }))
);

interface AppState {
  isExecuting: boolean;
  outputs: ExecutionOutput[];
  currentTask: string | null;
  progress: number;
  isFullscreen: boolean;
  showSettings: boolean;
  showOutput: boolean;
  showUpdater: boolean;
  showSidebar: boolean;
  activeTab:
    | 'orchestration'
    | 'monitoring'
    | 'history'
    | 'sandbox'
    | 'logs'
    | 'terminal'
    | 'configuration';
}

const defaultConfig: OrchestrationConfig = {
  mode: { type: 'single', primaryModel: 'claude' } as OrchestrationMode,
  tool: 'claude-flow' as Tool,
  executionMode: 'standard' as ExecutionMode,
  primaryModel: 'claude',
  secondaryModel: undefined as string | undefined,
  dockerEnabled: false,
  autoRestart: true,
  maxRetries: 3,
  timeout: 300,
};

// Loading component
const LoadingFallback = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    <span className="ml-2 text-gray-600">Loading {children}...</span>
  </div>
);

function OptimizedAppContent() {
  useTheme(); // Theme is managed globally
  const [config, setConfig] = useLocalStorage<OrchestrationConfig>(
    'orchestration-config',
    defaultConfig
  );
  const { systemStats, dockerStatus, aiStatus } = useSystemMonitor();
  const [state, setState] = useState<AppState>({
    isExecuting: false,
    outputs: [],
    currentTask: null,
    progress: 0,
    isFullscreen: false,
    showSettings: false,
    showOutput: true,
    showUpdater: false,
    showSidebar: true,
    activeTab: 'orchestration',
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_notifications, _setNotifications] = useState<NotificationMessage[]>([]);
  
  // Memoize TauriService to prevent recreations
  const tauriService = useMemo(() => TauriService, []);

  // Optimized app initialization with reduced re-renders
  const initializeApp = useOptimizedCallback(async () => {
    try {
      // Initialize hive coordination with optimized callback
      hiveCoordinator.subscribe('integration-coordinator', (message) => {
        const output: ExecutionOutput = {
          id: `hive-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: message.type === 'error' ? 'error' : 'info',
          content: `Hive Message from ${message.from}: ${JSON.stringify(message.payload)}`,
          source: 'Hive Mind',
        };

        setState(prev => ({
          ...prev,
          outputs: [...prev.outputs, output],
        }));
      });

      // Update hive state
      hiveCoordinator.updateState('window', {
        state: 'active',
        securityLevel: 'medium',
      });

      return () => {
        // Cleanup function
      };
    } catch (error) {
      console.error('Failed to initialize app:', error);
      toast.error('Failed to initialize AutoDev-AI system');
      return undefined;
    }
  }, []);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Optimized task execution with API callback optimization
  const handleExecute = useApiCallback(
    async (command: ClaudeFlowCommand) => {
      const taskName = typeof command === 'object' ? command.task : `${command} execution`;
      setState(prev => ({
        ...prev,
        isExecuting: true,
        currentTask: taskName || null,
        progress: 0,
        showOutput: true,
      }));

      try {
        // Add starting message
        const startOutput: ExecutionOutput = {
          id: `start-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'info',
          content: `Starting ${typeof command === 'object' ? command.mode || 'unknown' : command} execution: ${typeof command === 'object' ? command.task || 'No task specified' : command}`,
          source: 'AutoDev-AI',
        };

        setState(prev => ({
          ...prev,
          outputs: [...prev.outputs, startOutput],
        }));

        // Optimized progress simulation
        let progressValue = 0;
        const progressInterval = setInterval(() => {
          progressValue = Math.min(progressValue + Math.random() * 15, 95);
          setState(prev => ({ ...prev, progress: progressValue }));
        }, 800);

        const commandStr = typeof command === 'object' ? command.command || 'unknown' : command;
        const result = await tauriService.executeClaudeFlow(commandStr as string);

        clearInterval(progressInterval);

        // Success handling
        const successOutput: ExecutionOutput = {
          id: `success-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'success',
          content: `Task completed successfully: ${result}`,
          source: 'AutoDev-AI',
        };

        setState(prev => ({
          ...prev,
          outputs: [...prev.outputs, successOutput],
          progress: 100,
        }));

        toast.success('Task completed successfully!');
      } catch (error) {
        const errorOutput: ExecutionOutput = {
          id: `error-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'error',
          content: `Execution failed: ${error}`,
          source: 'AutoDev-AI',
        };

        setState(prev => ({
          ...prev,
          outputs: [...prev.outputs, errorOutput],
        }));

        toast.error('Task execution failed');
      } finally {
        setState(prev => ({
          ...prev,
          isExecuting: false,
          currentTask: null,
          progress: 0,
        }));
      }
    },
    [tauriService],
    200 // 200ms debounce for API calls
  );

  // Optimized UI callbacks
  const handleClearOutput = useOptimizedCallback(() => {
    setState(prev => ({ ...prev, outputs: [] }));
  }, []);

  const toggleFullscreen = useOptimizedCallback(() => {
    setState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  }, []);

  const toggleSettings = useOptimizedCallback(() => {
    setState(prev => ({ ...prev, showSettings: !prev.showSettings }));
  }, []);

  const toggleUpdater = useOptimizedCallback(() => {
    setState(prev => ({ ...prev, showUpdater: !prev.showUpdater }));
  }, []);

  const toggleSidebar = useOptimizedCallback(() => {
    setState(prev => ({ ...prev, showSidebar: !prev.showSidebar }));
  }, []);

  // Memoized navigation items to prevent recreation
  const navigationItems = useMemo(() => [
    {
      id: 'orchestration',
      label: 'Task Orchestration',
      icon: '🎛️',
      active: state.activeTab === 'orchestration',
      onClick: () => setState(prev => ({ ...prev, activeTab: 'orchestration' })),
    },
    {
      id: 'monitoring',
      label: 'Dashboard',
      icon: '📊',
      active: state.activeTab === 'monitoring',
      onClick: () => setState(prev => ({ ...prev, activeTab: 'monitoring' })),
    },
    {
      id: 'history',
      label: 'Execution History',
      icon: '📜',
      active: state.activeTab === 'history',
      onClick: () => setState(prev => ({ ...prev, activeTab: 'history' })),
    },
    {
      id: 'sandbox',
      label: 'Docker Sandbox',
      icon: '🐳',
      active: state.activeTab === 'sandbox',
      onClick: () => setState(prev => ({ ...prev, activeTab: 'sandbox' })),
    },
    {
      id: 'logs',
      label: 'System Logs',
      icon: '👁️',
      active: state.activeTab === 'logs',
      onClick: () => setState(prev => ({ ...prev, activeTab: 'logs' })),
    },
    {
      id: 'terminal',
      label: 'Terminal',
      icon: '⌨️',
      active: state.activeTab === 'terminal',
      onClick: () => setState(prev => ({ ...prev, activeTab: 'terminal' })),
    },
  ], [state.activeTab]);

  // Memoized status indicators to prevent recalculation
  const statusIndicators = useMemo(() => [
    {
      status: state.isExecuting ? 'warning' : systemStats.cpu > 80 ? 'warning' : 'online',
      label: 'System',
      value: state.isExecuting ? 'Busy' : `CPU ${systemStats.cpu.toFixed(0)}%`,
    } as const,
    {
      status: aiStatus.connected ? 'online' : 'offline',
      label: 'AI',
      value: aiStatus.connected
        ? `Connected${aiStatus.latency ? ` (${aiStatus.latency}ms)` : ''}`
        : 'Disconnected',
    } as const,
    {
      status: dockerStatus.running ? 'online' : 'offline',
      label: 'Docker',
      value: dockerStatus.running ? `${dockerStatus.containers || 0} containers` : 'Not running',
    } as const,
  ], [state.isExecuting, systemStats.cpu, aiStatus.connected, aiStatus.latency, dockerStatus.running, dockerStatus.containers]);

  // Optimized keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'k':
            event.preventDefault();
            handleClearOutput();
            break;
          case 'f':
            event.preventDefault();
            toggleFullscreen();
            break;
          case ',':
            event.preventDefault();
            toggleSettings();
            break;
          case 'u':
            event.preventDefault();
            toggleUpdater();
            break;
          case '`':
            event.preventDefault();
            setState(prev => ({ ...prev, showOutput: !prev.showOutput }));
            break;
        }
      }

      if (event.key === 'Escape') {
        setState(prev => ({ ...prev, showSettings: false, showUpdater: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClearOutput, toggleFullscreen, toggleSettings, toggleUpdater]);

  // Render active tab content with lazy loading
  const renderActiveTab = useMemo(() => {
    const tabProps = {
      config,
      onConfigChange: setConfig,
      onExecute: handleExecute,
      isExecuting: state.isExecuting,
      outputs: state.outputs,
      onClear: handleClearOutput,
    };

    switch (state.activeTab) {
      case 'orchestration':
        return (
          <Suspense fallback={<LoadingFallback>Orchestration</LoadingFallback>}>
            <OrchestrationView {...tabProps} />
          </Suspense>
        );
      case 'monitoring':
        return (
          <Suspense fallback={<LoadingFallback>Dashboard</LoadingFallback>}>
            <MonitoringDashboard
              realTime={true}
              onAlert={(alert) => toast.error(`Alert: ${alert.message}`)}
            />
          </Suspense>
        );
      case 'history':
        return (
          <Suspense fallback={<LoadingFallback>History</LoadingFallback>}>
            <HistoryView
              outputs={state.outputs}
              onClear={handleClearOutput}
              onExport={(data) => {
                console.log('Exporting history data:', data);
                toast.success('History exported successfully');
              }}
            />
          </Suspense>
        );
      case 'sandbox':
        return (
          <Suspense fallback={<LoadingFallback>Sandbox</LoadingFallback>}>
            <SandboxView
              dockerEnabled={config.dockerEnabled}
              onDockerToggle={(enabled) => {
                setConfig(prev => ({ ...prev, dockerEnabled: enabled }));
                toast.success(`Docker ${enabled ? 'enabled' : 'disabled'}`);
              }}
            />
          </Suspense>
        );
      case 'logs':
        return (
          <Suspense fallback={<LoadingFallback>Logs</LoadingFallback>}>
            <MonitoringView realTime={true} />
          </Suspense>
        );
      case 'terminal':
        return (
          <Suspense fallback={<LoadingFallback>Terminal</LoadingFallback>}>
            <TerminalView
              onExecute={async (command, sessionId) => {
                console.log(`Executing command in session ${sessionId}:`, command);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return `Executed: ${command}\nOutput would appear here.`;
              }}
            />
          </Suspense>
        );
      default:
        return <div>Select a tab to view content</div>;
    }
  }, [state.activeTab, config, handleExecute, state.isExecuting, state.outputs, handleClearOutput, setConfig]);

  return (
    <div
      className={cn(
        'min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white transition-all duration-300 flex flex-col',
        state.isFullscreen && 'fixed inset-0 z-50'
      )}
    >
      {/* Header */}
      <Header
        title="AutoDev-AI Neural Bridge"
        statusIndicators={statusIndicators}
        onMenuClick={toggleSidebar}
        className="bg-gray-800/90 border-gray-700 fixed top-0 left-0 right-0 z-50"
      >
        <div className="flex items-center space-x-2">
          <IconButton
            icon={<Download className="w-5 h-5" />}
            onClick={toggleUpdater}
            variant={state.showUpdater ? 'primary' : 'ghost'}
            aria-label="Update Manager"
          />
          <IconButton
            icon={<Settings className="w-5 h-5" />}
            onClick={toggleSettings}
            variant={state.showSettings ? 'primary' : 'ghost'}
            aria-label="Settings"
          />
          <IconButton
            icon={
              state.isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )
            }
            onClick={toggleFullscreen}
            variant="ghost"
            aria-label={`${state.isFullscreen ? 'Exit' : 'Enter'} fullscreen`}
          />
        </div>
      </Header>

      {/* Progress Bar */}
      {state.isExecuting && (
        <div className="px-6 py-2 border-b border-gray-700 bg-gray-800/90 fixed top-16 left-0 right-0 z-40">
          <ProgressTracker
            progress={state.progress}
            taskName={state.currentTask || 'Unknown Task'}
          />
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={state.showSidebar}
        onClose={() => setState(prev => ({ ...prev, showSidebar: false }))}
        navigationItems={navigationItems}
        className="bg-gray-800 border-gray-700"
      />

      {/* Main Content */}
      <div
        className={cn(
          'flex-1 flex transition-all duration-300 pt-16',
          state.showSidebar && 'lg:ml-80',
          state.isExecuting && 'pt-28'
        )}
      >
        {/* Update Manager Sidebar */}
        {state.showUpdater && (
          <div className="w-96 border-r bg-gray-800 border-gray-700 transition-all duration-300 overflow-y-auto flex-shrink-0">
            <div className="p-6">
              <ErrorBoundary>
                <UpdateManager
                  onClose={() => setState(prev => ({ ...prev, showUpdater: false }))}
                />
              </ErrorBoundary>
            </div>
          </div>
        )}

        {/* Primary Content */}
        <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-4rem)] overflow-hidden mt-16">
          <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
            <ErrorBoundary level="view" showDetails={true}>
              {renderActiveTab}
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <ErrorBoundary level="component">
        <div
          className={cn(
            'transition-all duration-300',
            state.showSidebar && 'lg:ml-80'
          )}
        >
          <StatusBar
            systemHealth={{
              cpu: systemStats.cpu,
              memory: systemStats.memory,
              disk: systemStats.disk,
              network: systemStats.network,
            }}
            activeConnections={systemStats.processes}
            lastUpdate={new Date().toISOString()}
            className="bg-gray-800 border-gray-700"
          />
        </div>
      </ErrorBoundary>
    </div>
  );
}

function OptimizedApp() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <OptimizedAppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default OptimizedApp;