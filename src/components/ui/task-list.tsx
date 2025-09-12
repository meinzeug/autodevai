import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { Input } from "./input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { ResultCard } from "./result-card"
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  RefreshCw,
  Trash2,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react"
import { cn } from "../../utils/cn"
import { Task, TaskStatus } from "../../types"

interface TaskListProps {
  tasks?: Task[]
  onTaskSelect?: (task: Task) => void
  onTaskDelete?: (taskId: string) => void
  onTaskRerun?: (taskId: string) => void
  onRefresh?: () => void
  className?: string
  showFilters?: boolean
  showActions?: boolean
  maxHeight?: string
}

type SortField = 'created_at' | 'completed_at' | 'status' | 'description'
type SortOrder = 'asc' | 'desc'

const statusIcons = {
  pending: Clock,
  running: PlayCircle,
  completed: CheckCircle2,
  failed: XCircle,
} as const

const statusColors = {
  pending: 'text-yellow-600 dark:text-yellow-400',
  running: 'text-blue-600 dark:text-blue-400',
  completed: 'text-green-600 dark:text-green-400',
  failed: 'text-red-600 dark:text-red-400',
} as const

export function TaskList({
  tasks = [],
  onTaskSelect,
  onTaskDelete,
  onRefresh,
  className,
  showFilters = true,
  showActions = true,
  maxHeight = "600px"
}: TaskListProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<TaskStatus | 'all'>('all')
  const [sortField, setSortField] = React.useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc')
  const [selectedTasks, setSelectedTasks] = React.useState<Set<string>>(new Set())

  const filteredTasks = React.useMemo(() => {
    const filtered = tasks.filter(task => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.id.toLowerCase().includes(searchQuery.toLowerCase())

      // Status filter
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter

      return matchesSearch && matchesStatus
    })

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortField) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'completed_at':
          aValue = a.completed_at ? new Date(a.completed_at).getTime() : 0
          bValue = b.completed_at ? new Date(b.completed_at).getTime() : 0
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'description':
          aValue = a.description.toLowerCase()
          bValue = b.description.toLowerCase()
          break
        default:
          aValue = 0
          bValue = 0
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [tasks, searchQuery, statusFilter, sortField, sortOrder])

  const statusCounts = React.useMemo(() => {
    return tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1
      return acc
    }, {} as Record<TaskStatus, number>)
  }, [tasks])

  const handleTaskToggle = (taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(filteredTasks.map(task => task.id)))
    }
  }

  const handleBulkDelete = () => {
    selectedTasks.forEach(taskId => {
      onTaskDelete?.(taskId)
    })
    setSelectedTasks(new Set())
  }

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date().getTime()
    const time = new Date(timestamp).getTime()
    const diffMs = now - time
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg font-semibold">Tasks</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {filteredTasks.length} of {tasks.length}
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            {onRefresh && (
              <Button
                onClick={onRefresh}
                size="sm"
                variant="ghost"
                className="h-8 px-2"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}

            {selectedTasks.size > 0 && showActions && (
              <Button
                onClick={handleBulkDelete}
                size="sm"
                variant="destructive"
                className="h-8 px-2"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete ({selectedTasks.size})
              </Button>
            )}
          </div>
        </div>

        {/* Status Overview */}
        <div className="flex items-center space-x-4 text-sm">
          {Object.entries(statusCounts).map(([status, count]) => {
            const StatusIcon = statusIcons[status as TaskStatus]
            return (
              <div key={status} className="flex items-center space-x-1">
                <StatusIcon className={cn("h-3 w-3", statusColors[status as TaskStatus])} />
                <span className="capitalize">{status}:</span>
                <span className="font-medium">{count}</span>
              </div>
            )
          })}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex items-center space-x-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as TaskStatus | 'all')}
            >
              <SelectTrigger className="w-32 h-9">
                <div className="flex items-center space-x-1">
                  <Filter className="h-3 w-3" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={`${sortField}-${sortOrder}`}
              onValueChange={(value) => {
                const [field, order] = value.split('-') as [SortField, SortOrder]
                setSortField(field)
                setSortOrder(order)
              }}
            >
              <SelectTrigger className="w-40 h-9">
                <div className="flex items-center space-x-1">
                  {sortOrder === 'asc' ? (
                    <SortAsc className="h-3 w-3" />
                  ) : (
                    <SortDesc className="h-3 w-3" />
                  )}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
                <SelectItem value="status-asc">Status A-Z</SelectItem>
                <SelectItem value="description-asc">Name A-Z</SelectItem>
                <SelectItem value="completed_at-desc">Recently Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Bulk Actions */}
        {filteredTasks.length > 0 && showActions && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedTasks.size === filteredTasks.length}
              onChange={handleSelectAll}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-muted-foreground">
              Select all visible tasks
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div
          className="overflow-auto"
          style={{ maxHeight }}
        >
          {filteredTasks.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No tasks found</p>
                {searchQuery && (
                  <Button
                    onClick={() => setSearchQuery('')}
                    size="sm"
                    variant="ghost"
                    className="mt-2 text-xs"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {filteredTasks.map((task) => (
                <div key={task.id} className="flex items-start space-x-3">
                  {showActions && (
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.id)}
                      onChange={() => handleTaskToggle(task.id)}
                      className="mt-4 rounded border-gray-300"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <ResultCard
                      id={task.id}
                      title={task.description}
                      status={task.status}
                      success={task.result?.success}
                      output={task.result?.output}
                      tool_used={task.result?.tool_used}
                      duration_ms={task.result?.duration_ms}
                      metadata={{
                        created: formatRelativeTime(task.created_at),
                        completed: task.completed_at ? formatRelativeTime(task.completed_at) : undefined,
                        mode: task.mode,
                        tool: task.tool,
                      }}
      actions={showActions ? [
        ...(task.status === "failed" || task.status === "completed" ? [{
          label: "Rerun",
          icon: RefreshCw,
          onClick: () => console.log("Rerun"),
        }] : []),
        {
          label: "Delete",
          variant: "destructive" as const,
          icon: Trash2,
          onClick: () => console.log("Delete"),
        },
      ] : []}
                      onViewDetails={() => onTaskSelect?.(task)}
                      compact={true}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}