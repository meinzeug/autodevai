import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { Progress } from "./progress"
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Download, 
  ExternalLink,
  Copy,
  MoreHorizontal
} from "lucide-react"
import { cn } from "../../utils/cn"
import { ExecutionResult, TaskStatus } from "../../types"

interface ResultCardProps extends Partial<ExecutionResult> {
  id?: string
  title?: string
  status?: TaskStatus
  progress?: number
  metadata?: Record<string, any>
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'default' | 'secondary' | 'destructive'
    icon?: React.ComponentType<{ className?: string }>
  }>
  onViewDetails?: () => void
  onDownload?: () => void
  onCopy?: () => void
  className?: string
  compact?: boolean
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: 'Pending',
    variant: 'secondary' as const,
    color: 'text-yellow-600 text-yellow-400',
  },
  running: {
    icon: Clock,
    label: 'Running',
    variant: 'default' as const,
    color: 'text-blue-600 text-blue-400',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    variant: 'default' as const,
    color: 'text-green-600 text-green-400',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    variant: 'destructive' as const,
    color: 'text-red-600 text-red-400',
  },
} as const

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}

export function ResultCard({
  id,
  title,
  status = 'pending',
  success,
  output,
  tool_used,
  duration_ms,
  progress,
  metadata,
  actions = [],
  onViewDetails,
  onDownload,
  onCopy,
  className,
  compact = false
}: ResultCardProps) {
  const config = statusConfig[status]
  const StatusIcon = config.icon
  const [isExpanded, setIsExpanded] = React.useState(false)

  const inferredSuccess = success ?? (status === 'completed')
  const displayStatus = status === 'completed' && !inferredSuccess ? 'failed' : status
  const finalConfig = statusConfig[displayStatus as TaskStatus] || config

  const handleCopy = async () => {
    if (output && onCopy) {
      try {
        await navigator.clipboard.writeText(output)
        onCopy()
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className={cn("pb-3", compact && "pb-2")}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <StatusIcon className={cn("h-5 w-5 mt-0.5", finalConfig.color)} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <CardTitle className={cn(
                  "text-sm font-medium truncate",
                  compact && "text-xs"
                )}>
                  {title || `Task ${id?.slice(-8) || 'Unknown'}`}
                </CardTitle>
                <Badge variant={finalConfig.variant} className="text-xs shrink-0">
                  {finalConfig.label}
                </Badge>
              </div>

              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                {tool_used && (
                  <span className="flex items-center space-x-1">
                    <span>Tool:</span>
                    <code className="bg-muted px-1 rounded">{tool_used}</code>
                  </span>
                )}
                
                {duration_ms !== undefined && (
                  <span>Duration: {formatDuration(duration_ms)}</span>
                )}

                {metadata?.timestamp && (
                  <span>
                    {new Date(metadata.timestamp).toLocaleString()}
                  </span>
                )}
              </div>

              {progress !== undefined && status === 'running' && (
                <div className="mt-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {progress}% complete
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1 ml-2">
            {output && (
              <Button
                onClick={handleCopy}
                size="sm"
                variant="ghost"
                className="h-7 px-2"
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}

            {onDownload && (
              <Button
                onClick={onDownload}
                size="sm"
                variant="ghost"
                className="h-7 px-2"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}

            {onViewDetails && (
              <Button
                onClick={onViewDetails}
                size="sm"
                variant="ghost"
                className="h-7 px-2"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}

            {!compact && output && (
              <Button
                onClick={() => setIsExpanded(!isExpanded)}
                size="sm"
                variant="ghost"
                className="h-7 px-2"
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {!compact && (isExpanded || (output && output.length < 200)) && (
        <CardContent className="pt-0">
          {output && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Output:</h4>
              <div className="bg-muted rounded-md p-3 font-mono text-xs max-h-40 overflow-auto">
                <pre className="whitespace-pre-wrap">{output}</pre>
              </div>
            </div>
          )}

          {metadata && Object.keys(metadata).length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium">Metadata:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-mono">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {actions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.onClick}
                  size="sm"
                  variant={action.variant || 'secondary'}
                  className="text-xs"
                >
                  {action.icon && <action.icon className="h-3 w-3 mr-1" />}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}