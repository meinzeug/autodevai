import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Save,
  RotateCcw,
  Download,
  Upload,
  Key,
  Shield,
  Cpu,
  Database,
  Globe,
  Zap,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { OrchestrationConfig } from '../types';
import { cn } from '../utils/cn';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ConfigurationPanelProps {
  config: OrchestrationConfig;
  onChange: (config: OrchestrationConfig) => void;
  onClose: () => void;
  className?: string;
}

interface ConfigSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string | undefined }>;
  description: string;
}

const configSections: ConfigSection[] = [
  {
    id: 'execution',
    title: 'Execution',
    icon: Cpu,
    description: 'Configure execution modes and AI models',
  },
  {
    id: 'docker',
    title: 'Docker',
    icon: Database,
    description: 'Docker sandbox and container settings',
  },
  {
    id: 'network',
    title: 'Network',
    icon: Globe,
    description: 'Network timeouts and retry settings',
  },
  {
    id: 'security',
    title: 'Security',
    icon: Shield,
    description: 'API keys and security preferences',
  },
  {
    id: 'performance',
    title: 'Performance',
    icon: Zap,
    description: 'Performance and optimization settings',
  },
];

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  config,
  onChange,
  onClose,
  className,
}) => {
  const [activeSection, setActiveSection] = useState('execution');
  const [tempConfig, setTempConfig] = useState<OrchestrationConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);
  const [apiKeys, setApiKeys] = useLocalStorage('autodev-api-keys', {
    anthropic: '',
    openai: '',
    openrouter: '',
  });
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setTempConfig(config);
  }, [config]);

  useEffect(() => {
    const configChanged = JSON.stringify(tempConfig) !== JSON.stringify(config);
    setHasChanges(configChanged);
  }, [tempConfig, config]);

  const handleSave = () => {
    if (validateConfig(tempConfig)) {
      onChange(tempConfig);
      setHasChanges(false);
    }
  };

  const handleReset = () => {
    setTempConfig(config);
    setHasChanges(false);
    setErrors({});
  };

  const validateConfig = (cfg: OrchestrationConfig): boolean => {
    const newErrors: Record<string, string> = {};

    if (cfg.timeout < 10 || cfg.timeout > 3600) {
      newErrors['timeout'] = 'Timeout must be between 10 and 3600 seconds';
    }

    if (cfg.maxRetries < 0 || cfg.maxRetries > 10) {
      newErrors['maxRetries'] = 'Max retries must be between 0 and 10';
    }

    if (cfg.mode.type === 'dual' && !cfg.mode['secondaryModel']) {
      newErrors['secondaryModel'] = 'Secondary model is required for dual mode';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const exportConfig = () => {
    const exportData = {
      config: tempConfig,
      apiKeys: showApiKeys ? apiKeys : { note: 'API keys excluded for security' },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autodev-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        if (importData.config) {
          setTempConfig(importData.config);
        }
        if (importData.apiKeys && typeof importData.apiKeys === 'object') {
          setApiKeys(importData.apiKeys);
        }
      } catch (error) {
        console.error('Failed to import config:', error);
      }
    };
    reader.readAsText(file);
  };

  const renderExecutionSection = () => (
    <div className="space-y-6">
      {/* Execution Mode */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-900 dark:text-white">Execution Mode</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() =>
              setTempConfig(prev => ({
                ...prev,
                mode: { ...prev.mode, type: 'single' },
              }))
            }
            className={cn(
              'p-4 rounded-lg border text-left transition-colors',
              tempConfig.mode.type === 'single'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <div className="font-medium">Single Agent</div>
            <div className="text-xs text-gray-500 mt-1">Use one AI model</div>
          </button>
          <button
            onClick={() =>
              setTempConfig(prev => ({
                ...prev,
                mode: {
                  ...prev.mode,
                  type: 'dual',
                  secondaryModel: prev.mode.secondaryModel || 'codex',
                },
              }))
            }
            className={cn(
              'p-4 rounded-lg border text-left transition-colors',
              tempConfig.mode.type === 'dual'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <div className="font-medium">Dual Agent</div>
            <div className="text-xs text-gray-500 mt-1">Use two AI models</div>
          </button>
        </div>
      </div>

      {/* Primary Model */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-900 dark:text-white">Primary Model</label>
        <select
          value={tempConfig.mode.primaryModel}
          onChange={e =>
            setTempConfig(prev => ({
              ...prev,
              mode: { ...prev.mode, primaryModel: e.target.value as 'claude' | 'codex' },
            }))
          }
          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="claude">Claude (Anthropic)</option>
          <option value="codex">Codex (OpenAI)</option>
        </select>
      </div>

      {/* Secondary Model (for dual mode) */}
      {tempConfig.mode.type === 'dual' && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-900 dark:text-white">
            Secondary Model
          </label>
          <select
            value={tempConfig.mode['secondaryModel'] || ''}
            onChange={e =>
              setTempConfig(prev => ({
                ...prev,
                mode: { ...prev.mode, secondaryModel: e.target.value as 'claude' | 'codex' },
              }))
            }
            className={cn(
              'w-full bg-white dark:bg-gray-800 border rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500',
              errors['secondaryModel'] ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
            )}
          >
            <option value="">Select secondary model...</option>
            <option value="claude">Claude (Anthropic)</option>
            <option value="codex">Codex (OpenAI)</option>
          </select>
          {errors['secondaryModel'] && (
            <p className="text-sm text-red-500">{errors['secondaryModel']}</p>
          )}
        </div>
      )}

      {/* Auto Restart */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-900 dark:text-white">
            Auto Restart on Failure
          </label>
          <p className="text-xs text-gray-500 mt-1">Automatically restart failed tasks</p>
        </div>
        <button
          onClick={() => setTempConfig(prev => ({ ...prev, autoRestart: !prev.autoRestart }))}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            tempConfig.autoRestart ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              tempConfig.autoRestart ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </div>
    </div>
  );

  const renderDockerSection = () => (
    <div className="space-y-6">
      {/* Docker Enabled */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-900 dark:text-white">
            Enable Docker Sandbox
          </label>
          <p className="text-xs text-gray-500 mt-1">Use Docker containers for isolated execution</p>
        </div>
        <button
          onClick={() => setTempConfig(prev => ({ ...prev, dockerEnabled: !prev.dockerEnabled }))}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            tempConfig.dockerEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              tempConfig.dockerEnabled ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </div>

      {tempConfig.dockerEnabled && (
        <div className="pl-4 border-l-2 border-blue-200 dark:border-blue-800 space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Docker Requirements</p>
                <ul className="text-xs space-y-1">
                  <li>• Docker must be installed and running</li>
                  <li>• AutoDev-AI Docker images will be downloaded</li>
                  <li>• Containers are automatically managed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderNetworkSection = () => (
    <div className="space-y-6">
      {/* Timeout */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-900 dark:text-white">
          Execution Timeout (seconds)
        </label>
        <input
          type="number"
          min="10"
          max="3600"
          value={tempConfig.timeout}
          onChange={e =>
            setTempConfig(prev => ({
              ...prev,
              timeout: parseInt(e.target.value) || 30,
            }))
          }
          className={cn(
            'w-full bg-white dark:bg-gray-800 border rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500',
            errors['timeout'] ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
          )}
        />
        {errors['timeout'] && <p className="text-sm text-red-500">{errors['timeout']}</p>}
        <p className="text-xs text-gray-500">Maximum time to wait for task completion</p>
      </div>

      {/* Max Retries */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-900 dark:text-white">Maximum Retries</label>
        <input
          type="number"
          min="0"
          max="10"
          value={tempConfig.maxRetries}
          onChange={e =>
            setTempConfig(prev => ({
              ...prev,
              maxRetries: parseInt(e.target.value) || 0,
            }))
          }
          className={cn(
            'w-full bg-white dark:bg-gray-800 border rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500',
            errors['maxRetries'] ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
          )}
        />
        {errors['maxRetries'] && <p className="text-sm text-red-500">{errors['maxRetries']}</p>}
        <p className="text-xs text-gray-500">Number of times to retry failed operations</p>
      </div>
    </div>
  );

  const renderSecuritySection = () => (
    <div className="space-y-6">
      {/* API Keys Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-900 dark:text-white">API Keys</label>
          <button
            onClick={() => setShowApiKeys(!showApiKeys)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showApiKeys ? 'Hide' : 'Show'} Keys
          </button>
        </div>

        {/* Anthropic API Key */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Anthropic API Key
          </label>
          <div className="relative">
            <input
              type={showApiKeys ? 'text' : 'password'}
              value={apiKeys['anthropic']}
              onChange={e => setApiKeys(prev => ({ ...prev, anthropic: e.target.value }))}
              placeholder="sk-ant-..."
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Key className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* OpenAI API Key */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
            OpenAI API Key
          </label>
          <div className="relative">
            <input
              type={showApiKeys ? 'text' : 'password'}
              value={apiKeys['openai']}
              onChange={e => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
              placeholder="sk-..."
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Key className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* OpenRouter API Key */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
            OpenRouter API Key
          </label>
          <div className="relative">
            <input
              type={showApiKeys ? 'text' : 'password'}
              value={apiKeys['openrouter']}
              onChange={e => setApiKeys(prev => ({ ...prev, openrouter: e.target.value }))}
              placeholder="sk-or-..."
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Key className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
            <div className="text-xs text-yellow-700 dark:text-yellow-300">
              <p className="font-medium mb-1">Security Notice</p>
              <p>
                API keys are stored locally and never transmitted except to their respective
                services.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPerformanceSection = () => (
    <div className="space-y-6">
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="flex items-start space-x-2">
          <Zap className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Performance Optimization
            </h4>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
              <p>• Automatic load balancing across AI models</p>
              <p>• Intelligent caching of API responses</p>
              <p>• Parallel execution when possible</p>
              <p>• Memory usage optimization</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'execution':
        return renderExecutionSection();
      case 'docker':
        return renderDockerSection();
      case 'network':
        return renderNetworkSection();
      case 'security':
        return renderSecuritySection();
      case 'performance':
        return renderPerformanceSection();
      default:
        return null;
    }
  };

  return (
    <div className={cn('h-full flex flex-col bg-white dark:bg-gray-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configuration</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-0">
          {configSections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeSection === section.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{section.title}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl">
          <div className="mb-4">
            <h3 className="text-base font-medium text-gray-900 dark:text-white">
              {configSections.find(s => s.id === activeSection)?.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {configSections.find(s => s.id === activeSection)?.description}
            </p>
          </div>

          {renderSectionContent()}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept=".json"
            onChange={importConfig}
            className="hidden"
            id="config-import"
          />
          <label
            htmlFor="config-import"
            className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </label>

          <button
            onClick={exportConfig}
            className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className={cn(
              'flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors',
              hasChanges
                ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                : 'text-gray-400 cursor-not-allowed'
            )}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleSave}
            disabled={!hasChanges || Object.keys(errors).length > 0}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              hasChanges && Object.keys(errors).length === 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
