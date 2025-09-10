import React, { useState, useEffect } from 'react';
import { Play, Square, Settings, RefreshCw, Container, Cpu, Activity } from 'lucide-react';
import { TauriService } from '../services/tauri';
import { ExecutionMode, ClaudeFlowCommand, OrchestrationConfig, DockerContainer } from '../types';
import { cn } from '../utils/cn';

interface OrchestrationPanelProps {
  onExecute: (command: ClaudeFlowCommand) => Promise<void>;
  isExecuting: boolean;
  config: OrchestrationConfig;
  onConfigChange: (config: OrchestrationConfig) => void;
}

export const OrchestrationPanel: React.FC<OrchestrationPanelProps> = ({
  onExecute,
  isExecuting,
  config,
  onConfigChange
}) => {
  const [claudeFlowModes, setClaudeFlowModes] = useState<string[]>([]);
  const [selectedMode, setSelectedMode] = useState('sparc');
  const [taskInput, setTaskInput] = useState('');
  const [dockerContainers, setDockerContainers] = useState<DockerContainer[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);

  const tauriService = TauriService.getInstance();

  useEffect(() => {
    initializePanel();
  }, []);

  const initializePanel = async () => {
    try {
      setLoading(true);
      
      // Load Claude-Flow modes
      const modes = await tauriService.getAvailableClaudeFlowModes();
      setClaudeFlowModes(modes);
      
      // Load Docker containers if enabled
      if (config.dockerEnabled) {
        const containers = await tauriService.getDockerContainers();
        setDockerContainers(containers);
      }
    } catch (error) {
      console.error('Failed to initialize orchestration panel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!taskInput.trim()) return;

    const command: ClaudeFlowCommand = {
      mode: selectedMode,
      task: taskInput,
      options: {
        executionMode: config.mode.type,
        primaryModel: config.mode.primaryModel,
        secondaryModel: config.mode.secondaryModel,
        dockerEnabled: config.dockerEnabled,
        autoRestart: config.autoRestart,
        maxRetries: config.maxRetries,
        timeout: config.timeout
      }
    };

    await onExecute(command);
  };

  const handleModeChange = (mode: ExecutionMode) => {
    onConfigChange({
      ...config,
      mode
    });
  };

  const handleDockerToggle = async () => {
    const newConfig = {
      ...config,
      dockerEnabled: !config.dockerEnabled
    };
    
    onConfigChange(newConfig);
    
    if (newConfig.dockerEnabled) {
      try {
        const containers = await tauriService.getDockerContainers();
        setDockerContainers(containers);
      } catch (error) {
        console.error('Failed to load Docker containers:', error);
      }
    }
  };

  const createDockerSandbox = async () => {
    try {
      const containerId = await tauriService.createDockerSandbox(
        'autodev-ai:latest',
        `autodev-sandbox-${Date.now()}`
      );
      
      // Refresh container list
      const containers = await tauriService.getDockerContainers();
      setDockerContainers(containers);
    } catch (error) {
      console.error('Failed to create Docker sandbox:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Orchestration Control</h2>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Execution Mode Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-300">Execution Mode</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleModeChange({ 
              type: 'single', 
              primaryModel: config.mode.primaryModel 
            })}
            className={cn(
              "p-3 rounded-lg border text-left transition-colors",
              config.mode.type === 'single'
                ? "border-blue-500 bg-blue-500/10 text-blue-400"
                : "border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500"
            )}
          >
            <div className="font-medium">Single Agent</div>
            <div className="text-xs text-gray-400">One AI model</div>
          </button>
          <button
            onClick={() => handleModeChange({ 
              type: 'dual', 
              primaryModel: config.mode.primaryModel,
              secondaryModel: config.mode.secondaryModel || 'codex'
            })}
            className={cn(
              "p-3 rounded-lg border text-left transition-colors",
              config.mode.type === 'dual'
                ? "border-blue-500 bg-blue-500/10 text-blue-400"
                : "border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500"
            )}
          >
            <div className="font-medium">Dual Agent</div>
            <div className="text-xs text-gray-400">Two AI models</div>
          </button>
        </div>
      </div>

      {/* Model Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-300">Primary Model</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleModeChange({
              ...config.mode,
              primaryModel: 'claude'
            })}
            className={cn(
              "p-3 rounded-lg border text-left transition-colors",
              config.mode.primaryModel === 'claude'
                ? "border-green-500 bg-green-500/10 text-green-400"
                : "border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500"
            )}
          >
            <div className="font-medium">Claude</div>
            <div className="text-xs text-gray-400">Anthropic</div>
          </button>
          <button
            onClick={() => handleModeChange({
              ...config.mode,
              primaryModel: 'codex'
            })}
            className={cn(
              "p-3 rounded-lg border text-left transition-colors",
              config.mode.primaryModel === 'codex'
                ? "border-green-500 bg-green-500/10 text-green-400"
                : "border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500"
            )}
          >
            <div className="font-medium">Codex</div>
            <div className="text-xs text-gray-400">OpenAI</div>
          </button>
        </div>
      </div>

      {/* Secondary Model for Dual Mode */}
      {config.mode.type === 'dual' && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">Secondary Model</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleModeChange({
                ...config.mode,
                secondaryModel: 'claude'
              })}
              className={cn(
                "p-3 rounded-lg border text-left transition-colors",
                config.mode.secondaryModel === 'claude'
                  ? "border-purple-500 bg-purple-500/10 text-purple-400"
                  : "border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500"
              )}
            >
              <div className="font-medium">Claude</div>
              <div className="text-xs text-gray-400">Anthropic</div>
            </button>
            <button
              onClick={() => handleModeChange({
                ...config.mode,
                secondaryModel: 'codex'
              })}
              className={cn(
                "p-3 rounded-lg border text-left transition-colors",
                config.mode.secondaryModel === 'codex'
                  ? "border-purple-500 bg-purple-500/10 text-purple-400"
                  : "border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500"
              )}
            >
              <div className="font-medium">Codex</div>
              <div className="text-xs text-gray-400">OpenAI</div>
            </button>
          </div>
        </div>
      )}

      {/* Claude-Flow Mode Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-300">Claude-Flow Mode</label>
        <select
          value={selectedMode}
          onChange={(e) => setSelectedMode(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
        >
          {claudeFlowModes.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </div>

      {/* Task Input */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-300">Task Description</label>
        <textarea
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          placeholder="Enter your development task..."
          className="w-full h-24 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      {/* Docker Integration */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">Docker Sandbox</label>
          <button
            onClick={handleDockerToggle}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              config.dockerEnabled ? "bg-blue-600" : "bg-gray-600"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                config.dockerEnabled ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
        
        {config.dockerEnabled && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                {dockerContainers.length} containers
              </span>
              <button
                onClick={createDockerSandbox}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
              >
                Create Sandbox
              </button>
            </div>
            
            {dockerContainers.length > 0 && (
              <div className="max-h-24 overflow-y-auto space-y-1">
                {dockerContainers.map((container) => (
                  <div
                    key={container.id}
                    className="flex items-center justify-between text-xs p-2 bg-gray-700 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <Docker className="w-3 h-3 text-blue-400" />
                      <span className="text-white">{container.name}</span>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-1 rounded text-xs",
                        container.status === 'running'
                          ? "bg-green-500/20 text-green-400"
                          : container.status === 'stopped'
                          ? "bg-gray-500/20 text-gray-400"
                          : "bg-red-500/20 text-red-400"
                      )}
                    >
                      {container.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced Configuration */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t border-gray-600">
          <h3 className="text-sm font-medium text-gray-300">Advanced Settings</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Retries</label>
              <input
                type="number"
                value={config.maxRetries}
                onChange={(e) => onConfigChange({
                  ...config,
                  maxRetries: parseInt(e.target.value) || 0
                })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                min="0"
                max="10"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-400 mb-1">Timeout (seconds)</label>
              <input
                type="number"
                value={config.timeout}
                onChange={(e) => onConfigChange({
                  ...config,
                  timeout: parseInt(e.target.value) || 30
                })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                min="10"
                max="3600"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Auto Restart on Failure</label>
            <button
              onClick={() => onConfigChange({
                ...config,
                autoRestart: !config.autoRestart
              })}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                config.autoRestart ? "bg-blue-600" : "bg-gray-600"
              )}
            >
              <span
                className={cn(
                  "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                  config.autoRestart ? "translate-x-5" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>
      )}

      {/* Execute Button */}
      <button
        onClick={handleExecute}
        disabled={isExecuting || !taskInput.trim()}
        className={cn(
          "w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors",
          isExecuting || !taskInput.trim()
            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        )}
      >
        {isExecuting ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Executing...</span>
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            <span>Execute Task</span>
          </>
        )}
      </button>
    </div>
  );
};