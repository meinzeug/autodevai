import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Database, 
  Cpu, 
  HardDrive, 
  Network, 
  Eye,
  Download,
  Pause,
  Play,
  Settings,
  Filter
} from 'lucide-react';
import { Card, Button, Badge, Tabs, TabsContent, TabsList, TabsTrigger, Alert } from '../../components/ui';
import { TerminalOutput } from '../../components/ui';
import { cn } from '../../utils/cn';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

interface SystemAlert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  source: string;
}

interface MetricData {
  timestamp: number;
  value: number;
}

interface SystemMetrics {
  cpu: MetricData[];
  memory: MetricData[];
  disk: MetricData[];
  network: MetricData[];
}

interface MonitoringViewProps {
  className?: string;
  realTime?: boolean;
}

const generateMockLogs = (count: number): LogEntry[] => {
  const levels: LogEntry['level'][] = ['debug', 'info', 'warn', 'error'];
  const sources = ['Neural Engine', 'Docker', 'Claude Flow', 'Hive Mind', 'System'];
  const messages = {
    debug: ['Initializing connection pool', 'Cache miss for key: user_sessions', 'Garbage collection triggered'],
    info: ['Task completed successfully', 'New agent spawned', 'Configuration updated'],
    warn: ['High memory usage detected', 'Connection timeout retrying', 'Rate limit approaching'],
    error: ['Failed to connect to external API', 'Database query timeout', 'Authentication failed']
  };

  return Array.from({ length: count }, (_, i) => {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    const messageList = messages[level];
    const message = messageList[Math.floor(Math.random() * messageList.length)];
    
    return {
      id: `log-${Date.now()}-${i}`,
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      level,
      source,
      message,
      metadata: level === 'error' ? { stack: 'Error stack trace...', code: Math.floor(Math.random() * 500) + 400 } : undefined
    };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const mockAlerts: SystemAlert[] = [
  {
    id: 'alert-1',
    level: 'critical',
    title: 'High CPU Usage',
    message: 'CPU usage has exceeded 90% for more than 5 minutes',
    timestamp: new Date().toISOString(),
    acknowledged: false,
    source: 'System Monitor'
  },
  {
    id: 'alert-2',
    level: 'warning',
    title: 'Memory Usage Warning',
    message: 'Memory usage is approaching 80% threshold',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    acknowledged: false,
    source: 'System Monitor'
  },
  {
    id: 'alert-3',
    level: 'info',
    title: 'New Agent Registered',
    message: 'Neural agent "code-analyzer-04" has been added to the swarm',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    acknowledged: true,
    source: 'Agent Manager'
  }
];

export function MonitoringView({ className, realTime = true }: MonitoringViewProps) {
  const [logs, setLogs] = useState<LogEntry[]>(generateMockLogs(50));
  const [alerts, setAlerts] = useState<SystemAlert[]>(mockAlerts);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: [],
    memory: [],
    disk: [],
    network: []
  });
  const [activeTab, setActiveTab] = useState('logs');
  const [logFilter, setLogFilter] = useState<string>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Real-time log streaming
  useEffect(() => {
    if (!realTime || isPaused) return;

    const interval = setInterval(() => {
      const newLog = generateMockLogs(1)[0];
      setLogs(prev => [newLog, ...prev.slice(0, 199)]); // Keep only last 200 logs
      
      // Generate alert for errors
      if (newLog.level === 'error' && Math.random() < 0.3) {
        const newAlert: SystemAlert = {
          id: `alert-${Date.now()}`,
          level: 'error',
          title: 'System Error Detected',
          message: newLog.message,
          timestamp: newLog.timestamp,
          acknowledged: false,
          source: newLog.source
        };
        setAlerts(prev => [newAlert, ...prev.slice(0, 19)]);
      }
    }, 2000 + Math.random() * 3000); // Random interval

    return () => clearInterval(interval);
  }, [realTime, isPaused]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && activeTab === 'logs') {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, activeTab]);

  // Mock metrics generation
  useEffect(() => {
    if (!realTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setMetrics(prev => ({
        cpu: [...prev.cpu.slice(-29), { timestamp: now, value: Math.random() * 100 }],
        memory: [...prev.memory.slice(-29), { timestamp: now, value: Math.random() * 100 }],
        disk: [...prev.disk.slice(-29), { timestamp: now, value: Math.random() * 100 }],
        network: [...prev.network.slice(-29), { timestamp: now, value: Math.random() * 10000 }]
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [realTime]);

  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    return log.level === logFilter;
  });

  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  }, []);

  const handleClearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const handleExportLogs = useCallback(() => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredLogs]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'debug': return 'text-gray-500';
      case 'info': return 'text-blue-500';
      case 'warn': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      case 'critical': return 'text-red-700';
      default: return 'text-gray-500';
    }
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'debug': return 'secondary';
      case 'info': return 'default';
      case 'warn': return 'outline';
      case 'error': case 'critical': return 'destructive';
      default: return 'secondary';
    }
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);
  const criticalAlerts = alerts.filter(alert => alert.level === 'critical' && !alert.acknowledged);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Eye className="w-7 h-7" />
            System Monitoring
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time system logs, metrics, and alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isPaused ? 'default' : 'outline'}
            onClick={() => setIsPaused(!isPaused)}
            className="gap-2"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="outline" className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      {unacknowledgedAlerts.length > 0 && (
        <Alert variant={criticalAlerts.length > 0 ? 'destructive' : 'default'}>
          <AlertTriangle className="w-4 h-4" />
          <div className="flex items-center justify-between w-full">
            <div>
              <h4 className="font-medium">
                {unacknowledgedAlerts.length} Unacknowledged Alert{unacknowledgedAlerts.length > 1 ? 's' : ''}
              </h4>
              {criticalAlerts.length > 0 && (
                <p className="text-sm">{criticalAlerts.length} critical alerts require immediate attention</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('alerts')}
            >
              View All
            </Button>
          </div>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="logs" className="gap-2">
            <Database className="w-4 h-4" />
            Logs
            {logs.length > 0 && (
              <Badge variant="secondary" className="ml-1">{logs.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2">
            <Activity className="w-4 h-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alerts
            {unacknowledgedAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-1">{unacknowledgedAlerts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Cpu className="w-4 h-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    className="border rounded px-2 py-1 text-sm bg-background"
                  >
                    <option value="all">All Levels</option>
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {filteredLogs.length} of {logs.length} logs
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                  />
                  Auto-scroll
                </label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleExportLogs}>
                  <Download className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleClearLogs}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="h-96 overflow-y-auto border rounded-lg bg-black text-green-400 font-mono text-sm">
              {filteredLogs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No logs to display
                </div>
              ) : (
                <div className="p-4 space-y-1">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="flex gap-4 hover:bg-gray-900 px-2 py-1 rounded">
                      <span className="text-gray-400 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge 
                        size="sm"
                        variant={getLevelBadgeVariant(log.level)}
                        className="shrink-0 min-w-16 justify-center"
                      >
                        {log.level.toUpperCase()}
                      </Badge>
                      <span className="text-blue-400 shrink-0 min-w-24">
                        [{log.source}]
                      </span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-500" />
                CPU Usage
              </h3>
              <div className="h-32 flex items-end justify-between gap-1">
                {metrics.cpu.slice(-20).map((point, i) => (
                  <div
                    key={i}
                    className="bg-blue-500 w-2 min-h-1 rounded-t"
                    style={{ height: `${(point.value / 100) * 100}%` }}
                    title={`${point.value.toFixed(1)}%`}
                  />
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                Memory Usage
              </h3>
              <div className="h-32 flex items-end justify-between gap-1">
                {metrics.memory.slice(-20).map((point, i) => (
                  <div
                    key={i}
                    className="bg-green-500 w-2 min-h-1 rounded-t"
                    style={{ height: `${(point.value / 100) * 100}%` }}
                    title={`${point.value.toFixed(1)}%`}
                  />
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-purple-500" />
                Disk Usage
              </h3>
              <div className="h-32 flex items-end justify-between gap-1">
                {metrics.disk.slice(-20).map((point, i) => (
                  <div
                    key={i}
                    className="bg-purple-500 w-2 min-h-1 rounded-t"
                    style={{ height: `${(point.value / 100) * 100}%` }}
                    title={`${point.value.toFixed(1)}%`}
                  />
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Network className="w-5 h-5 text-yellow-500" />
                Network I/O
              </h3>
              <div className="h-32 flex items-end justify-between gap-1">
                {metrics.network.slice(-20).map((point, i) => (
                  <div
                    key={i}
                    className="bg-yellow-500 w-2 min-h-1 rounded-t"
                    style={{ height: `${(point.value / 10000) * 100}%` }}
                    title={`${(point.value / 1024).toFixed(1)} KB/s`}
                  />
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card className="p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Alerts</h3>
              <p className="text-gray-600 dark:text-gray-400">
                All systems are operating normally.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Alert key={alert.id} variant={alert.level === 'critical' || alert.level === 'error' ? 'destructive' : 'default'}>
                  <AlertTriangle className="w-4 h-4" />
                  <div className="flex items-start justify-between w-full">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{alert.title}</h4>
                        <Badge variant={getLevelBadgeVariant(alert.level)}>
                          {alert.level}
                        </Badge>
                        {alert.acknowledged && (
                          <Badge variant="outline">Acknowledged</Badge>
                        )}
                      </div>
                      <p className="text-sm">{alert.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Source: {alert.source}</span>
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">System Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Operating System:</span>
                  <span className="font-medium">Linux Ubuntu 22.04</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Kernel Version:</span>
                  <span className="font-medium">6.1.0-39-amd64</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Uptime:</span>
                  <span className="font-medium">2d 14h 32m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Load Average:</span>
                  <span className="font-medium">0.85, 1.02, 0.97</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Processes:</span>
                  <span className="font-medium">245 total, 3 running</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Service Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Neural Engine</span>
                  <Badge variant="default">Running</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Docker Daemon</span>
                  <Badge variant="default">Running</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Claude Flow</span>
                  <Badge variant="default">Running</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Hive Mind</span>
                  <Badge variant="outline">Standby</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Redis Cache</span>
                  <Badge variant="default">Running</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Gateway</span>
                  <Badge variant="destructive">Stopped</Badge>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MonitoringView;