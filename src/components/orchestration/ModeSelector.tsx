import React from 'react';
import { cn } from '../../utils/cn';

interface ModeSelectorProps {
  mode: 'single' | 'dual';
  onChange: (mode: 'single' | 'dual') => void;
  disabled?: boolean;
  className?: string;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  mode,
  onChange,
  disabled = false,
  className,
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Orchestration Mode
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange('single')}
          disabled={disabled}
          className={cn(
            'px-4 py-3 rounded-lg border-2 transition-all',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            mode === 'single'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="font-medium">Single Mode</div>
          <div className="text-xs mt-1 opacity-70">Use one AI tool</div>
        </button>
        
        <button
          type="button"
          onClick={() => onChange('dual')}
          disabled={disabled}
          className={cn(
            'px-4 py-3 rounded-lg border-2 transition-all',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            mode === 'dual'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="font-medium">Dual Mode</div>
          <div className="text-xs mt-1 opacity-70">OpenRouter orchestration</div>
        </button>
      </div>
    </div>
  );
};

export default ModeSelector;