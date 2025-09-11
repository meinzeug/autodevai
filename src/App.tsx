import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Download
} from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OrchestrationPanel } from './components/OrchestrationPanel';
import { OutputDisplay } from './components/OutputDisplay';
import { ProgressTracker } from './components/ProgressTracker';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { UpdateManager } from './components/UpdateManager';
// Import our new component library
import { Header, Sidebar, StatusBar, IconButton } from './components';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { useLocalStorage } from './hooks/useLocalStorage';
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
  ExecutionMode
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
  activeTab: 'orchestration' | 'monitoring' | 'terminal';
}

const defaultConfig: OrchestrationConfig = {
  mode: 'single' as OrchestrationMode,
  tool: 'claude-flow' as Tool,
  executionMode: 'standard' as ExecutionMode,
  primaryModel: 'claude',
  secondaryModel: undefined as string | undefined,
  dockerEnabled: false,
  autoRestart: true,
  maxRetries: 3,
  timeout: 300
};

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [config, setConfig] = useLocalStorage<OrchestrationConfig>('orchestration-config', defaultConfig);
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
    activeTab: 'orchestration'
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
        hiveCoordinator.subscribe('integration-coordinator', (message) => {
          const output: ExecutionOutput = {
            id: `hive-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: message.type === 'error' ? 'error' : 'info',
            content: `Hive Message from ${message.from}: ${JSON.stringify(message.payload)}`,
            source: 'Hive Mind'
          };
          
          setState(prev => ({
            ...prev,
            outputs: [...prev.outputs, output]
          }));
        });

        // Update hive state based on app initialization
        hiveCoordinator.updateState('window', {
          state: 'active',
          securityLevel: 'medium'
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
  const handleExecute = useCallback(async (command: ClaudeFlowCommand) => {
    setState(prev => ({ 
      ...prev, 
      isExecuting: true, 
      currentTask: command.task,
      progress: 0,
      showOutput: true
    }));
    
    try {
      // Add starting message
      const startOutput: ExecutionOutput = {
        id: `start-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'info',
        content: `Starting ${command.mode} execution: ${command.task}`,
        source: 'AutoDev-AI'
      };
      
      setState(prev => ({
        ...prev,
        outputs: [...prev.outputs, startOutput]
      }));

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 20, 95)
        }));
      }, 1000);

      const result = await tauriService.executeClaudeFlow(command);
      
      clearInterval(progressInterval);
      
      // Add success message
      const successOutput: ExecutionOutput = {
        id: `success-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'success',
        content: `Task completed successfully: ${result}`,
        source: 'AutoDev-AI'
      };
      
      setState(prev => ({
        ...prev,
        outputs: [...prev.outputs, successOutput],
        progress: 100
      }));
      
      toast.success('Task completed successfully!');
      
    } catch (error) {
      const errorOutput: ExecutionOutput = {
        id: `error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'error',
        content: `Execution failed: ${error}`,
        source: 'AutoDev-AI'
      };
      
      setState(prev => ({
        ...prev,
        outputs: [...prev.outputs, errorOutput]
      }));
      
      toast.error('Task execution failed');
    } finally {
      setState(prev => ({ 
        ...prev, 
        isExecuting: false, 
        currentTask: null,
        progress: 0
      }));
    }
  }, [tauriService]);

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
      id: 'control',
      label: 'Control Panel',
      icon: '🎛️',
      active: state.activeTab === 'orchestration',
      onClick: () => setState(prev => ({ ...prev, activeTab: 'orchestration' }))
    },
    {
      id: 'monitoring',
      label: 'System Monitor',
      icon: '📊',
      active: state.activeTab === 'monitoring',
      onClick: () => setState(prev => ({ ...prev, activeTab: 'monitoring' }))
    },
    {
      id: 'terminal',
      label: 'Terminal',
      icon: '⌨️',
      active: state.activeTab === 'terminal',
      onClick: () => setState(prev => ({ ...prev, activeTab: 'terminal' }))
    },
    {
      id: 'tools',
      label: 'Development Tools',
      icon: '🔧',
      subItems: [
        {
          id: 'claude-flow',
          label: 'Claude Flow',
          icon: '🧠',
          onClick: () => console.log('Claude Flow selected')
        },
        {
          id: 'docker',
          label: 'Docker Management',
          icon: '🐳',
          onClick: () => console.log('Docker selected')
        },
        {
          id: 'git',
          label: 'Git Integration',
          icon: '🔀',
          onClick: () => console.log('Git selected')
        }
      ]
    },
    {
      id: 'settings',
      label: 'Configuration',
      icon: '⚙️',
      onClick: () => setState(prev => ({ ...prev, showSettings: !prev.showSettings }))
    }
  ];

  // Status indicators for header
  const statusIndicators = [
    {
      status: state.isExecuting ? 'warning' : 'online',
      label: 'System',
      value: state.isExecuting ? 'Busy' : 'Ready'
    } as const,
    {
      status: 'online',
      label: 'AI',
      value: 'Connected'
    } as const,
    {
      status: config.dockerEnabled ? 'online' : 'offline',
      label: 'Docker',
      value: config.dockerEnabled ? 'Active' : 'Inactive'
    } as const
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
    <div className={cn(
      "min-h-screen bg-gradient-to-br transition-all duration-300 flex flex-col",
      theme === 'dark' 
        ? "from-gray-900 via-gray-800 to-gray-900 text-white" 
        : "from-gray-50 via-white to-gray-100 text-gray-900",
      state.isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Header with our new component */}
      <Header
        title="AutoDev-AI Neural Bridge"
        statusIndicators={statusIndicators}
        onMenuClick={toggleSidebar}
        className={theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-gray-200'}
      >
        {/* Header Actions */}
        <div className="flex items-center space-x-2">
          <IconButton
            icon={theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            onClick={toggleTheme}
            variant="ghost"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          />
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
            icon={state.isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            onClick={toggleFullscreen}
            variant="ghost"
            aria-label={`${state.isFullscreen ? 'Exit' : 'Enter'} fullscreen`}
          />
        </div>
      </Header>

      {/* Progress Bar */}
      {state.isExecuting && (
        <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700">
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
        className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
      />

      {/* Main Content Container */}
      <div className={cn(
        "flex-1 flex overflow-hidden transition-all duration-300",
        // Add left margin on large screens when sidebar is open
        state.showSidebar && "lg:ml-64"
      )}>
        {/* Settings Sidebar */}
        {state.showSettings && (
          <div className={cn(
            "w-80 border-r transition-all duration-300 flex-shrink-0",
            theme === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          )}>
            <ConfigurationPanel 
              config={config}
              onChange={setConfig}
              onClose={() => setState(prev => ({ ...prev, showSettings: false }))}
            />
          </div>
        )}
        
        {/* Update Manager Sidebar */}
        {state.showUpdater && (
          <div className={cn(
            "w-96 border-r transition-all duration-300 overflow-y-auto flex-shrink-0",
            theme === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          )}>
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
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 p-4 lg:p-6 overflow-hidden">
            {/* Left Panel - Orchestration */}
            <div className="lg:col-span-5 flex-shrink-0">
              <ErrorBoundary>
                <OrchestrationPanel
                  onExecute={handleExecute}
                  isExecuting={state.isExecuting}
                  config={config}
                  onConfigChange={setConfig}
                />
              </ErrorBoundary>
            </div>
            
            {/* Right Panel - Output & Monitoring */}
            <div className="lg:col-span-7 flex flex-col min-h-0 flex-1">
              {state.showOutput && (
                <ErrorBoundary>
                  <OutputDisplay
                    outputs={state.outputs}
                    onClear={handleClearOutput}
                    className="flex-1 min-h-0"
                  />
                </ErrorBoundary>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar with system health */}
      <ErrorBoundary>
        <div className={cn(
          "transition-all duration-300",
          // Add left margin when sidebar is open on large screens
          state.showSidebar && "lg:ml-64"
        )}>
          <StatusBar
            systemHealth={{
              cpu: 45.2,
              memory: 62.8,
              disk: 78.4,
              network: 'connected'
            }}
            activeConnections={state.outputs.length}
            lastUpdate={new Date().toISOString()}
            className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}
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