import React, { useState, useCallback, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { OrchestrationView } from '../views/OrchestrationView';
import { HistoryView } from '../views/HistoryView';
import { SandboxView } from '../views/SandboxView';
import { MonitoringView } from '../views/MonitoringView';
import { TerminalView } from '../views/TerminalView';
import { Navigation } from './Navigation';
import { Header } from './Header';
import { TauriService } from '../services/tauri';
import { cn } from '../utils/cn';

type ViewType = 'orchestration' | 'history' | 'sandbox' | 'monitoring' | 'terminal';

interface MainAppProps {
  className?: string;
}

export const MainApp: React.FC<MainAppProps> = ({ className }) => {
  const [currentView, setCurrentView] = useState<ViewType>('orchestration');
  const [isConnected, setIsConnected] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const { 
    config, 
    outputs, 
    isExecuting,
    setConfig,
    addOutput,
    clearOutputs,
    setExecuting 
  } = useStore();

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      const status = await TauriService.checkSystemStatus();
      setIsConnected(status.healthy);
    } catch (error) {
      console.error('Connection check failed:', error);
      setIsConnected(false);
    }
  };

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  const handleExecute = useCallback(async (task: string) => {
    setExecuting(true);
    try {
      const result = await TauriService.executeTask({
        projectId: config.projectId || 'default',
        command: task,
        mode: config.mode,
        options: {
          autoConfirm: config.autoConfirm,
          includeContext: config.includeContext,
          useHistory: config.useHistory,
        },
      });
      
      addOutput({
        id: Date.now().toString(),
        type: 'success',
        content: result.output,
        timestamp: new Date().toISOString(),
        tool: config.tool,
      });
    } catch (error) {
      addOutput({
        id: Date.now().toString(),
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        tool: config.tool,
      });
    } finally {
      setExecuting(false);
    }
  }, [config, addOutput, setExecuting]);

  const renderView = () => {
    switch (currentView) {
      case 'orchestration':
        return (
          <OrchestrationView
            config={config}
            onConfigChange={setConfig}
            onExecute={handleExecute}
            isExecuting={isExecuting}
            outputs={outputs}
            onClear={clearOutputs}
          />
        );
      case 'history':
        return <HistoryView />;
      case 'sandbox':
        return <SandboxView />;
      case 'monitoring':
        return <MonitoringView />;
      case 'terminal':
        return <TerminalView />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('flex h-screen bg-gray-50 dark:bg-gray-900', className)}>
      <Navigation
        currentView={currentView}
        onViewChange={handleViewChange}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          isConnected={isConnected}
          currentView={currentView}
          onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {renderView()}
          </div>
        </main>
      </div>
      
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
    </div>
  );
};

export default MainApp;