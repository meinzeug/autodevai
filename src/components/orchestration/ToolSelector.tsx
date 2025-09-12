import React from 'react';
import { cn } from '../../utils/cn';
import { Code2, GitBranch } from 'lucide-react';

interface ToolSelectorProps {
  tool: 'claude-flow' | 'openai-codex';
  onChange: (tool: 'claude-flow' | 'openai-codex') => void;
  disabled?: boolean;
  className?: string;
}

export const ToolSelector: React.FC<ToolSelectorProps> = ({
  tool,
  onChange,
  disabled = false,
  className,
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        AI Tool
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange('claude-flow')}
          disabled={disabled}
          className={cn(
            'px-4 py-3 rounded-lg border-2 transition-all',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'flex items-center justify-center gap-2',
            tool === 'claude-flow'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <GitBranch className="w-5 h-5" />
          <div>
            <div className="font-medium">Claude-Flow</div>
            <div className="text-xs mt-1 opacity-70">Swarm orchestration</div>
          </div>
        </button>
        
        <button
          type="button"
          onClick={() => onChange('openai-codex')}
          disabled={disabled}
          className={cn(
            'px-4 py-3 rounded-lg border-2 transition-all',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'flex items-center justify-center gap-2',
            tool === 'openai-codex'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Code2 className="w-5 h-5" />
          <div>
            <div className="font-medium">OpenAI Codex</div>
            <div className="text-xs mt-1 opacity-70">Code generation</div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ToolSelector;