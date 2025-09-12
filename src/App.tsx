import { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, Maximize2, Minimize2, Download } from 'lucide-react';
import { ErrorBoundary } from './views/shared/ErrorBoundary';
// Note: OrchestrationPanel and OutputDisplay are replaced by new views
import { ProgressTracker } from './components/ProgressTracker';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { UpdateManager } from './components/UpdateManager';
// Import our new component library
import { Header, Sidebar, StatusBar, IconButton } from './components';
// Import the new views
import {
  MonitoringDashboard,
  OrchestrationView,
  HistoryView,
  SandboxView,
  MonitoringView,
  TerminalView,
} from './views';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useSystemMonitor } from './hooks/useSystemMonitor';
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

function AppContent() {
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
  const tauriService = useMemo(() => TauriService, []);

  // Initialize Tauri service and event listeners
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // TauriService doesn't have initialize method
        // await tauriService.initialize();

        // Initialize hive coordination
        hiveCoordinator.subscribe('integration-coordinator', message => {
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

        // Update hive state based on app initialization
        hiveCoordinator.updateState('window', {
          state: 'active',
          securityLevel: 'medium',
        });

        // Set up execution output listener
        // TauriService doesn't have onExecutionOutput method
        const unsubscribeOutput = () => {}; // No-op

        return () => {
          unsubscribeOutput();
        };
      } catch (error) {
        console.error('Failed to initialize app:', error);
        toast.error('Failed to initialize AutoDev-AI system');
        return undefined; // Ensure all code paths return a value
      }
    };

    initializeApp();
  }, [tauriService]);

  // Handle task execution
  const handleExecute = useCallback(
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

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setState(prev => ({
            ...prev,
            progress: Math.min(prev.progress + Math.random() * 20, 95),
          }));
        }, 1000);

        const commandStr = typeof command === 'object' ? command.command || 'unknown' : command;
        const result = await tauriService.executeClaudeFlow(commandStr as string);

        clearInterval(progressInterval);

        // Add success message
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
    [tauriService]
  );

  const handleClearOutput = useCallback(() => {
    setState(prev => ({ ...prev, outputs: [] }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    setState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  }, []);

  const toggleSettings = useCallback(() => {
    setState(prev => ({ ...prev, showSettings: !prev.showSettings }));
  }, []);

  const toggleUpdater = useCallback(() => {
    setState(prev => ({ ...prev, showUpdater: !prev.showUpdater }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setState(prev => ({ ...prev, showSidebar: !prev.showSidebar }));
  }, []);

  // Navigation items for sidebar
  const navigationItems = [
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
    {
      id: 'configuration',
      label: 'Configuration',
      icon: '⚙️',
      active: state.activeTab === 'configuration',
      onClick: () =>
        setState(prev => ({ ...prev, activeTab: 'configuration', showSettings: false })),
    },
  ];

  // Status indicators for header with live data
  const statusIndicators = [
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
  ];

  // Keyboard shortcuts
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

  return (
    <div
      className={cn(
        'min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white transition-all duration-300 flex flex-col',
        state.isFullscreen && 'fixed inset-0 z-50'
      )}
    >
      {/* Header with our new component */}
      <Header
        title="AutoDev-AI Neural Bridge"
        statusIndicators={statusIndicators}
        onMenuClick={toggleSidebar}
        className="bg-gray-800/90 border-gray-700 fixed top-0 left-0 right-0 z-50"
      >
        {/* Header Actions */}
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

      {/* Main Content Container */}
      <div
        className={cn(
          'flex-1 flex transition-all duration-300 pt-16',
          // Add left margin on large screens when sidebar is open
          state.showSidebar && 'lg:ml-80',
          // Add top margin when progress bar is showing
          state.isExecuting && 'pt-28'
        )}
      >
        {/* Update Manager Sidebar */}
        {state.showUpdater && (
          <div
            className={cn(
              'w-96 border-r bg-gray-800 border-gray-700 transition-all duration-300 overflow-y-auto flex-shrink-0'
            )}
          >
            <div className="p-6">
              <ErrorBoundary>
                <UpdateManager
                  onClose={() => setState(prev => ({ ...prev, showUpdater: false }))}
                />
              </ErrorBoundary>
            </div>
          </div>
        )}

        {/* Primary Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-4rem)] overflow-hidden mt-16">
          <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
            <ErrorBoundary level="view" showDetails={true}>
              {/* Route to different views based on active tab */}
              {state.activeTab === 'orchestration' && (
                <OrchestrationView
                  config={config}
                  onConfigChange={setConfig}
                  onExecute={(command: ClaudeFlowCommand) => handleExecute(command)}
                  isExecuting={state.isExecuting}
                />
              )}

              {state.activeTab === 'monitoring' && (
                <MonitoringDashboard
                  realTime={true}
                  onAlert={alert => {
                    toast.error(`Alert: ${alert.message}`);
                  }}
                />
              )}

              {state.activeTab === 'history' && (
                <HistoryView
                  outputs={state.outputs}
                  onClear={handleClearOutput}
                  onExport={data => {
                    console.log('Exporting history data:', data);
                    toast.success('History exported successfully');
                  }}
                />
              )}

              {state.activeTab === 'sandbox' && (
                <SandboxView
                  dockerEnabled={config.dockerEnabled}
                  onDockerToggle={enabled => {
                    setConfig(prev => ({ ...prev, dockerEnabled: enabled }));
                    toast.success(`Docker ${enabled ? 'enabled' : 'disabled'}`);
                  }}
                />
              )}

              {state.activeTab === 'logs' && <MonitoringView realTime={true} />}

              {state.activeTab === 'terminal' && (
                <TerminalView
                  onExecute={async (command, sessionId) => {
                    // Mock terminal command execution
                    console.log(`Executing command in session ${sessionId}:`, command);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return `Executed: ${command}\nOutput would appear here.`;
                  }}
                />
              )}

              {state.activeTab === 'configuration' && (
                <div className="h-full">
                  <ConfigurationPanel
                    config={config}
                    onChange={setConfig}
                    onClose={() => setState(prev => ({ ...prev, activeTab: 'orchestration' }))}
                  />
                </div>
              )}
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* Status Bar with system health */}
      <ErrorBoundary level="component">
        <div
          className={cn(
            'transition-all duration-300',
            // Add left margin when sidebar is open on large screens
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

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
