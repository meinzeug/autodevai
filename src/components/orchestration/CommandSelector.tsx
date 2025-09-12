import React from 'react';
import { cn } from '../../utils/cn';

interface CommandSelectorProps {
  tool: 'claude-flow' | 'openai-codex';
  claudeFlowCommand: string;
  codexMode: string;
  onClaudeFlowChange: (command: string) => void;
  onCodexModeChange: (mode: string) => void;
  disabled?: boolean;
  className?: string;
}

export const CommandSelector: React.FC<CommandSelectorProps> = ({
  tool,
  claudeFlowCommand,
  codexMode,
  onClaudeFlowChange,
  onCodexModeChange,
  disabled = false,
  className,
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      {tool === 'claude-flow' ? (
        <>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Claude-Flow Command
          </label>
          <select
            value={claudeFlowCommand}
            onChange={(e) => onClaudeFlowChange(e.target.value)}
            disabled={disabled}
            className={cn(
              'w-full px-3 py-2 rounded-lg border',
              'border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <option value="swarm">Swarm Orchestration</option>
            <option value="sparc">SPARC Mode</option>
            <option value="hive-mind">Hive-Mind</option>
            <option value="memory">Memory Management</option>
            <option value="neural">Neural Training</option>
          </select>
        </>
      ) : (
        <>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Codex Mode
          </label>
          <select
            value={codexMode}
            onChange={(e) => onCodexModeChange(e.target.value)}
            disabled={disabled}
            className={cn(
              'w-full px-3 py-2 rounded-lg border',
              'border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <option value="suggest">Suggest Mode</option>
            <option value="auto-edit">Auto-Edit Mode</option>
            <option value="full-auto">Full-Auto Mode</option>
          </select>
        </>
      )}
    </div>
  );
};

export default CommandSelector;