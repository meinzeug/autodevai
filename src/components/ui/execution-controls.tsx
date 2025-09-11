import * as React from "react"
import { Button } from "./button"
import { Badge } from "./badge"
import { Play, Square, RotateCcw, Settings, Activity } from "lucide-react"
import { cn } from "../../utils/cn"
import { TaskStatus } from "../../types"

interface ExecutionControlsProps {
  status?: TaskStatus
  onStart?: () => void
  onStop?: () => void
  onRestart?: () => void
  onSettings?: () => void
  disabled?: boolean
  showSettings?: boolean
  executionTime?: number
  className?: string
  // Add compatibility for OrchestrationView usage
  isExecuting?: boolean
  onExecute?: () => void
  onPause?: () => void
}

const statusConfig = {
  pending: {
    label: 'Pending',
    variant: 'secondary' as const,
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  running: {
    label: 'Running',
    variant: 'default' as const,
    color: 'text-green-600 dark:text-green-400',
  },
  completed: {
    label: 'Completed',
    variant: 'secondary' as const,
    color: 'text-blue-600 dark:text-blue-400',
  },
  failed: {
    label: 'Failed',
    variant: 'destructive' as const,
    color: 'text-red-600 dark:text-red-400',
  },
} as const

function formatExecutionTime(ms?: number): string {
  if (!ms) return '0s'
  
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export function ExecutionControls({
  status = 'pending',
  onStart,
  onStop,
  onRestart,
  onSettings,
  disabled = false,
  showSettings = true,
  executionTime,
  className,
  // Compatibility props
  isExecuting,
  onExecute,
  onPause
}: ExecutionControlsProps) {
  const config = statusConfig[status]
  const canStart = status === 'pending' || status === 'failed' || status === 'completed'
  const canStop = status === 'running'
  
  // Handle compatibility with isExecuting prop
  const effectiveCanStart = canStart && !isExecuting
  const effectiveCanStop = canStop || isExecuting

  return (
    <div className={cn("flex items-center justify-between p-4 border rounded-lg bg-card", className)}>
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <Activity className={cn("h-4 w-4", config.color)} />
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={config.variant} className="text-xs">
            {config.label}
          </Badge>
        </div>

        {executionTime !== undefined && (
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <span>Runtime:</span>
            <span className="font-mono">{formatExecutionTime(executionTime)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {effectiveCanStart && (
          <Button
            onClick={onExecute || onStart}
            disabled={disabled}
            size="sm"
            variant="default"
          >
            <Play className="h-4 w-4 mr-1" />
            {onExecute ? 'Execute' : 'Start'}
          </Button>
        )}

        {effectiveCanStop && (
          <Button
            onClick={onStop}
            disabled={disabled}
            size="sm"
            variant="destructive"
          >
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
        )}
        
        {isExecuting && onPause && (
          <Button
            onClick={onPause}
            disabled={disabled}
            size="sm"
            variant="secondary"
          >
            <Square className="h-4 w-4 mr-1" />
            Pause
          </Button>
        )}

        {(status === 'completed' || status === 'failed') && onRestart && (
          <Button
            onClick={onRestart}
            disabled={disabled}
            size="sm"
            variant="secondary"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Restart
          </Button>
        )}

        {showSettings && onSettings && (
          <Button
            onClick={onSettings}
            disabled={disabled}
            size="sm"
            variant="ghost"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}