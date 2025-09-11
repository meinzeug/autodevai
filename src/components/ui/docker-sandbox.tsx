import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { Input } from "./input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { TerminalOutput } from "./terminal-output"
import { Progress } from "./progress"
import { 
  Container, 
  Play, 
  Square, 
  Trash2, 
  RefreshCw,
  Terminal,
  Network,
  Cpu,
  MemoryStick
} from "lucide-react"
import { cn } from "../../utils/cn"
import { DockerContainer } from "../../types"

interface DockerSandboxProps {
  containers?: DockerContainer[]
  onContainerStart?: (containerId: string) => void
  onContainerStop?: (containerId: string) => void
  onContainerRemove?: (containerId: string) => void
  onCreateContainer?: (config: ContainerConfig) => void
  onRefresh?: () => void
  className?: string
}

interface ContainerConfig {
  name: string
  image: string
  ports: string[]
  environment: Record<string, string>
  volumes: string[]
}

interface ContainerStats {
  cpuUsage: number
  memoryUsage: number
  memoryLimit: number
  networkIn: number
  networkOut: number
}

const defaultImages = [
  'node:18-alpine',
  'python:3.11-slim',
  'nginx:alpine',
  'redis:alpine',
  'postgres:15-alpine',
  'ubuntu:22.04',
] as const

const statusColors = {
  running: 'text-green-600 text-green-400 bg-green-50 bg-green-950',
  stopped: 'text-gray-600 text-gray-400 bg-gray-50 bg-gray-950',
  paused: 'text-yellow-600 text-yellow-400 bg-yellow-50 bg-yellow-950',
  error: 'text-red-600 text-red-400 bg-red-50 bg-red-950',
} as const

function ContainerCard({ 
  container, 
  onStart, 
  onStop, 
  onRemove,
  stats
}: { 
  container: DockerContainer
  onStart?: () => void
  onStop?: () => void
  onRemove?: () => void
  stats?: ContainerStats
}) {
  const [showTerminal, setShowTerminal] = React.useState(false)
  const [terminalLines] = React.useState([
    {
      id: '1',
      timestamp: new Date().toISOString(),
      content: `Container ${container.name} initialized`,
      type: 'info' as const
    }
  ])

  const isRunning = container.status === 'running'
  const statusColor = statusColors[container.status as keyof typeof statusColors] || statusColors.stopped

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB']
    let value = bytes
    let unitIndex = 0
    
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024
      unitIndex++
    }
    
    return `${value.toFixed(1)}${units[unitIndex]}`
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Container className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-sm font-medium">{container.name}</CardTitle>
              <p className="text-xs text-muted-foreground">ID: {container.id.slice(0, 12)}</p>
            </div>
          </div>
          
          <Badge className={cn("text-xs", statusColor)}>
            {container.status}
          </Badge>
        </div>

        {container.ports.length > 0 && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Network className="h-3 w-3" />
            <span>Ports: {container.ports.join(', ')}</span>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1">
                  <Cpu className="h-3 w-3" />
                  <span>CPU</span>
                </div>
                <span>{stats.cpuUsage.toFixed(1)}%</span>
              </div>
              <Progress value={stats.cpuUsage} className="h-1" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1">
                  <MemoryStick className="h-3 w-3" />
                  <span>Memory</span>
                </div>
                <span>{formatBytes(stats.memoryUsage)} / {formatBytes(stats.memoryLimit)}</span>
              </div>
              <Progress value={(stats.memoryUsage / stats.memoryLimit) * 100} className="h-1" />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!isRunning && (
              <Button
                onClick={onStart}
                size="sm"
                variant="default"
                className="h-8 text-xs"
              >
                <Play className="h-3 w-3 mr-1" />
                Start
              </Button>
            )}

            {isRunning && (
              <Button
                onClick={onStop}
                size="sm"
                variant="secondary"
                className="h-8 text-xs"
              >
                <Square className="h-3 w-3 mr-1" />
                Stop
              </Button>
            )}

            <Button
              onClick={() => setShowTerminal(!showTerminal)}
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
            >
              <Terminal className="h-3 w-3 mr-1" />
              Terminal
            </Button>
          </div>

          <Button
            onClick={onRemove}
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {showTerminal && (
          <TerminalOutput
            lines={terminalLines}
            title={`${container.name} Terminal`}
            height="200px"
            showTimestamps={false}
            allowFullscreen={false}
          />
        )}
      </CardContent>
    </Card>
  )
}

