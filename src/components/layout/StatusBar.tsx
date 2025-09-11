import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '@/store';
import { formatBytes } from '@/utils/format';

export function StatusBar() {
  const { prerequisites, systemInfo } = useStore();

  const getStatusIcon = (ready: boolean) => {
    return ready ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-6">
          {prerequisites && (
            <>
              <div className="flex items-center space-x-2">
                {getStatusIcon(prerequisites.claude_flow_ready)}
                <span>Claude-Flow</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(prerequisites.codex_ready)}
                <span>Codex</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(prerequisites.docker_ready)}
                <span>Docker</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4 text-gray-500 dark:text-gray-400">
          {systemInfo && (
            <>
              <span>
                Memory: {formatBytes(systemInfo.memory_available)} /{' '}
                {formatBytes(systemInfo.memory_total)}
              </span>
              <span>{systemInfo.os} - {systemInfo.kernel}</span>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}