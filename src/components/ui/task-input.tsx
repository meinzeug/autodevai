import * as React from "react"
import { Textarea } from "./textarea"
import { Button } from "./button"
import { Badge } from "./badge"
import { Send, FileText, Sparkles } from "lucide-react"
import { cn } from "../../utils/cn"

interface TaskInputProps {
  value?: string
  onChange?: (value: string) => void
  onSubmit?: (task: string) => void
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  className?: string
  showExamples?: boolean
}

const exampleTasks = [
  "Create a REST API with authentication",
  "Build a responsive React component",
  "Optimize database performance",
  "Implement error handling",
  "Write comprehensive tests",
]

export function TaskInput({ 
  value = '',
  onChange,
  onSubmit,
  placeholder = "Describe your task in detail...",
  disabled = false,
  maxLength = 1000,
  className,
  showExamples = true
}: TaskInputProps) {
  const [localValue, setLocalValue] = React.useState(value)
  const [showSuggestions, setShowSuggestions] = React.useState(false)

  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    onChange?.(newValue)
  }

  const handleSubmit = () => {
    if (localValue.trim() && onSubmit) {
      onSubmit(localValue.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleExampleClick = (example: string) => {
    setLocalValue(example)
    onChange?.(example)
    setShowSuggestions(false)
  }

  const characterCount = localValue.length
  const isNearLimit = characterCount > maxLength * 0.8
  const isOverLimit = characterCount > maxLength

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Task Description
          </label>
          <div className="flex items-center space-x-2">
            {showExamples && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="text-xs"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Examples
              </Button>
            )}
            <span className={cn(
              "text-xs",
              isOverLimit ? "text-destructive" : 
              isNearLimit ? "text-warning" : "text-muted-foreground"
            )}>
              {characterCount}/{maxLength}
            </span>
          </div>
        </div>

        <div className="relative">
          <Textarea
            value={localValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "min-h-[120px] pr-12 resize-none",
              isOverLimit && "border-destructive focus-visible:ring-destructive"
            )}
            maxLength={maxLength}
          />
          <div className="absolute bottom-3 right-3 flex items-center space-x-1">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {showSuggestions && showExamples && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {exampleTasks.map((example, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80 transition-colors"
                  onClick={() => handleExampleClick(example)}
                >
                  {example}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Press Ctrl+Enter to submit quickly
        </p>
        <Button
          onClick={handleSubmit}
          disabled={disabled || !localValue.trim() || isOverLimit}
          size="sm"
        >
          <Send className="h-4 w-4 mr-2" />
          Execute Task
        </Button>
      </div>
    </div>
  )
}