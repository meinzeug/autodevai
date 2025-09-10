import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Server, 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { TauriService } from '../services/tauri';
import { ToolStatus, SystemMetrics } from '../types';
import { cn } from '../utils/cn';

interface StatusBarProps {
  className?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ className }) => {
  const [toolStatuses, setToolStatuses] = useState<ToolStatus[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkActivity: 0,
    activeProcesses: 0
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const tauriService = TauriService.getInstance();

  useEffect(() => {
    // Initial data fetch
    fetchStatusData();
    
    // Set up periodic updates
    const interval = setInterval(fetchStatusData, 5000);
    
    // Set up tool status listener
    const unsubscribeToolStatus = tauriService.onToolStatusUpdate(setToolStatuses);
    
    // Set up online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      unsubscribeToolStatus();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchStatusData = async () => {
    try {
      const [tools, metrics] = await Promise.all([
        tauriService.getToolStatus(),
        tauriService.getSystemMetrics()
      ]);
      
      setToolStatuses(tools);
      setSystemMetrics(metrics);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch status data:', error);
    }
  };

  const getStatusIcon = (status: ToolStatus['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'loading':
        return <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-3 h-3 text-red-500" />;
      case 'inactive':
      default:
        return <div className="w-3 h-3 rounded-full bg-gray-500" />;
    }
  };

  const getStatusColor = (status: ToolStatus['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'loading':
        return 'text-blue-400';
      case 'error':
        return 'text-red-400';
      case 'inactive':
      default:
        return 'text-gray-400';
    }
  };

  const formatMetric = (value: number, suffix: string = '%') => {
    return `${Math.round(value)}${suffix}`;
  };

  const getMetricColor = (value: number, warningThreshold: number = 80, criticalThreshold: number = 95) => {
    if (value >= criticalThreshold) return 'text-red-400';
    if (value >= warningThreshold) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className={cn(
      "bg-gray-900 border-t border-gray-700 px-4 py-2 flex items-center justify-between text-xs",
      className
    )}>
      {/* Left Section - Network & Connection Status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="h-4 w-px bg-gray-600" />

        {/* Tool Status */}
        <div className="flex items-center space-x-3">
          {toolStatuses.slice(0, 4).map((tool) => (
            <div key={tool.name} className="flex items-center space-x-1" title={tool.errorMessage || tool.name}>
              {getStatusIcon(tool.status)}
              <span className={getStatusColor(tool.status)}>
                {tool.name}
              </span>
              {tool.version && (
                <span className="text-gray-500">
                  v{tool.version}
                </span>
              )}
            </div>
          ))}
          
          {toolStatuses.length > 4 && (
            <span className="text-gray-500">
              +{toolStatuses.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Center Section - System Metrics */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-1" title="CPU Usage">
          <Cpu className="w-4 h-4 text-blue-400" />
          <span className={getMetricColor(systemMetrics.cpuUsage)}>
            {formatMetric(systemMetrics.cpuUsage)}
          </span>
        </div>

        <div className="flex items-center space-x-1" title="Memory Usage">
          <MemoryStick className="w-4 h-4 text-purple-400" />
          <span className={getMetricColor(systemMetrics.memoryUsage)}>
            {formatMetric(systemMetrics.memoryUsage)}
          </span>
        </div>

        <div className="flex items-center space-x-1" title="Disk Usage">
          <HardDrive className="w-4 h-4 text-orange-400" />
          <span className={getMetricColor(systemMetrics.diskUsage)}>
            {formatMetric(systemMetrics.diskUsage)}
          </span>
        </div>

        <div className="flex items-center space-x-1" title="Active Processes">
          <Server className="w-4 h-4 text-green-400" />
          <span className="text-gray-300">
            {systemMetrics.activeProcesses}
          </span>
        </div>

        <div className="flex items-center space-x-1" title="Network Activity">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-gray-300">
            {formatMetric(systemMetrics.networkActivity, ' KB/s')}
          </span>
        </div>
      </div>

      {/* Right Section - Last Update & Actions */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1 text-gray-500">
          <Clock className="w-3 h-3" />
          <span>
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        </div>

        <button
          onClick={fetchStatusData}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title="Refresh status"
        >
          <RefreshCw className="w-3 h-3 text-gray-400 hover:text-white" />
        </button>

        {/* Overall Health Indicator */}
        <div className="flex items-center space-x-1">
          {(() => {
            const activeTools = toolStatuses.filter(t => t.status === 'active').length;
            const errorTools = toolStatuses.filter(t => t.status === 'error').length;
            const highSystemLoad = systemMetrics.cpuUsage > 80 || systemMetrics.memoryUsage > 80;

            if (errorTools > 0 || highSystemLoad) {
              return (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-red-400">Issues</span>
                </>
              );
            } else if (activeTools === toolStatuses.length && toolStatuses.length > 0) {
              return (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-400">Healthy</span>
                </>
              );
            } else {
              return (
                <>
                  <RefreshCw className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-400">Loading</span>
                </>
              );
            }
          })()}
        </div>
      </div>
    </div>
  );
};