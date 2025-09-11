import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Progress } from "./progress"
import { Badge } from "./badge"
import { Button } from "./button"
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  BarChart3,
  PieChart,
  Gauge
} from "lucide-react"
import { cn } from "../../utils/cn"

interface MetricValue {
  current: number
  previous?: number
  unit?: string
  format?: 'number' | 'percentage' | 'duration' | 'bytes'
}

interface Metric {
  id: string
  name: string
  value: MetricValue
  description?: string
  status?: 'good' | 'warning' | 'error'
  trend?: 'up' | 'down' | 'stable'
}

interface MetricsDisplayProps {
  metrics?: Metric[]
  title?: string
  onRefresh?: () => void
  autoRefresh?: boolean
  refreshInterval?: number
  className?: string
  layout?: 'grid' | 'list'
  showTrends?: boolean
  showCharts?: boolean
}

const statusColors = {
  good: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950',
  warning: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950',
  error: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950',
} as const

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Activity,
} as const

function formatValue(value: MetricValue): string {
  const { current, unit = '', format = 'number' } = value

  switch (format) {
    case 'percentage':
      return `${current.toFixed(1)}%`
    case 'duration':
      if (current < 1000) return `${current}ms`
      if (current < 60000) return `${(current / 1000).toFixed(1)}s`
      if (current < 3600000) return `${(current / 60000).toFixed(1)}m`
      return `${(current / 3600000).toFixed(1)}h`
    case 'bytes':
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let bytes = current
      let unitIndex = 0
      while (bytes >= 1024 && unitIndex < units.length - 1) {
        bytes /= 1024
        unitIndex++
      }
      return `${bytes.toFixed(1)}${units[unitIndex]}`
    default:
      return `${current.toLocaleString()}${unit}`
  }
}

function calculateTrendPercentage(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function MetricCard({ metric, showTrends = true }: { metric: Metric, showTrends?: boolean }) {
  const { name, value, description, status = 'good', trend } = metric
  const TrendIcon = trend ? trendIcons[trend] : null
  const trendPercentage = value.previous !== undefined 
    ? calculateTrendPercentage(value.current, value.previous)
    : null

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium truncate">{name}</h3>
              <Badge 
                variant={status === 'good' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {status}
              </Badge>
            </div>

            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-foreground">
                {formatValue(value)}
              </span>
              
              {showTrends && TrendIcon && trendPercentage !== null && (
                <div className={cn(
                  "flex items-center space-x-1 text-xs",
                  trend === 'up' ? 'text-green-600 dark:text-green-400' :
                  trend === 'down' ? 'text-red-600 dark:text-red-400' :
                  'text-muted-foreground'
                )}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{Math.abs(trendPercentage).toFixed(1)}%</span>
                </div>
              )}
            </div>

            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>

          {/* Status indicator */}
          <div className={cn(
            "absolute top-0 right-0 w-1 h-full",
            status === 'good' ? 'bg-green-500' :
            status === 'warning' ? 'bg-yellow-500' :
            'bg-red-500'
          )} />
        </div>
      </CardContent>
    </Card>
  )
}

function SystemOverview({ metrics }: { metrics: Metric[] }) {
  const totalMetrics = metrics.length
  const goodMetrics = metrics.filter(m => m.status === 'good').length
  const warningMetrics = metrics.filter(m => m.status === 'warning').length
  const errorMetrics = metrics.filter(m => m.status === 'error').length
  
  const healthScore = (goodMetrics / totalMetrics) * 100

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center space-x-2">
          <Gauge className="h-4 w-4" />
          <span>System Health</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Overall Health</span>
            <span className="font-medium">{healthScore.toFixed(1)}%</span>
          </div>
          <Progress value={healthScore} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center space-x-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-lg font-semibold">{goodMetrics}</span>
            </div>
            <p className="text-xs text-muted-foreground">Good</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center space-x-1">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-lg font-semibold">{warningMetrics}</span>
            </div>
            <p className="text-xs text-muted-foreground">Warning</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center space-x-1">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-lg font-semibold">{errorMetrics}</span>
            </div>
            <p className="text-xs text-muted-foreground">Error</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function MetricsDisplay({
  metrics = [],
  title = "System Metrics",
  onRefresh,
  autoRefresh = false,
  refreshInterval = 30000,
  className,
  layout = 'grid',
  showTrends = true,
  showCharts = true
}: MetricsDisplayProps) {
  const [lastRefresh, setLastRefresh] = React.useState(new Date())

  React.useEffect(() => {
    if (autoRefresh && onRefresh) {
      const interval = setInterval(() => {
        onRefresh()
        setLastRefresh(new Date())
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, onRefresh, refreshInterval])

  const handleRefresh = () => {
    onRefresh?.()
    setLastRefresh(new Date())
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {metrics.length} metrics
            </span>
          </div>

          {onRefresh && (
            <Button
              onClick={handleRefresh}
              size="sm"
              variant="outline"
              className="h-8"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {metrics.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-2">
              <PieChart className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No metrics available</p>
              {onRefresh && (
                <Button onClick={handleRefresh} size="sm" variant="ghost">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Load Metrics
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* System Overview */}
          {showCharts && <SystemOverview metrics={metrics} />}

          {/* Metrics Grid/List */}
          <div className={cn(
            layout === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "space-y-4"
          )}>
            {metrics.map((metric) => (
              <MetricCard 
                key={metric.id} 
                metric={metric} 
                showTrends={showTrends} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}