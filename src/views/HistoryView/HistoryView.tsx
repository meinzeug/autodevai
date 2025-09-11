import React, { useState, useMemo, useCallback } from 'react';
import { Search, Filter, Download, Trash2, RefreshCw, Calendar } from 'lucide-react';
import { Card, Button, Badge, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui';
import { TaskList, ResultCard } from '../../components/ui';
import { ExecutionOutput } from '../../types';
import { cn } from '../../utils/cn';

interface HistoryViewProps {
  outputs: ExecutionOutput[];
  onClear?: () => void;
  onExport?: (data: ExecutionOutput[]) => void;
  className?: string;
}

interface FilterState {
  search: string;
  type: 'all' | 'info' | 'success' | 'warning' | 'error';
  source: string;
  dateRange: 'all' | '24h' | '7d' | '30d';
}

const mockHistoryData: ExecutionOutput[] = [
  {
    id: '1',
    timestamp: new Date().toISOString(),
    type: 'success',
    content: 'Successfully initialized swarm with 4 agents',
    source: 'Claude Flow',
    command: 'swarm init --topology mesh',
    executionTime: 2500
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    type: 'error',
    content: 'Failed to connect to Docker daemon',
    source: 'Docker',
    error: 'Connection refused: connect to unix:///var/run/docker.sock',
    executionTime: 1200
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    type: 'info',
    content: 'Running SPARC methodology for component analysis',
    source: 'SPARC Engine',
    command: 'sparc analyze --component UserAuth',
    executionTime: 15000
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    type: 'warning',
    content: 'High memory usage detected during neural training',
    source: 'Neural Engine',
    metadata: { memoryUsage: '85%', threshold: '80%' }
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    type: 'success',
    content: 'Hive mind coordination established with 12 nodes',
    source: 'Hive Mind',
    command: 'hive-mind activate --nodes 12',
    executionTime: 5500
  }
];

export function HistoryView({ outputs = mockHistoryData, onClear, onExport, className }: HistoryViewProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: 'all',
    source: 'all',
    dateRange: 'all'
  });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Filter outputs based on current filters
  const filteredOutputs = useMemo(() => {
    let filtered = [...outputs];

    // Search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(output =>
        output.content?.toLowerCase().includes(searchLower) ||
        output.command?.toLowerCase().includes(searchLower) ||
        output.source?.toLowerCase().includes(searchLower)
      );
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(output => output.type === filters.type);
    }

    // Source filter
    if (filters.source !== 'all') {
      filtered = filtered.filter(output => output.source === filters.source);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = Date.now();
      const ranges = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };
      const rangeMs = ranges[filters.dateRange as keyof typeof ranges];
      filtered = filtered.filter(output => 
        now - new Date(output.timestamp).getTime() <= rangeMs
      );
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [outputs, filters]);

  // Get unique sources for filter dropdown
  const uniqueSources = useMemo(() => {
    const sources = new Set(outputs.map(output => output.source).filter(Boolean));
    return Array.from(sources).sort();
  }, [outputs]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Handle clear all
  const handleClearAll = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all execution history?')) {
      onClear?.();
      setSelectedItems([]);
    }
  }, [onClear]);

  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const dataToExport = selectedItems.length > 0 
        ? outputs.filter(output => selectedItems.includes(output.id))
        : filteredOutputs;
      
      onExport?.(dataToExport);
      
      // Also create downloadable JSON file
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `execution-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [selectedItems, outputs, filteredOutputs, onExport]);

  // Handle item selection
  const handleSelectItem = useCallback((id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedItems.length === filteredOutputs.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredOutputs.map(output => output.id));
    }
  }, [selectedItems.length, filteredOutputs]);

  // Get statistics
  const stats = useMemo(() => {
    const total = filteredOutputs.length;
    const byType = filteredOutputs.reduce((acc, output) => {
      acc[output.type || 'info'] = (acc[output.type || 'info'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const averageExecutionTime = filteredOutputs
      .filter(output => output.executionTime)
      .reduce((sum, output) => sum + (output.executionTime || 0), 0) / 
      filteredOutputs.filter(output => output.executionTime).length || 0;

    return { total, byType, averageExecutionTime };
  }, [filteredOutputs]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Execution History</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {stats.total} total executions
            {stats.averageExecutionTime > 0 && (
              <span className="ml-2">
                • Avg. {(stats.averageExecutionTime / 1000).toFixed(1)}s execution time
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting || filteredOutputs.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export ({selectedItems.length || filteredOutputs.length})
          </Button>
          {onClear && (
            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={outputs.length === 0}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">{stats.byType.info || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Info</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-500">{stats.byType.success || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Success</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-500">{stats.byType.warning || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Warning</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{stats.byType.error || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Error</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-500">{selectedItems.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Selected</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <span className="font-medium">Filters</span>
          {Object.values(filters).some(v => v !== 'all' && v !== '') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ search: '', type: 'all', source: 'all', dateRange: 'all' })}
              className="gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Clear
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search executions..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Filter */}
          <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>

          {/* Source Filter */}
          <Select value={filters.source} onValueChange={(value) => handleFilterChange('source', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {uniqueSources.map(source => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Results */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Execution Results ({filteredOutputs.length})
          </h3>
          {filteredOutputs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="gap-2"
            >
              {selectedItems.length === filteredOutputs.length ? 'Deselect All' : 'Select All'}
            </Button>
          )}
        </div>

        {filteredOutputs.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-500 dark:text-gray-400">
              {outputs.length === 0 
                ? 'No execution history yet. Run some tasks to see results here.' 
                : 'No results match your current filters. Try adjusting the filter criteria.'}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOutputs.map((output) => (
              <ResultCard
                key={output.id}
                {...output}
                selected={selectedItems.includes(output.id)}
                onSelect={() => handleSelectItem(output.id)}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default HistoryView;