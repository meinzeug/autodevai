import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { Copy, Terminal, Download, Trash2, Maximize2 } from "lucide-react"
import { cn } from "../../utils/cn"

interface TerminalLine {
  id: string
  timestamp: string
  content: string
  type: 'input' | 'output' | 'error' | 'info' | 'warning'
}

interface TerminalOutputProps {
  lines?: TerminalLine[]
  title?: string
  maxLines?: number
  showTimestamps?: boolean
  showLineNumbers?: boolean
  allowCopy?: boolean
  allowClear?: boolean
  allowDownload?: boolean
  allowFullscreen?: boolean
  className?: string
  height?: string
  onClear?: () => void
  onFullscreen?: () => void
}

const typeStyles = {
  input: 'text-blue-400 font-medium',
  output: 'text-foreground',
  error: 'text-red-400',
  info: 'text-cyan-400',
  warning: 'text-yellow-400',
} as const

const typeIndicators = {
  input: '$ ',
  output: '',
  error: '❌ ',
  info: 'ℹ️ ',
  warning: '⚠️ ',
} as const

export function TerminalOutput({
  lines = [],
  title = "Terminal Output",
  maxLines = 1000,
  showTimestamps = false,
  showLineNumbers = false,
  allowCopy = true,
  allowClear = true,
  allowDownload = true,
  allowFullscreen = true,
  className,
  height = "400px",
  onClear,
  onFullscreen
}: TerminalOutputProps) {
  const [isAutoScroll, setIsAutoScroll] = React.useState(true)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const displayLines = lines.slice(-maxLines)

  React.useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines, isAutoScroll])

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 5
      setIsAutoScroll(isAtBottom)
    }
  }

  const copyToClipboard = async () => {
    const content = displayLines
      .map(line => `${showTimestamps ? `[${line.timestamp}] ` : ''}${typeIndicators[line.type]}${line.content}`)
      .join('\n')
    
    try {
      await navigator.clipboard.writeText(content)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const downloadOutput = () => {
    const content = displayLines
      .map(line => `${line.timestamp} [${line.type.toUpperCase()}] ${line.content}`)
      .join('\n')
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `terminal-output-${new Date().toISOString().slice(0, 19)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="h-4 w-4" />
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {displayLines.length} lines
            </Badge>
          </div>

          <div className="flex items-center space-x-1">
            {allowCopy && (
              <Button
                onClick={copyToClipboard}
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                disabled={displayLines.length === 0}
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}

            {allowDownload && (
              <Button
                onClick={downloadOutput}
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                disabled={displayLines.length === 0}
              >
                <Download className="h-3 w-3" />
              </Button>
            )}

            {allowClear && onClear && (
              <Button
                onClick={onClear}
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                disabled={displayLines.length === 0}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}

            {allowFullscreen && onFullscreen && (
              <Button
                onClick={onFullscreen}
                size="sm"
                variant="ghost"
                className="h-7 px-2"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="bg-black/95 text-green-400 font-mono text-xs leading-relaxed overflow-auto p-4"
          style={{ height }}
        >
          {displayLines.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No output yet...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              {displayLines.map((line, index) => (
                <div key={line.id} className="flex items-start space-x-2">
                  {showLineNumbers && (
                    <span className="text-gray-500 w-8 text-right select-none">
                      {index + 1}
                    </span>
                  )}
                  
                  {showTimestamps && (
                    <span className="text-gray-400 w-20 select-none">
                      [{formatTimestamp(line.timestamp)}]
                    </span>
                  )}

                  <span className={cn("flex-1 whitespace-pre-wrap break-all", typeStyles[line.type])}>
                    {typeIndicators[line.type]}{line.content}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!isAutoScroll && (
            <div className="absolute bottom-4 right-4">
              <Button
                onClick={() => {
                  setIsAutoScroll(true)
                  if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
                  }
                }}
                size="sm"
                variant="secondary"
                className="text-xs"
              >
                Scroll to bottom
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}