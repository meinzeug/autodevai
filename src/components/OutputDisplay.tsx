import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Download, Trash2, Search, Filter, Copy, CheckCircle } from 'lucide-react';
import { ExecutionOutput } from '../types';
import { cn } from '../utils/cn';

interface OutputDisplayProps {
  outputs: ExecutionOutput[];
  onClear: () => void;
  className?: string;
}

export const OutputDisplay: React.FC<OutputDisplayProps> = ({
  outputs,
  onClear,
  className
}) => {
  const [filter, setFilter] = useState<'all' | 'stdout' | 'stderr' | 'error' | 'success'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const filteredOutputs = outputs.filter(output => {
    const matchesFilter = filter === 'all' || output.type === filter;
    const matchesSearch = searchTerm === '' || 
      output.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (output.source && output.source.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  useEffect(() => {
    if (autoScroll && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [outputs, autoScroll]);

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleExport = () => {
    const exportData = outputs.map(output => ({
      timestamp: output.timestamp.toISOString(),
      type: output.type,
      source: output.source || 'unknown',
      content: output.content
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autodev-execution-log-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getOutputTypeColor = (type: ExecutionOutput['type']) => {
    switch (type) {
      case 'stdout':
        return 'text-green-400';
      case 'stderr':
        return 'text-red-400';
      case 'error':
        return 'text-red-500';
      case 'success':
        return 'text-green-500';
      case 'info':
      default:
        return 'text-blue-400';
    }
  };

  const getOutputTypeIcon = (type: ExecutionOutput['type']) => {
    switch (type) {
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      case 'stderr':
        return '⚠️';
      case 'stdout':
        return '💬';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={cn("bg-gray-800 border border-gray-700 rounded-lg", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">Execution Output</h2>
          <span className="text-sm text-gray-400">
            ({filteredOutputs.length} / {outputs.length})
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              "px-3 py-1 text-xs rounded border transition-colors",
              autoScroll
                ? "border-green-500 text-green-400 bg-green-500/10"
                : "border-gray-600 text-gray-400 hover:border-gray-500"
            )}
          >
            Auto-scroll
          </button>
          
          <button
            onClick={handleExport}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            title="Export logs"
          >
            <Download className="w-4 h-4 text-gray-400" />
          </button>
          
          <button
            onClick={onClear}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            title="Clear output"
          >
            <Trash2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="p-4 border-b border-gray-700 space-y-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="stdout">Standard Output</option>
              <option value="stderr">Standard Error</option>
              <option value="error">Errors</option>
              <option value="success">Success</option>
              <option value="info">Info</option>
            </select>
          </div>
          
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search output..."
              className="w-full bg-gray-700 border border-gray-600 rounded pl-10 pr-3 py-1 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Output Content */}
      <div 
        ref={outputRef}
        className="h-96 overflow-y-auto p-4 space-y-2 font-mono text-sm"
      >
        {filteredOutputs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {outputs.length === 0 ? (
              <>
                <Terminal className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p>No output yet. Execute a task to see results here.</p>
              </>
            ) : (
              <p>No outputs match the current filter criteria.</p>
            )}
          </div>
        ) : (
          filteredOutputs.map((output) => (
            <div
              key={output.id}
              className="group flex items-start space-x-3 p-2 hover:bg-gray-700/50 rounded"
            >
              <div className="flex-shrink-0 pt-1">
                <span className="text-lg">{getOutputTypeIcon(output.type)}</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className={cn("font-medium", getOutputTypeColor(output.type))}>
                      {output.type.toUpperCase()}
                    </span>
                    {output.source && (
                      <span className="text-gray-500 text-xs">
                        [{output.source}]
                      </span>
                    )}
                    <span className="text-gray-500 text-xs">
                      {typeof output.timestamp === 'string' ? 
                        new Date(output.timestamp).toLocaleTimeString() : 
                        output.timestamp?.toLocaleTimeString?.() || output.timestamp}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleCopy(output.content, output.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition-all"
                    title="Copy to clipboard"
                  >
                    {copiedId === output.id ? (
                      <CheckCircle className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                </div>
                
                <div className="text-gray-300 whitespace-pre-wrap break-words">
                  {output.content}
                </div>
              </div>
            </div>
          ))
        )}
        
        <div ref={endRef} />
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>
            Total: {outputs.length} | 
            Errors: {outputs.filter(o => o.type === 'error' || o.type === 'stderr').length} |
            Success: {outputs.filter(o => o.type === 'success').length}
          </span>
          <span>
            Last update: {outputs.length > 0 ? (
              typeof outputs[outputs.length - 1]?.timestamp === 'string' 
                ? new Date(outputs[outputs.length - 1].timestamp).toLocaleTimeString()
                : outputs[outputs.length - 1]?.timestamp?.toLocaleTimeString?.() || 'Invalid'
            ) : 'Never'}
          </span>
        </div>
      </div>
    </div>
  );
};