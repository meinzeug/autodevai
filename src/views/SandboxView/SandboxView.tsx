import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Play, 
  Square, 
  RefreshCw, 
  Terminal, 
  Settings, 
  Trash2, 
  Plus,
  Activity,
  HardDrive,
  Network
} from 'lucide-react';
import { Card, Button, Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui';
import { DockerSandbox } from '../../components/ui';
import { cn } from '../../utils/cn';

interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'paused' | 'restarting';
  created: string;
  ports: string[];
  cpu: number;
  memory: number;
  network: string;
}

interface SandboxEnvironment {
  id: string;
  name: string;
  type: 'development' | 'testing' | 'production' | 'custom';
  containers: ContainerInfo[];
  created: string;
  status: 'active' | 'inactive' | 'error';
}

interface SandboxViewProps {
  className?: string;
  dockerEnabled?: boolean;
  onDockerToggle?: (enabled: boolean) => void;
}

const mockContainers: ContainerInfo[] = [
  {
    id: 'container-1',
    name: 'autodevai-neural-bridge',
    image: 'node:18-alpine',
    status: 'running',
    created: '2 hours ago',
    ports: ['3000:3000', '5000:5000'],
    cpu: 25.4,
    memory: 512,
    network: 'bridge'
  },
  {
    id: 'container-2',
    name: 'claude-flow-worker',
    image: 'python:3.11-slim',
    status: 'running',
    created: '1 hour ago',
    ports: ['8080:8080'],
    cpu: 15.2,
    memory: 256,
    network: 'bridge'
  },
  {
    id: 'container-3',
    name: 'redis-cache',
    image: 'redis:7-alpine',
    status: 'running',
    created: '3 hours ago',
    ports: ['6379:6379'],
    cpu: 5.1,
    memory: 64,
    network: 'bridge'
  },
  {
    id: 'container-4',
    name: 'test-environment',
    image: 'ubuntu:22.04',
    status: 'stopped',
    created: '1 day ago',
    ports: [],
    cpu: 0,
    memory: 0,
    network: 'none'
  }
];

const mockEnvironments: SandboxEnvironment[] = [
  {
    id: 'env-1',
    name: 'Development Environment',
    type: 'development',
    containers: mockContainers.slice(0, 2),
    created: '2 days ago',
    status: 'active'
  },
  {
    id: 'env-2',
    name: 'Testing Suite',
    type: 'testing',
    containers: [mockContainers[3]],
    created: '1 day ago',
    status: 'inactive'
  }
];

