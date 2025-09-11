import React from 'react';
import { StatusBarProps } from '../types';

const MetricIndicator: React.FC<{
  label: string;
  value: number;
  unit?: string;
  warning?: number;
  critical?: number;
}> = ({ label, value, unit = '%', warning = 70, critical = 90 }) => {
  const getStatusColor = (val: number) => {
    if (val >= critical) return 'text-red-500 bg-red-50 border-red-200';
    if (val >= warning) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  return (
    <div 
      className={`flex items-center gap-2 px-2 py-1 rounded border ${getStatusColor(value)}`}
      role="status"
      aria-label={`${label}: ${value}${unit}`}
    >
      <span className="text-xs font-medium">{label}</span>
      <span className="text-xs font-mono">{value.toFixed(1)}{unit}</span>
    </div>
  );
};

const NetworkStatus: React.FC<{ 
  status: 'connected' | 'disconnected' | 'slow' 
}> = ({ status }) => {
  const getNetworkConfig = (status: string) => {
    switch (status) {
      case 'connected':
        return {
          icon: '📶',
          text: 'Connected',
          color: 'text-green-600 bg-green-50 border-green-200'
        };
      case 'slow':
        return {
          icon: '🐌',
          text: 'Slow',
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
        };
      case 'disconnected':
        return {
          icon: '📵',
          text: 'Disconnected',
          color: 'text-red-500 bg-red-50 border-red-200'
        };
      default:
        return {
          icon: '❓',
          text: 'Unknown',
          color: 'text-gray-500 bg-gray-50 border-gray-200'
        };
    }
  };

  const config = getNetworkConfig(status);

  return (
    <div 
      className={`flex items-center gap-2 px-2 py-1 rounded border ${config.color}`}
      role="status"
      aria-label={`Network status: ${config.text}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span className="text-xs font-medium">{config.text}</span>
    </div>
  );
};

export const StatusBar: React.FC<StatusBarProps> = ({
  systemHealth,
  activeConnections,
  lastUpdate,
  className = '',
  children
}) => {
  const formatTime = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  };

  const getTimeSinceUpdate = (date: string | Date) => {
    const now = new Date();
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const diff = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <footer 
      className={`bg-gray-50 border-t border-gray-200 ${className}`}
      role="contentinfo"
      aria-label="System status bar"
    >
      <div className="flex items-center justify-between px-4 py-2 text-sm">
        {/* Left Section - System Metrics */}
        <div className="flex items-center gap-4">
          <div 
            className="flex items-center gap-2 flex-wrap"
            role="region"
            aria-label="System health metrics"
          >
            <MetricIndicator label="CPU" value={systemHealth.cpu} />
            <MetricIndicator label="Memory" value={systemHealth.memory} />
            <MetricIndicator label="Disk" value={systemHealth.disk} />
            <NetworkStatus status={systemHealth.network} />
          </div>

          {/* Active Connections */}
          <div className="flex items-center gap-2 text-gray-600">
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" 
              />
            </svg>
            <span className="text-xs">
              <span className="font-medium">{activeConnections}</span> active
            </span>
          </div>
        </div>

        {/* Center Section - Custom Content */}
        {children && (
          <div className="hidden md:flex items-center">
            {children}
          </div>
        )}

        {/* Right Section - Last Update */}
        <div className="flex items-center gap-4 text-gray-500">
          <div className="flex items-center gap-2">
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <span className="text-xs">
              Last update: <span className="font-medium">{formatTime(lastUpdate)}</span>
            </span>
          </div>

          <div className="text-xs opacity-75">
            {getTimeSinceUpdate(lastUpdate)}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden px-4 pb-2">
        <div className="flex items-center justify-between text-gray-500 text-xs">
          <span>
            <span className="font-medium">{activeConnections}</span> connections
          </span>
          <span>{getTimeSinceUpdate(lastUpdate)}</span>
        </div>
        
        {children && (
          <div className="mt-2">
            {children}
          </div>
        )}
      </div>
    </footer>
  );
};

export default StatusBar;