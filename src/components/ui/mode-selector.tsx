import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Settings, Layers } from "lucide-react"
import { cn } from "../../utils/cn"

interface ModeSelectorProps {
  value?: string
  onValueChange?: ((value: string) => void) | undefined
  disabled?: boolean
  className?: string
}

const modes = [
  {
    value: 'single',
    label: 'Single Agent Mode',
    description: 'Execute tasks with a single AI agent',
    icon: Settings,
  },
  {
    value: 'dual',
    label: 'Dual Agent Mode',
    description: 'Coordinate two agents for enhanced performance',
    icon: Layers,
  },
] as const

export function ModeSelector({ 
  value, 
  onValueChange, 
  disabled = false,
  className 
}: ModeSelectorProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium text-foreground">
        Orchestration Mode
      </label>
      <Select 
        value={value || ''} 
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select orchestration mode..." />
        </SelectTrigger>
        <SelectContent>
          {modes.map((mode) => {
            const IconComponent = mode.icon
            return (
              <SelectItem key={mode.value} value={mode.value}>
                <div className="flex items-center space-x-3">
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">{mode.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {mode.description}
                    </span>
                  </div>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
