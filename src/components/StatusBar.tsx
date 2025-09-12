import React, { useState, useEffect } from 'react';
import { StatusBarProps } from '../types';
import { Activity, HardDrive, Cpu, Wifi, WifiOff, MemoryStick } from 'lucide-react';

const MetricIndicator: React.FC<{
  label: string;
  value: number;
  unit?: string;
  warning?: number;
  critical?: number;
  icon?: React.ReactNode;
}> = ({ label, value, unit = '%', warning = 70, critical = 90, icon }) => {
  const getStatusColor = (val: number) => {
    if (val >= critical) return 'text-red-400 bg-red-900/20';
    if (val >= warning) return 'text-yellow-400 bg-yellow-900/20';
    return 'text-green-400 bg-green-900/20';
  };

  // Animated bar width
  const barWidth = Math.min(100, Math.max(0, value));

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${getStatusColor(value)} transition-all duration-300`}
      role="status"
      aria-label={`${label}: ${value}${unit}`}
    >
      {icon && <span className="text-sm">{icon}</span>}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{label}</span>
          <span className="text-xs font-mono font-bold">
            {value.toFixed(1)}
            {unit}
          </span>
        </div>
        <div className="w-20 h-1 bg-gray-700 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-current transition-all duration-500 ease-out"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const NetworkStatus: React.FC<{
  status: 'connected' | 'disconnected' | 'connecting';
}> = ({ status }) => {
  const getNetworkConfig = (status: string) => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="w-4 h-4" />,
          text: 'Connected',
          color: 'text-green-400 bg-green-900/20',
          pulse: false,
        };
      case 'connecting':
        return {
          icon: <Activity className="w-4 h-4" />,
          text: 'Connecting',
          color: 'text-yellow-400 bg-yellow-900/20',
          pulse: true,
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Offline',
          color: 'text-red-400 bg-red-900/20',
          pulse: false,
        };
      default:
        return {
          icon: <Wifi className="w-4 h-4" />,
          text: 'Unknown',
          color: 'text-gray-400 bg-gray-900/20',
          pulse: false,
        };
    }
  };

  const config = getNetworkConfig(status);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.color} transition-all duration-300 ${
        config.pulse ? 'animate-pulse' : ''
      }`}
      role="status"
      aria-label={`Network status: ${config.text}`}
    >
      {config.icon}
      <span className="text-xs font-medium">{config.text}</span>
    </div>
  );
};

export const StatusBar: React.FC<StatusBarProps> = ({
  systemHealth,
  activeConnections,
  lastUpdate,
  className = '',
  children,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);
  const formatTime = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
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
      className={`bg-gray-900 border-t border-gray-700 ${className}`}
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
            <MetricIndicator
              label="CPU"
              value={systemHealth?.['cpu'] ?? 0}
              icon={<Cpu className="w-4 h-4" />}
            />
            <MetricIndicator
              label="Memory"
              value={systemHealth?.['memory'] ?? 0}
              icon={<MemoryStick className="w-4 h-4" />}
            />
            <MetricIndicator
              label="Disk"
              value={systemHealth?.['disk'] ?? 0}
              icon={<HardDrive className="w-4 h-4" />}
            />
            <NetworkStatus status={systemHealth?.['network'] ?? 'disconnected'} />
          </div>

          {/* Active Connections */}
          <div className="flex items-center gap-2 text-gray-400">
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
        {children && <div className="hidden md:flex items-center">{children}</div>}

        {/* Right Section - Last Update */}
        <div className="flex items-center gap-4 text-gray-400">
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
              <span className="font-medium">{formatTime(currentTime)}</span>
            </span>
          </div>

          <div className="text-xs opacity-75">
            {lastUpdate ? getTimeSinceUpdate(lastUpdate) : 'Never'}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden px-4 pb-2">
        <div className="flex items-center justify-between text-gray-400 text-xs">
          <span>
            <span className="font-medium">{activeConnections}</span> connections
          </span>
          <span>{lastUpdate ? getTimeSinceUpdate(lastUpdate) : 'Never'}</span>
        </div>

        {children && <div className="mt-2">{children}</div>}
      </div>
    </footer>
  );
};

export default StatusBar;
