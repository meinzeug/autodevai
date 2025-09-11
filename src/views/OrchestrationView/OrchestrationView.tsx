import React, { useState, useCallback } from 'react';
import { Play, Pause, Square, Settings, Save, RotateCcw } from 'lucide-react';
import { Card, Button, Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui';
import { 
  TaskInput, 
  ExecutionControls 
} from '../../components/ui';
import { 
  OrchestrationConfig, 
  ClaudeFlowCommand, 
  OrchestrationMode, 
  Tool, 
  ExecutionMode 
} from '../../types';
import { cn } from '../../utils/cn';

interface OrchestrationViewProps {
  config: OrchestrationConfig;
  onConfigChange: (config: OrchestrationConfig) => void;
  onExecute: (command: ClaudeFlowCommand) => void;
  isExecuting?: boolean;
  className?: string;
}

interface ExecutionHistory {
  id: string;
  command: ClaudeFlowCommand;
  timestamp: string;
  duration?: number;
  success?: boolean;
}

export function OrchestrationView({ 
  config, 
  onConfigChange, 
  onExecute, 
  isExecuting = false,
  className 
}: OrchestrationViewProps) {
  const [currentTask, setCurrentTask] = useState('');
  const [selectedCommand, setSelectedCommand] = useState<string>('swarm');
  const [history, setHistory] = useState<ExecutionHistory[]>([]);
  const [activeTab, setActiveTab] = useState('execute');
  const [localConfig, setLocalConfig] = useState(config);

  // Handle configuration changes
  const handleConfigChange = useCallback((updates: Partial<OrchestrationConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
  }, [localConfig]);

  // Save configuration
  const handleSaveConfig = useCallback(() => {
    onConfigChange(localConfig);
  }, [localConfig, onConfigChange]);

  // Reset configuration
  const handleResetConfig = useCallback(() => {
    setLocalConfig(config);
  }, [config]);

  // Handle task execution
  const handleExecuteTask = useCallback(() => {
    if (!currentTask.trim() || isExecuting) return;

    const command: ClaudeFlowCommand = {
      command: selectedCommand,
      task: currentTask,
      mode: typeof localConfig.mode === 'string' ? localConfig.mode : localConfig.mode.type,
      options: {
        tool: localConfig.tool,
        executionMode: localConfig.executionMode,
        primaryModel: localConfig.primaryModel,
        secondaryModel: localConfig.secondaryModel,
        dockerEnabled: localConfig.dockerEnabled,
        autoRestart: localConfig.autoRestart,
        maxRetries: localConfig.maxRetries,
        timeout: localConfig.timeout
      }
    };

    // Add to history
    const historyEntry: ExecutionHistory = {
      id: Date.now().toString(),
      command,
      timestamp: new Date().toISOString()
    };
    setHistory(prev => [historyEntry, ...prev.slice(0, 9)]);

    // Execute command
    onExecute(command);
  }, [currentTask, selectedCommand, localConfig, isExecuting, onExecute]);

  // Handle quick commands
  const handleQuickCommand = useCallback((cmd: string, task: string) => {
    setSelectedCommand(cmd);
    setCurrentTask(task);
    setActiveTab('execute');
  }, []);

  const hasConfigChanges = JSON.stringify(localConfig) !== JSON.stringify(config);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Task Orchestration</h2>
          <p className="text-gray-600 dark:text-gray-400">Configure and execute AI-powered development tasks</p>
        </div>
        {hasConfigChanges && (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleResetConfig} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
            <Button onClick={handleSaveConfig} className="gap-2">
              <Save className="w-4 h-4" />
              Save Config
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="execute">Execute</TabsTrigger>
          <TabsTrigger value="configure">Configure</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Execute Tab */}
        <TabsContent value="execute" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Input Section */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Task Definition</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Command Type</label>
                  <select
                    value={selectedCommand}
                    onChange={(e) => setSelectedCommand(e.target.value)}
                    disabled={isExecuting}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="swarm">Swarm</option>
                    <option value="sparc">SPARC</option>
                    <option value="hive-mind">Hive Mind</option>
                    <option value="memory">Memory</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Task Description</label>
                  <TaskInput
                    value={currentTask}
                    onChange={setCurrentTask}
                    placeholder="Describe the task you want to execute..."
                    disabled={isExecuting}
                    className="min-h-[120px]"
                  />
                </div>
              </div>
            </Card>

            {/* Execution Controls */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Execution Controls</h3>
              <div className="space-y-4">
                <ExecutionControls
                  isExecuting={isExecuting}
                  onExecute={handleExecuteTask}
                  onPause={() => console.log('Pause execution')}
                  onStop={() => console.log('Stop execution')}
                  disabled={!currentTask.trim()}
                />
                
                {/* Current Configuration Summary */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-medium mb-2">Current Configuration</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Mode:</span>
                      <span className="ml-2 font-medium">{typeof localConfig.mode === 'string' ? localConfig.mode : localConfig.mode.type}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Tool:</span>
                      <span className="ml-2 font-medium">{localConfig.tool}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Model:</span>
                      <span className="ml-2 font-medium">{localConfig.primaryModel}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Docker:</span>
                      <span className="ml-2 font-medium">{localConfig.dockerEnabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                onClick={() => handleQuickCommand('swarm', 'Initialize multi-agent swarm for complex task coordination')}
                className="text-left p-4 h-auto flex-col gap-2"
              >
                <span className="font-medium">Swarm Init</span>
                <span className="text-xs text-gray-500">Multi-agent coordination</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleQuickCommand('sparc', 'Run SPARC methodology for systematic development')}
                className="text-left p-4 h-auto flex-col gap-2"
              >
                <span className="font-medium">SPARC Mode</span>
                <span className="text-xs text-gray-500">Systematic development</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleQuickCommand('hive-mind', 'Activate hive-mind collective intelligence')}
                className="text-left p-4 h-auto flex-col gap-2"
              >
                <span className="font-medium">Hive Mind</span>
                <span className="text-xs text-gray-500">Collective intelligence</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleQuickCommand('memory', 'Manage persistent memory and knowledge base')}
                className="text-left p-4 h-auto flex-col gap-2"
              >
                <span className="font-medium">Memory</span>
                <span className="text-xs text-gray-500">Knowledge management</span>
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Configure Tab */}
        <TabsContent value="configure" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Configuration */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Basic Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Orchestration Mode</label>
                  <select
                    value={typeof localConfig.mode === 'string' ? localConfig.mode : localConfig.mode.type}
                    onChange={(e) => handleConfigChange({ mode: e.target.value as OrchestrationMode })}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="single">Single</option>
                    <option value="dual">Dual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">AI Tool</label>
                  <select
                    value={localConfig.tool}
                    onChange={(e) => handleConfigChange({ tool: e.target.value as Tool })}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="claude-flow">Claude Flow</option>
                    <option value="openai-codex">OpenAI Codex</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Execution Mode</label>
                  <select
                    value={localConfig.executionMode}
                    onChange={(e) => handleConfigChange({ executionMode: e.target.value as ExecutionMode })}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="standard">Standard</option>
                    <option value="enhanced">Enhanced</option>
                    <option value="turbo">Turbo</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Advanced Configuration */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Advanced Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Primary Model</label>
                  <input
                    type="text"
                    value={localConfig.primaryModel}
                    onChange={(e) => handleConfigChange({ primaryModel: e.target.value })}
                    className="w-full p-2 border rounded-md bg-background"
                    placeholder="claude"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Secondary Model (Optional)</label>
                  <input
                    type="text"
                    value={localConfig.secondaryModel || ''}
                    onChange={(e) => handleConfigChange({ secondaryModel: e.target.value || undefined })}
                    className="w-full p-2 border rounded-md bg-background"
                    placeholder="gpt-4"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Retries</label>
                    <input
                      type="number"
                      value={localConfig.maxRetries}
                      onChange={(e) => handleConfigChange({ maxRetries: parseInt(e.target.value) })}
                      className="w-full p-2 border rounded-md bg-background"
                      min={1}
                      max={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Timeout (s)</label>
                    <input
                      type="number"
                      value={localConfig.timeout}
                      onChange={(e) => handleConfigChange({ timeout: parseInt(e.target.value) })}
                      className="w-full p-2 border rounded-md bg-background"
                      min={30}
                      max={3600}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={localConfig.dockerEnabled}
                      onChange={(e) => handleConfigChange({ dockerEnabled: e.target.checked })}
                    />
                    <span className="text-sm font-medium">Enable Docker</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={localConfig.autoRestart}
                      onChange={(e) => handleConfigChange({ autoRestart: e.target.checked })}
                    />
                    <span className="text-sm font-medium">Auto Restart on Failure</span>
                  </label>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Execution History</h3>
            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No execution history yet. Start by running a task.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-medium">{typeof entry.command === 'string' ? entry.command : entry.command.command}</span>
                        {entry.success !== undefined && (
                          <span className={`ml-2 text-xs px-2 py-1 rounded ${
                            entry.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {entry.success ? 'Success' : 'Failed'}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {typeof entry.command === 'string' ? 'No task description' : entry.command.task || 'No task description'}
                    </p>
                    {entry.duration && (
                      <span className="text-xs text-gray-500">
                        Duration: {(entry.duration / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default OrchestrationView;