import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Zap, 
  Brain, 
  Code, 
  Layers, 
  Settings,
  Monitor,
  Activity,
  Terminal,
  CheckCircle2,
  Sun,
  Moon,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OrchestrationPanel } from './components/OrchestrationPanel';
import { OutputDisplay } from './components/OutputDisplay';
import { StatusBar } from './components/StatusBar';
import { ProgressTracker } from './components/ProgressTracker';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { useLocalStorage } from './hooks/useLocalStorage';
import { TauriService } from './services/tauri';
import { cn } from './utils/cn';
import {
  ExecutionOutput,
  ClaudeFlowCommand,
  OrchestrationConfig,
  NotificationMessage
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
  activeTab: 'orchestration' | 'monitoring' | 'terminal';
}

const defaultConfig: OrchestrationConfig = {
  mode: {
    type: 'single',
    primaryModel: 'claude'
  },
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
    activeTab: 'orchestration'
  });
  
  const [_notifications, _setNotifications] = useState<NotificationMessage[]>([]);
  const tauriService = useMemo(() => TauriService.getInstance(), []);

  // Initialize Tauri service and event listeners
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await tauriService.initialize();
        
        // Set up execution output listener
        const unsubscribeOutput = tauriService.onExecutionOutput((output) => {
          setState(prev => ({
            ...prev,
            outputs: [...prev.outputs, output]
          }));
        });

        return () => {
          unsubscribeOutput();
        };
      } catch (error) {
        console.error('Failed to initialize app:', error);
        toast.error('Failed to initialize AutoDev-AI system');
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
        timestamp: new Date(),
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

      const result = await tauriService.executeClaudeFlowCommand(command);
      
      clearInterval(progressInterval);
      
      // Add success message
      const successOutput: ExecutionOutput = {
        id: `success-${Date.now()}`,
        timestamp: new Date(),
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
        timestamp: new Date(),
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
          case '`':
            event.preventDefault();
            setState(prev => ({ ...prev, showOutput: !prev.showOutput }));
            break;
        }
      }
      
      if (event.key === 'Escape') {
        setState(prev => ({ ...prev, showSettings: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClearOutput, toggleFullscreen, toggleSettings]);

  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br transition-all duration-300",
      theme === 'dark' 
        ? "from-gray-900 via-gray-800 to-gray-900 text-white" 
        : "from-gray-50 via-white to-gray-100 text-gray-900",
      state.isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Enhanced Header */}
      <header className={cn(
        "border-b backdrop-blur-md transition-all duration-200",
        theme === 'dark' 
          ? "bg-gray-800/90 border-gray-700" 
          : "bg-white/90 border-gray-200"
      )}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Zap className="w-8 h-8 text-blue-500" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                    AutoDev-AI Neural Bridge
                  </h1>
                  <p className="text-xs text-gray-500">Hive Mind Collective Intelligence</p>
                </div>
              </div>
              
              <div className="hidden md:flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-500">AI-Powered</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Code className="w-4 h-4 text-green-400" />
                  <span className="text-gray-500">Multi-Agent</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-500">Orchestrated</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Tab Navigation */}
              <div className="hidden md:flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {[
                  { id: 'orchestration', icon: Brain, label: 'Control' },
                  { id: 'monitoring', icon: Monitor, label: 'Monitor' },
                  { id: 'terminal', icon: Terminal, label: 'Terminal' }
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setState(prev => ({ ...prev, activeTab: id as any }))}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      state.activeTab === id
                        ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{label}</span>
                  </button>
                ))}
              </div>
              
              {/* System Status */}
              <div className="flex items-center space-x-2">
                {state.isExecuting ? (
                  <div className="flex items-center space-x-2 px-3 py-1 rounded-lg text-sm border border-blue-500 bg-blue-500/10 text-blue-400">
                    <Activity className="w-4 h-4 animate-pulse" />
                    <span>Executing</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 px-3 py-1 rounded-lg text-sm border border-green-500 bg-green-500/10 text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ready</span>
                  </div>
                )}
              </div>
              
              {/* Control Buttons */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={toggleTheme}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <Moon className="w-5 h-5 text-blue-500" />
                  )}
                </button>
                
                <button
                  onClick={toggleSettings}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    state.showSettings
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                  title="Settings (Ctrl+,)"
                >
                  <Settings className="w-5 h-5" />
                </button>
                
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={`${state.isFullscreen ? 'Exit' : 'Enter'} fullscreen (Ctrl+F)`}
                >
                  {state.isFullscreen ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          {state.isExecuting && (
            <ProgressTracker 
              progress={state.progress}
              taskName={state.currentTask || 'Unknown Task'}
              className="mt-4"
            />
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Settings Sidebar */}
        {state.showSettings && (
          <div className={cn(
            "w-80 border-r transition-all duration-300",
            theme === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          )}>
            <ConfigurationPanel 
              config={config}
              onChange={setConfig}
              onClose={() => setState(prev => ({ ...prev, showSettings: false }))}
            />
          </div>
        )}
        
        {/* Primary Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
            {/* Left Panel - Orchestration */}
            <div className="lg:col-span-5 space-y-6">
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
            <div className="lg:col-span-7 flex flex-col space-y-6 min-h-0">
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

      {/* Status Bar */}
      <ErrorBoundary>
        <StatusBar />
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