export function SandboxView({ className, dockerEnabled = true, onDockerToggle }: SandboxViewProps) {
  const [containers, setContainers] = useState<ContainerInfo[]>(mockContainers);
  const [environments, setEnvironments] = useState<SandboxEnvironment[]>(mockEnvironments);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState('containers');

  // Simulate real-time updates
  useEffect(() => {
    if (!dockerEnabled) return;

    const interval = setInterval(() => {
      setContainers(prev => prev.map(container => {
        if (container.status === 'running') {
          return {
            ...container,
            cpu: Math.max(0, Math.min(100, container.cpu + (Math.random() - 0.5) * 5)),
            memory: Math.max(0, container.memory + Math.floor((Math.random() - 0.5) * 20))
          };
        }
        return container;
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [dockerEnabled]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  }, []);

  const handleContainerAction = useCallback(async (containerId: string, action: 'start' | 'stop' | 'restart' | 'remove') => {
    console.log(`${action} container:`, containerId);
    
    if (action === 'remove') {
      setContainers(prev => prev.filter(c => c.id !== containerId));
      return;
    }

    setContainers(prev => prev.map(container => {
      if (container.id === containerId) {
        switch (action) {
          case 'start':
            return { ...container, status: 'running' };
          case 'stop':
            return { ...container, status: 'stopped', cpu: 0, memory: 0 };
          case 'restart':
            return { ...container, status: 'restarting' };
          default:
            return container;
        }
      }
      return container;
    }));

    // Simulate restart delay
    if (action === 'restart') {
      setTimeout(() => {
        setContainers(prev => prev.map(container => 
          container.id === containerId ? { ...container, status: 'running' } : container
        ));
      }, 2000);
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-500';
      case 'stopped': return 'text-gray-500';
      case 'paused': return 'text-yellow-500';
      case 'restarting': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'running': return 'default';
      case 'stopped': return 'secondary';
      case 'paused': return 'outline';
      case 'restarting': return 'outline';
      default: return 'secondary';
    }
  };

  const runningContainers = containers.filter(c => c.status === 'running').length;
  const totalCpu = containers.filter(c => c.status === 'running').reduce((sum, c) => sum + c.cpu, 0);
  const totalMemory = containers.filter(c => c.status === 'running').reduce((sum, c) => sum + c.memory, 0);

  if (!dockerEnabled) {
    return (
      <div className={cn('space-y-6', className)}>
        <Card className="p-8 text-center">
          <Container className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Docker Not Enabled</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Enable Docker to manage containers and sandbox environments.
          </p>
          <Button onClick={() => onDockerToggle?.(true)}>
            Enable Docker
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sandbox Management</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage Docker containers and development environments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Container
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Running</p>
              <p className="text-2xl font-bold text-green-500">{runningContainers}</p>
            </div>
            <Container className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Containers</p>
              <p className="text-2xl font-bold">{containers.length}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CPU Usage</p>
              <p className="text-2xl font-bold text-yellow-500">{totalCpu.toFixed(1)}%</p>
            </div>
            <Activity className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Memory</p>
              <p className="text-2xl font-bold text-purple-500">{totalMemory} MB</p>
            </div>
            <HardDrive className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="containers">Containers</TabsTrigger>
          <TabsTrigger value="environments">Environments</TabsTrigger>
          <TabsTrigger value="sandbox">Sandbox</TabsTrigger>
        </TabsList>

        {/* Containers Tab */}
        <TabsContent value="containers" className="space-y-4">
          {containers.map((container) => (
            <Card key={container.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Container className={cn('w-6 h-6', getStatusColor(container.status))} />
                  <div>
                    <h3 className="font-semibold">{container.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {container.image} • Created {container.created}
                    </p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(container.status)}>
                    {container.status}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {container.status === 'stopped' ? (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleContainerAction(container.id, 'start')}
                      className="gap-1"
                    >
                      <Play className="w-3 h-3" />
                      Start
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleContainerAction(container.id, 'stop')}
                      className="gap-1"
                    >
                      <Square className="w-3 h-3" />
                      Stop
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleContainerAction(container.id, 'restart')}
                    disabled={container.status === 'restarting'}
                    className="gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Restart
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setSelectedContainer(container.id)}
                    className="gap-1"
                  >
                    <Terminal className="w-3 h-3" />
                    Shell
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleContainerAction(container.id, 'remove')}
                    className="gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">CPU:</span>
                  <span className="ml-2 font-medium">{container.cpu.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                  <span className="ml-2 font-medium">{container.memory} MB</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Network:</span>
                  <span className="ml-2 font-medium">{container.network}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Ports:</span>
                  <span className="ml-2 font-medium">
                    {container.ports.length > 0 ? container.ports.join(', ') : 'None'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Environments Tab */}
        <TabsContent value="environments" className="space-y-4">
          {environments.map((env) => (
            <Card key={env.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{env.name}</h3>
                    <Badge variant={env.status === 'active' ? 'default' : 'secondary'}>
                      {env.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {env.type} environment • {env.containers.length} containers • Created {env.created}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Containers:</h4>
                {env.containers.map((container) => (
                  <div key={container.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="flex items-center gap-2">
                      <Container className={cn('w-4 h-4', getStatusColor(container.status))} />
                      <span className="text-sm font-medium">{container.name}</span>
                      <Badge variant={getStatusBadgeVariant(container.status)}>
                        {container.status}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500">{container.image}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Sandbox Tab */}
        <TabsContent value="sandbox" className="space-y-4">
          <DockerSandbox
            containers={containers}
            onContainerStart={(id) => handleContainerAction(id, 'start')}
            onContainerStop={(id) => handleContainerAction(id, 'stop')}
            onContainerRemove={(id) => handleContainerAction(id, 'remove')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SandboxView;