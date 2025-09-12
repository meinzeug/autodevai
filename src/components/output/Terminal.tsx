import React, { useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { Terminal as TerminalIcon } from 'lucide-react';

interface TerminalProps {
  output: string;
  className?: string;
  autoScroll?: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({
  output,
  className,
  autoScroll = true,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output, autoScroll]);

  return (
    <div className={cn('rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden', className)}>
      <div className="bg-gray-800 dark:bg-gray-900 px-4 py-2 flex items-center gap-2">
        <TerminalIcon className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">Terminal Output</span>
      </div>
      <div
        ref={terminalRef}
        className="bg-black p-4 font-mono text-sm text-green-400 overflow-auto"
        style={{ minHeight: '300px', maxHeight: '600px' }}
      >
        <pre className="whitespace-pre-wrap break-words">
          {output || '$ Ready for execution...'}
        </pre>
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default Terminal;