function CreateContainerForm({ 
  onSubmit,
  onCancel 
}: { 
  onSubmit: (config: ContainerConfig) => void
  onCancel: () => void 
}) {
  const [config, setConfig] = React.useState<ContainerConfig>({
    name: '',
    image: 'node:18-alpine',
    ports: [],
    environment: {},
    volumes: [],
  })

  const [portInput, setPortInput] = React.useState('')
  const [envKey, setEnvKey] = React.useState('')
  const [envValue, setEnvValue] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (config.name && config.image) {
      onSubmit(config)
    }
  }

  const addPort = () => {
    if (portInput && !config.ports.includes(portInput)) {
      setConfig(prev => ({
        ...prev,
        ports: [...prev.ports, portInput]
      }))
      setPortInput('')
    }
  }

  const removePort = (port: string) => {
    setConfig(prev => ({
      ...prev,
      ports: prev.ports.filter(p => p !== port)
    }))
  }

  const addEnvironmentVar = () => {
    if (envKey && envValue) {
      setConfig(prev => ({
        ...prev,
        environment: { ...prev.environment, [envKey]: envValue }
      }))
      setEnvKey('')
      setEnvValue('')
    }
  }

  const removeEnvironmentVar = (key: string) => {
    setConfig(prev => {
      const newEnv = { ...prev.environment }
      delete newEnv[key]
      return { ...prev, environment: newEnv }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Container</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Container Name</label>
              <Input
                value={config.name}
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="my-container"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Docker Image</label>
              <Select
                value={config.image}
                onValueChange={(value) => setConfig(prev => ({ ...prev, image: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {defaultImages.map(image => (
                    <SelectItem key={image} value={image}>
                      {image}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Port Mappings</label>
            <div className="flex space-x-2">
              <Input
                value={portInput}
                onChange={(e) => setPortInput(e.target.value)}
                placeholder="8080:80"
                className="flex-1"
              />
              <Button type="button" onClick={addPort} size="sm">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.ports.map(port => (
                <Badge key={port} variant="secondary" className="text-xs">
                  {port}
                  <button
                    type="button"
                    onClick={() => removePort(port)}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Environment Variables</label>
            <div className="flex space-x-2">
              <Input
                value={envKey}
                onChange={(e) => setEnvKey(e.target.value)}
                placeholder="Key"
                className="flex-1"
              />
              <Input
                value={envValue}
                onChange={(e) => setEnvValue(e.target.value)}
                placeholder="Value"
                className="flex-1"
              />
              <Button type="button" onClick={addEnvironmentVar} size="sm">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(config.environment).map(([key, value]) => (
                <Badge key={key} variant="secondary" className="text-xs">
                  {key}={value}
                  <button
                    type="button"
                    onClick={() => removeEnvironmentVar(key)}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4">
            <Button type="button" onClick={onCancel} variant="outline" size="sm">
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Create Container
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function DockerSandbox({
  containers = [],
  onContainerStart,
  onContainerStop,
  onContainerRemove,
  onCreateContainer,
  onRefresh,
  className
}: DockerSandboxProps) {
  const [showCreateForm, setShowCreateForm] = React.useState(false)
  const [containerStats] = React.useState<Record<string, ContainerStats>>({})

  const runningContainers = containers.filter(c => c.status === 'running').length
  const stoppedContainers = containers.filter(c => c.status !== 'running').length

  const handleCreateContainer = (config: ContainerConfig) => {
    onCreateContainer?.(config)
    setShowCreateForm(false)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Container className="h-5 w-5" />
            <span>Docker Sandbox</span>
          </h2>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>{runningContainers} running</span>
            <span>{stoppedContainers} stopped</span>
            <span>{containers.length} total</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onRefresh && (
            <Button onClick={onRefresh} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          )}

          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)} 
            size="sm"
          >
            <Container className="h-4 w-4 mr-1" />
            New Container
          </Button>
        </div>
      </div>

      {/* Create Container Form */}
      {showCreateForm && (
        <CreateContainerForm
          onSubmit={handleCreateContainer}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Containers Grid */}
      {containers.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-2">
              <Container className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No containers found</p>
              <Button 
                onClick={() => setShowCreateForm(true)} 
                size="sm" 
                variant="ghost"
              >
                Create your first container
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {containers.map((container) => (
            <ContainerCard
              key={container.id}
              container={container}
              stats={containerStats[container.id]}
              onStart={() => onContainerStart?.(container.id)}
              onStop={() => onContainerStop?.(container.id)}
              onRemove={() => onContainerRemove?.(container.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}