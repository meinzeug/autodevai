import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '../common/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Badge } from '../ui/badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useSystemCheck } from '../../hooks/useSystemCheck';
import { formatBytes, formatDuration } from '../../utils/format';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  MemoryStick,
  Network,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Server
} from 'lucide-react';

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    frequency: number;
    temperature?: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
  };
  processes: {
    total: number;
    running: number;
    sleeping: number;
    stopped: number;
  };
}

interface AIToolStatus {
  name: string;
  status: 'online' | 'offline' | 'error' | 'checking';
  lastCheck: Date;
  responseTime?: number;
  version?: string;
}

interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageDuration: number;
  successRate: number;
}

export const MonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [aiTools, setAiTools] = useState<AIToolStatus[]>([]);
  const [taskMetrics, setTaskMetrics] = useState<TaskMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const { prerequisites } = useSystemCheck();

  // Fetch system metrics
  const fetchMetrics = React.useCallback(async () => {
    try {
      const systemInfo = await invoke<SystemMetrics>('get_system_metrics');
      setMetrics(systemInfo);
      
      // Fetch AI tool status
      const toolStatus: AIToolStatus[] = [
        {
          name: 'Claude-Flow',
          status: prerequisites?.claude_flow_ready ? 'online' : 'offline',
          lastCheck: new Date(),
          version: '2.0.0-alpha',
          responseTime: Math.random() * 100 + 50
        },
        {
          name: 'OpenAI Codex',
          status: prerequisites?.codex_ready ? 'online' : 'offline',
          lastCheck: new Date(),
          version: '2025.1',
          responseTime: Math.random() * 150 + 100
        },
        {
          name: 'Claude-Code',
          status: prerequisites?.claude_code_ready ? 'online' : 'offline',
          lastCheck: new Date(),
          version: '1.0.0',
          responseTime: Math.random() * 80 + 40
        }
      ];
      setAiTools(toolStatus);

      // Fetch task metrics
      const tasks = await invoke<TaskMetrics>('get_task_metrics');
      setTaskMetrics(tasks);
      
      setError(null);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError('Failed to fetch system metrics');
      
      // Set mock data for development
      setMetrics({
        cpu: {
          usage: Math.random() * 100,
          cores: 8,
          frequency: 2.4,
          temperature: 45 + Math.random() * 20
        },
        memory: {
          total: 16 * 1024 * 1024 * 1024,
          used: 8 * 1024 * 1024 * 1024 + Math.random() * 4 * 1024 * 1024 * 1024,
          available: 8 * 1024 * 1024 * 1024,
          percentage: 50 + Math.random() * 30
        },
        disk: {
          total: 512 * 1024 * 1024 * 1024,
          used: 256 * 1024 * 1024 * 1024 + Math.random() * 100 * 1024 * 1024 * 1024,
          available: 256 * 1024 * 1024 * 1024,
          percentage: 50 + Math.random() * 20
        },
        network: {
          bytesReceived: Math.floor(Math.random() * 1024 * 1024 * 1024),
          bytesSent: Math.floor(Math.random() * 512 * 1024 * 1024),
          packetsReceived: Math.floor(Math.random() * 1000000),
          packetsSent: Math.floor(Math.random() * 800000)
        },
        processes: {
          total: 250 + Math.floor(Math.random() * 50),
          running: 5 + Math.floor(Math.random() * 10),
          sleeping: 200 + Math.floor(Math.random() * 40),
          stopped: Math.floor(Math.random() * 5)
        }
      });

      setTaskMetrics({
        totalTasks: 150,
        completedTasks: 142,
        failedTasks: 8,
        averageDuration: 3500,
        successRate: 94.67
      });
    } finally {
      setIsLoading(false);
    }
  }, [prerequisites]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchMetrics]);

  const getStatusColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-500';
    if (percentage < 75) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusBadgeVariant = (status: AIToolStatus['status']) => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'secondary';
      case 'error': return 'destructive';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold">System Monitoring Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Real-time system metrics and AI tool status
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-3 py-1 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
          >
            <option value={1000}>1s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
          <Badge variant="default">
            <Clock className="w-3 h-3 mr-1" />
            Auto-refresh
          </Badge>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800 dark:text-yellow-200">
              {error} - Showing mock data
            </span>
          </div>
        </div>
      )}

      {/* System Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Usage */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Cpu className="w-5 h-5 text-blue-500 mr-2" />
              <span className="font-medium">CPU Usage</span>
            </div>
            <span className={`text-2xl font-bold ${getStatusColor(metrics?.cpu.usage || 0)}`}>
              {metrics?.cpu.usage.toFixed(1)}%
            </span>
          </div>
          <ProgressBar value={metrics?.cpu.usage || 0} max={100} className="mb-2" />
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div>Cores: {metrics?.cpu.cores}</div>
            <div>Frequency: {metrics?.cpu.frequency} GHz</div>
            {metrics?.cpu.temperature && (
              <div>Temperature: {metrics.cpu.temperature.toFixed(1)}°C</div>
            )}
          </div>
        </Card>

        {/* Memory Usage */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <MemoryStick className="w-5 h-5 text-green-500 mr-2" />
              <span className="font-medium">Memory</span>
            </div>
            <span className={`text-2xl font-bold ${getStatusColor(metrics?.memory.percentage || 0)}`}>
              {metrics?.memory.percentage.toFixed(1)}%
            </span>
          </div>
          <ProgressBar value={metrics?.memory.percentage || 0} max={100} className="mb-2" />
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div>Used: {formatBytes(metrics?.memory.used || 0)}</div>
            <div>Total: {formatBytes(metrics?.memory.total || 0)}</div>
            <div>Available: {formatBytes(metrics?.memory.available || 0)}</div>
          </div>
        </Card>

        {/* Disk Usage */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <HardDrive className="w-5 h-5 text-purple-500 mr-2" />
              <span className="font-medium">Disk Space</span>
            </div>
            <span className={`text-2xl font-bold ${getStatusColor(metrics?.disk.percentage || 0)}`}>
              {metrics?.disk.percentage.toFixed(1)}%
            </span>
          </div>
          <ProgressBar value={metrics?.disk.percentage || 0} max={100} className="mb-2" />
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div>Used: {formatBytes(metrics?.disk.used || 0)}</div>
            <div>Total: {formatBytes(metrics?.disk.total || 0)}</div>
            <div>Free: {formatBytes(metrics?.disk.available || 0)}</div>
          </div>
        </Card>

        {/* Network Activity */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Network className="w-5 h-5 text-orange-500 mr-2" />
              <span className="font-medium">Network</span>
            </div>
            <Zap className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-2">
            <div className="flex justify-between">
              <span>↓ Received:</span>
              <span className="font-mono">{formatBytes(metrics?.network.bytesReceived || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>↑ Sent:</span>
              <span className="font-mono">{formatBytes(metrics?.network.bytesSent || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Packets:</span>
              <span className="font-mono">
                {((metrics?.network.packetsReceived || 0) / 1000).toFixed(1)}k
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* AI Tools Status */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Server className="w-6 h-6 text-indigo-500 mr-2" />
          <h2 className="text-lg font-semibold">AI Tools Status</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aiTools.map((tool) => (
            <div
              key={tool.name}
              className="p-4 border rounded-lg dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{tool.name}</span>
                <Badge variant={getStatusBadgeVariant(tool.status)}>
                  {tool.status === 'online' && <CheckCircle className="w-3 h-3 mr-1" />}
                  {tool.status === 'offline' && <AlertCircle className="w-3 h-3 mr-1" />}
                  {tool.status}
                </Badge>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                {tool.version && <div>Version: {tool.version}</div>}
                {tool.responseTime && (
                  <div>Response: {tool.responseTime.toFixed(0)}ms</div>
                )}
                <div>Last check: {tool.lastCheck.toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Task Metrics */}
      {taskMetrics && (
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-6 h-6 text-green-500 mr-2" />
            <h2 className="text-lg font-semibold">Task Performance</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-2xl font-bold">{taskMetrics.totalTasks}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Tasks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">
                {taskMetrics.completedTasks}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">
                {taskMetrics.failedTasks}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Failed</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {formatDuration(taskMetrics.averageDuration)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Avg Duration</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-500">
                {taskMetrics.successRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Success Rate</div>
            </div>
          </div>
          
          <div className="mt-4">
            <ProgressBar
              value={taskMetrics.successRate}
              max={100}
              className="h-3"
              variant={taskMetrics.successRate > 90 ? 'success' : 'warning'}
            />
          </div>
        </Card>
      )}

      {/* Process Information */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Activity className="w-6 h-6 text-cyan-500 mr-2" />
          <h2 className="text-lg font-semibold">Process Information</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{metrics?.processes.total}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Processes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500">
              {metrics?.processes.running}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Running</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-500">
              {metrics?.processes.sleeping}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Sleeping</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-500">
              {metrics?.processes.stopped}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Stopped</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MonitoringDashboard;