import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Tool } from "../../types"
import { Zap, Brain } from "lucide-react"
import { cn } from "../../utils/cn"

interface ToolSelectorProps {
  value?: Tool
  onValueChange?: (value: Tool) => void
  disabled?: boolean
  className?: string
}

const tools = [
  {
    value: 'claude-flow' as Tool,
    label: 'Claude Flow',
    description: 'Advanced AI orchestration with swarm intelligence',
    icon: Zap,
    status: 'recommended',
  },
  {
    value: 'openai-codex' as Tool,
    label: 'OpenAI Codex',
    description: 'Code generation and completion assistant',
    icon: Brain,
    status: 'available',
  },
] as const

export function ToolSelector({ 
  value, 
  onValueChange, 
  disabled = false,
  className 
}: ToolSelectorProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium text-foreground">
        AI Tool
      </label>
      <Select 
        value={value} 
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select AI tool..." />
        </SelectTrigger>
        <SelectContent>
          {tools.map((tool) => {
            const IconComponent = tool.icon
            return (
              <SelectItem key={tool.value} value={tool.value}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-3">
                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-medium">{tool.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {tool.description}
                      </span>
                    </div>
                  </div>
                  {tool.status === 'recommended' && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}