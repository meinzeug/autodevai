import * as React from "react"
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from "./modal"
import { Button } from "./button"
import { Input } from "./input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Badge } from "./badge"
import { Progress } from "./progress"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Palette,
  Database,
  Zap,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info
} from "lucide-react"
import { cn } from "../../utils/cn"
import { Settings as SettingsType, OrchestrationMode, Tool } from "../../types"

interface SettingsModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  settings?: SettingsType
  onSave?: (settings: SettingsType) => void
  onReset?: () => void
  className?: string
}

interface ValidationError {
  field: string
  message: string
}

const defaultSettings: SettingsType = {
  default_mode: 'single',
  default_tool: 'claude-flow',
  docker_enabled: true,
  auto_quality_check: true,
}

export function SettingsModal({
  open = false,
  onOpenChange,
  settings = defaultSettings,
  onSave,
  onReset,
  className
}: SettingsModalProps) {
  const [localSettings, setLocalSettings] = React.useState<SettingsType>(settings)
  const [validationErrors, setValidationErrors] = React.useState<ValidationError[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("general")

  React.useEffect(() => {
    setLocalSettings(settings)
    setHasUnsavedChanges(false)
  }, [settings, open])

  const validateSettings = (settingsToValidate: SettingsType): ValidationError[] => {
    const errors: ValidationError[] = []

    if (settingsToValidate.openrouter_key && settingsToValidate.openrouter_key.length < 10) {
      errors.push({
        field: 'openrouter_key',
        message: 'OpenRouter API key must be at least 10 characters'
      })
    }

    return errors
  }

  const handleSettingChange = <K extends keyof SettingsType>(
    key: K,
    value: SettingsType[K]
  ) => {
    const newSettings = { ...localSettings, [key]: value }
    setLocalSettings(newSettings)
    setHasUnsavedChanges(true)
    
    // Validate on change
    const errors = validateSettings(newSettings)
    setValidationErrors(errors)
  }

  const handleSave = () => {
    const errors = validateSettings(localSettings)
    
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    onSave?.(localSettings)
    setHasUnsavedChanges(false)
    setValidationErrors([])
  }

  const handleReset = () => {
    setLocalSettings(defaultSettings)
    setHasUnsavedChanges(true)
    setValidationErrors([])
    onReset?.()
  }

  const getFieldError = (field: string) => 
    validationErrors.find(error => error.field === field)

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className={cn("max-w-4xl max-h-[90vh] overflow-hidden", className)}>
        <ModalHeader>
          <ModalTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Application Settings</span>
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="text-xs">
                Unsaved changes
              </Badge>
            )}
          </ModalTitle>
        </ModalHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="border-b">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general" className="flex items-center space-x-1">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger value="orchestration" className="flex items-center space-x-1">
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">AI Tools</span>
                </TabsTrigger>
                <TabsTrigger value="api" className="flex items-center space-x-1">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">API Keys</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center space-x-1">
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Notifications</span>
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center space-x-1">
                  <Database className="h-4 w-4" />
                  <span className="hidden sm:inline">Advanced</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <TabsContent value="general" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Default Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Default Orchestration Mode</label>
                        <Select
                          value={typeof localSettings.default_mode === "string" ? localSettings.default_mode : "single"}
                          onValueChange={(value: string) => 
                            handleSettingChange('default_mode', value as OrchestrationMode)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single Agent</SelectItem>
                            <SelectItem value="dual">Dual Agent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Default AI Tool</label>
                        <Select
                          value={localSettings.default_tool}
                          onValueChange={(value: Tool) => 
                            handleSettingChange('default_tool', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="claude-flow">Claude Flow</SelectItem>
                            <SelectItem value="openai-codex">OpenAI Codex</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Docker Integration</label>
                          <p className="text-xs text-muted-foreground">
                            Enable Docker container management
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={localSettings.docker_enabled}
                          onChange={(e) => handleSettingChange('docker_enabled', e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Auto Quality Check</label>
                          <p className="text-xs text-muted-foreground">
                            Automatically validate task results
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={localSettings.auto_quality_check}
                          onChange={(e) => handleSettingChange('auto_quality_check', e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orchestration" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">AI Tools Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center space-x-2">
                          <Zap className="h-4 w-4" />
                          <span>Claude Flow</span>
                          <Badge variant="default" className="text-xs">Recommended</Badge>
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Advanced AI orchestration with swarm intelligence
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Status</span>
                            <div className="flex items-center space-x-1">
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              <span>Ready</span>
                            </div>
                          </div>
                          <Progress value={100} className="h-2" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center space-x-2">
                          <Database className="h-4 w-4" />
                          <span>OpenAI Codex</span>
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Code generation and completion assistant
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Status</span>
                            <div className="flex items-center space-x-1">
                              <AlertTriangle className="h-3 w-3 text-yellow-600" />
                              <span>API Key Required</span>
                            </div>
                          </div>
                          <Progress value={65} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="api" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span>API Keys</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">OpenRouter API Key</label>
                      <Input
                        type="password"
                        placeholder="sk-or-..."
                        value={localSettings.openrouter_key || ''}
                        onChange={(e) => handleSettingChange('openrouter_key', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Required for OpenAI Codex integration. Get your key from{' '}
                        <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" 
                           className="underline hover:no-underline">
                          openrouter.ai
                        </a>
                      </p>
                    </div>

                    <div className="p-3 bg-blue-50 bg-blue-950 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-900 text-blue-100">
                            API Key Security
                          </p>
                          <p className="text-blue-700 text-blue-200">
                            API keys are stored locally and never transmitted to our servers.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notification Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Task Completion</label>
                          <p className="text-xs text-muted-foreground">
                            Notify when tasks are completed
                          </p>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Error Alerts</label>
                          <p className="text-xs text-muted-foreground">
                            Notify when tasks fail
                          </p>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">System Updates</label>
                          <p className="text-xs text-muted-foreground">
                            Notify about system status changes
                          </p>
                        </div>
                        <input type="checkbox" className="rounded border-gray-300" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Advanced Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Debug Mode</label>
                          <p className="text-xs text-muted-foreground">
                            Enable detailed logging and debug information
                          </p>
                        </div>
                        <input type="checkbox" className="rounded border-gray-300" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Telemetry</label>
                          <p className="text-xs text-muted-foreground">
                            Send anonymous usage data to improve the application
                          </p>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Experimental Features</label>
                          <p className="text-xs text-muted-foreground">
                            Enable experimental and beta features
                          </p>
                        </div>
                        <input type="checkbox" className="rounded border-gray-300" />
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset to Defaults
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <ModalFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              {validationErrors.length > 0 && (
                <div className="flex items-center space-x-1 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{validationErrors.length} error(s)</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Button
                onClick={() => onOpenChange?.(false)}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={validationErrors.length > 0}
                size="sm"
              >
                <Save className="h-4 w-4 mr-1" />
                Save Settings
              </Button>
            </div>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}