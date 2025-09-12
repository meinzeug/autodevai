import React from 'react';
import { ExecutionResult } from '../../types';
import { CheckCircle, XCircle, Clock, Server } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ResultCardProps {
  result: ExecutionResult;
  className?: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  className,
}) => {
  const statusIcon = result.success ? (
    <CheckCircle className="w-6 h-6 text-green-500" />
  ) : (
    <XCircle className="w-6 h-6 text-red-500" />
  );

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-3">
        {statusIcon}
        <div>
          <h3 className="font-semibold">Execution Result</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Status: {result.success ? 'Success' : 'Failed'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600 dark:text-gray-400">Tool:</span>
          <span className="font-medium">{result.tool_used}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600 dark:text-gray-400">Duration:</span>
          <span className="font-medium">{(result.duration_ms / 1000).toFixed(2)}s</span>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium mb-2">Output</h4>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-96 overflow-auto">
          <pre className="text-sm font-mono whitespace-pre-wrap break-words">
            {result.output}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;