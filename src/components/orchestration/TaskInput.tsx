import React from 'react';
import { cn } from '../../utils/cn';

interface TaskInputProps {
  description: string;
  args?: string;
  onDescriptionChange: (value: string) => void;
  onArgsChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const TaskInput: React.FC<TaskInputProps> = ({
  description,
  args = '',
  onDescriptionChange,
  onArgsChange,
  disabled = false,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Task Description
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          disabled={disabled}
          placeholder="Describe the task you want to execute..."
          className={cn(
            'w-full px-3 py-2 rounded-lg border',
            'border-gray-300 dark:border-gray-600',
            'bg-white dark:bg-gray-800',
            'placeholder-gray-400 dark:placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'resize-none min-h-[120px]',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          rows={5}
        />
      </div>
      
      {onArgsChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Additional Arguments (Optional)
          </label>
          <input
            type="text"
            value={args}
            onChange={(e) => onArgsChange(e.target.value)}
            disabled={disabled}
            placeholder="e.g., --agents 6 --mode parallel"
            className={cn(
              'w-full px-3 py-2 rounded-lg border',
              'border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          />
        </div>
      )}
    </div>
  );
};

export default TaskInput;