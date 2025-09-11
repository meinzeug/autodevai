import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Cpu, HardDrive, Network, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, Badge, Button, Progress, Alert } from '../../components/ui';
import { MetricsDisplay } from '../../components/ui';
import { cn } from '../../utils/cn';

interface SystemMetrics {
  name: "cpu", value: number;
  memory: number;
  disk: number;
  network: 'connected' | 'disconnected' | 'limited';
  uptime: number;
  activeConnections: number;
  errorRate: number;
}

interface MonitoringDashboardProps {
  className?: string;
  realTime?: boolean;
  onAlert?: (alert: AlertData) => void;
}

interface AlertData {
  id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

const mockMetrics: SystemMetrics = {
  name: "cpu", value: 45.2,
  memory: 62.8,
  disk: 78.4,
  network: 'connected',
  uptime: 86400,
  activeConnections: 12,
  errorRate: 0.02
};

const mockAlerts: AlertData[] = [
  {
    id: '1',
    level: 'warning',
    message: 'High memory usage detected (>80%)',
    timestamp: new Date().toISOString()
  },
  {
    id: '2',
    level: 'info',
    message: 'System health check completed successfully',
    timestamp: new Date(Date.now() - 300000).toISOString()
  }
];

export function MonitoringDashboard({ className, realTime = true, onAlert }: MonitoringDashboardProps) {
  const [metrics, setMetrics] = useState<SystemMetrics>(mockMetrics);
  const [alerts, setAlerts] = useState<AlertData[]>(mockAlerts);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real-time metrics update
  useEffect(() => {
    if (!realTime) return;

    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        name: "cpu", value: Math.max(0, Math.min(100, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(0, Math.min(100, prev.memory + (Math.random() - 0.5) * 5)),
        disk: Math.max(0, Math.min(100, prev.disk + (Math.random() - 0.5) * 2)),
        activeConnections: Math.max(0, prev.activeConnections + Math.floor((Math.random() - 0.5) * 4)),
        errorRate: Math.max(0, prev.errorRate + (Math.random() - 0.5) * 0.01)
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [realTime]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate new alert if error rate is high
    if (metrics.errorRate > 0.05) {
      const newAlert: AlertData = {
        id: Date.now().toString(),
        level: 'error',
        message: `High error rate detected: ${(metrics.errorRate * 100).toFixed(2)}%`,
        timestamp: new Date().toISOString()
      };
      setAlerts(prev => [newAlert, ...prev.slice(0, 9)]);
      onAlert?.(newAlert);
    }
    
    setIsRefreshing(false);
  }, [metrics.errorRate, onAlert]);

  const getNetworkStatusColor = () => {
    switch (metrics.network) {
      case 'connected': return 'text-green-500';
      case 'limited': return 'text-yellow-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getMetricColor = (value: number, thresholds = { warning: 70, error: 90 }) => {
    if (value >= thresholds.error) return 'text-red-500';
    if (value >= thresholds.warning) return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Monitoring</h2>
          <p className="text-gray-600 dark:text-gray-400">Real-time system health and performance metrics</p>
        </div>
        <Button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <Activity className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Recent Alerts
          </h3>
          {alerts.slice(0, 3).map(alert => (
            <Alert key={alert.id} variant={alert.level === 'error' ? 'destructive' : 'default'}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{alert.message}</p>
                  <p className="text-sm opacity-75">{new Date(alert.timestamp).toLocaleString()}</p>
                </div>
                <Badge variant={alert.level === 'error' ? 'destructive' : 'secondary'}>
                  {alert.level}
                </Badge>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CPU Usage */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-500" />
              <span className="font-medium">CPU Usage</span>
            </div>
            <span className={cn('text-sm font-bold', getMetricColor(metrics.cpu))}>
              {metrics.cpu.toFixed(1)}%
            </span>
          </div>
          <Progress value={metrics.cpu} className="h-2" />
        </Card>

        {/* Memory Usage */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              <span className="font-medium">Memory</span>
            </div>
            <span className={cn('text-sm font-bold', getMetricColor(metrics.memory))}>
              {metrics.memory.toFixed(1)}%
            </span>
          </div>
          <Progress value={metrics.memory} className="h-2" />
        </Card>

        {/* Disk Usage */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-purple-500" />
              <span className="font-medium">Disk Space</span>
            </div>
            <span className={cn('text-sm font-bold', getMetricColor(metrics.disk))}>
              {metrics.disk.toFixed(1)}%
            </span>
          </div>
          <Progress value={metrics.disk} className="h-2" />
        </Card>

        {/* Network Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Network className={cn('w-5 h-5', getNetworkStatusColor())} />
              <span className="font-medium">Network</span>
            </div>
            <Badge variant={metrics.network === 'connected' ? 'default' : 'secondary'}>
              {metrics.network}
            </Badge>
          </div>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Connections:</span>
              <span className="font-medium">{metrics.activeConnections}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Overview */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Performance Overview
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">System Uptime</span>
              <span className="font-semibold">{formatUptime(metrics.uptime)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Error Rate</span>
              <span className={cn('font-semibold', getMetricColor(metrics.errorRate * 100, { warning: 3, error: 5 }))}>
                {(metrics.errorRate * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Active Sessions</span>
              <span className="font-semibold">{metrics.activeConnections}</span>
            </div>
          </div>
        </Card>

        {/* System Health */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">System Health Score</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-500 mb-2">
              {Math.round((100 - (metrics.cpu + metrics.memory + metrics.disk) / 3))}
            </div>
            <p className="text-gray-600 dark:text-gray-400">Overall Health Score</p>
            <MetricsDisplay
              metrics={{
                name: "cpu", value: metrics.cpu,
                memory: metrics.memory,
                disk: metrics.disk,
                network: metrics.network,
                uptime: metrics.uptime
              }}
              className="mt-4"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

export default MonitoringDashboard;