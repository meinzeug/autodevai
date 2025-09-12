import React from 'react';
import { Play, Square, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

interface ExecutionControlsProps {
  isExecuting: boolean;
  onExecute: () => void;
  onStop: () => void;
  onReset: () => void;
  disabled?: boolean;
  className?: string;
}

export const ExecutionControls: React.FC<ExecutionControlsProps> = ({
  isExecuting,
  onExecute,
  onStop,
  onReset,
  disabled = false,
  className,
}) => {
  return (
    <div className={cn('flex gap-3', className)}>
      {!isExecuting ? (
        <Button
          onClick={onExecute}
          disabled={disabled}
          variant="primary"
          className="flex-1"
        >
          <Play className="w-4 h-4 mr-2" />
          Execute Task
        </Button>
      ) : (
        <Button
          onClick={onStop}
          variant="destructive"
          className="flex-1"
        >
          <Square className="w-4 h-4 mr-2" />
          Stop Execution
        </Button>
      )}
      
      <Button
        onClick={onReset}
        disabled={isExecuting}
        variant="ghost"
      >
        <RotateCcw className="w-4 h-4" />
      </Button>
      
      {isExecuting && (
        <div className="flex items-center text-blue-600 dark:text-blue-400">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          <span className="text-sm">Executing...</span>
        </div>
      )}
    </div>
  );
};

export default ExecutionControls;