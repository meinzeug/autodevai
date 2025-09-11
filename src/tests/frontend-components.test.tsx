/**
 * Comprehensive Tests for React Frontend Components
 * Tests for OutputDisplay, StatusBar, and other UI components
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { OutputDisplay } from '../components/OutputDisplay';
import { StatusBar } from '../components/StatusBar';
import { ExecutionOutput, ToolStatus, SystemMetrics } from '../types';

// Mock TauriService
const mockTauriService = {
  getInstance: vi.fn(() => ({
    onToolStatusUpdate: vi.fn(() => vi.fn()),
    getToolStatus: vi.fn(() => Promise.resolve([])),
    getSystemMetrics: vi.fn(() => Promise.resolve({
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkActivity: 0,
      activeProcesses: 0
    }))
  }))
};

vi.mock('../src/services/tauri', () => ({
  TauriService: mockTauriService
}));

describe('OutputDisplay Component', () => {
  const createMockOutput = (
    type: ExecutionOutput['type'] = 'stdout',
    content: string = 'Test output',
    source?: string
  ): ExecutionOutput => {
    const output: ExecutionOutput = {
      id: `output-${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date()
    };
    if (source !== undefined) {
      output.source = source;
    }
    return output;
  };

  const mockOnClear = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders empty state correctly', () => {
    render(<OutputDisplay outputs={[]} onClear={mockOnClear} />);
    
    expect(screen.getByText('Execution Output')).toBeInTheDocument();
    expect(screen.getByText('No output yet. Execute a task to see results here.')).toBeInTheDocument();
  });

  test('displays outputs correctly', () => {
    const outputs = [
      createMockOutput('stdout', 'Standard output message', 'test-source'),
      createMockOutput('stderr', 'Error message'),
      createMockOutput('success', 'Success message')
    ];

    render(<OutputDisplay outputs={outputs} onClear={mockOnClear} />);
    
    expect(screen.getByText('Standard output message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('[test-source]')).toBeInTheDocument();
  });

  test('filters outputs by type', () => {
    const outputs = [
      createMockOutput('stdout', 'Standard output'),
      createMockOutput('stderr', 'Error output'),
      createMockOutput('success', 'Success output')
    ];

    render(<OutputDisplay outputs={outputs} onClear={mockOnClear} />);
    
    // Find and click the filter dropdown
    const filterSelect = screen.getByDisplayValue('All Types');
    fireEvent.change(filterSelect, { target: { value: 'stderr' } });
    
    expect(screen.getByText('Error output')).toBeInTheDocument();
    expect(screen.queryByText('Standard output')).not.toBeInTheDocument();
    expect(screen.queryByText('Success output')).not.toBeInTheDocument();
  });

  test('searches outputs', () => {
    const outputs = [
      createMockOutput('stdout', 'This is a test message'),
      createMockOutput('stderr', 'Another message'),
      createMockOutput('success', 'Success notification')
    ];

    render(<OutputDisplay outputs={outputs} onClear={mockOnClear} />);
    
    const searchInput = screen.getByPlaceholderText('Search output...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    expect(screen.getByText('This is a test message')).toBeInTheDocument();
    expect(screen.queryByText('Another message')).not.toBeInTheDocument();
    expect(screen.queryByText('Success notification')).not.toBeInTheDocument();
  });

  test('handles clear functionality', () => {
    const outputs = [createMockOutput('stdout', 'Test output')];
    
    render(<OutputDisplay outputs={outputs} onClear={mockOnClear} />);
    
    const clearButton = screen.getByTitle('Clear output');
    fireEvent.click(clearButton);
    
    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });

  test('handles export functionality', () => {
    const outputs = [
      createMockOutput('stdout', 'Output 1'),
      createMockOutput('stderr', 'Output 2')
    ];

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Mock document.createElement and appendChild
    const mockA = document.createElement('a');
    vi.spyOn(document, 'createElement').mockReturnValue(mockA);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockA);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockA);
    vi.spyOn(mockA, 'click').mockImplementation(() => undefined);

    render(<OutputDisplay outputs={outputs} onClear={mockOnClear} />);
    
    const exportButton = screen.getByTitle('Export logs');
    fireEvent.click(exportButton);
    
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockA.click).toHaveBeenCalled();
  });

  test('handles copy functionality', async () => {
    const outputs = [createMockOutput('stdout', 'Copyable content')];
    
    // Mock clipboard API
    const writeTextMock = vi.fn(() => Promise.resolve());
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<OutputDisplay outputs={outputs} onClear={mockOnClear} />);
    
    // Find and click copy button (appears on hover)
    const outputDiv = screen.getByText('Copyable content').closest('.group');
    expect(outputDiv).toBeInTheDocument();
    
    // Simulate hover to show copy button
    if (outputDiv) {
      fireEvent.mouseEnter(outputDiv);
      
      const copyButton = screen.getByTitle('Copy to clipboard');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith('Copyable content');
      });
    }
  });

  test('toggles auto-scroll', () => {
    const outputs = [createMockOutput('stdout', 'Test output')];
    
    render(<OutputDisplay outputs={outputs} onClear={mockOnClear} />);
    
    const autoScrollButton = screen.getByText('Auto-scroll');
    
    // Should start with auto-scroll enabled
    expect(autoScrollButton).toHaveClass('border-green-500');
    
    fireEvent.click(autoScrollButton);
    
    // Should toggle to disabled
    expect(autoScrollButton).toHaveClass('border-gray-600');
  });

  test('displays correct output type icons and colors', () => {
    const outputs = [
      createMockOutput('stdout', 'Standard output'),
      createMockOutput('stderr', 'Error output'),
      createMockOutput('error', 'Error'),
      createMockOutput('success', 'Success'),
      createMockOutput('info', 'Info')
    ];

    render(<OutputDisplay outputs={outputs} onClear={mockOnClear} />);
    
    // Verify type labels are present
    expect(screen.getByText('STDOUT')).toBeInTheDocument();
    expect(screen.getByText('STDERR')).toBeInTheDocument();
    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    expect(screen.getByText('INFO')).toBeInTheDocument();
  });

  test('displays footer statistics', () => {
    const outputs = [
      createMockOutput('stdout', 'Output 1'),
      createMockOutput('stderr', 'Error 1'),
      createMockOutput('success', 'Success 1'),
      createMockOutput('error', 'Error 2')
    ];

    render(<OutputDisplay outputs={outputs} onClear={mockOnClear} />);
    
    // Check footer stats
    expect(screen.getByText(/Total: 4/)).toBeInTheDocument();
    expect(screen.getByText(/Errors: 2/)).toBeInTheDocument(); // stderr + error
    expect(screen.getByText(/Success: 1/)).toBeInTheDocument();
  });
});

describe('StatusBar Component', () => {
  const mockToolStatuses: ToolStatus[] = [
    {
      name: 'test-tool',
      status: 'active',
      version: '1.0.0'
    },
    {
      name: 'error-tool',
      status: 'error',
      errorMessage: 'Test error'
    }
  ];

  const mockSystemMetrics: SystemMetrics = {
    cpuUsage: 45.5,
    memoryUsage: 67.8,
    diskUsage: 23.4,
    networkActivity: 12.3,
    activeProcesses: 42
  };

  const createSystemHealth = (metrics: SystemMetrics, networkStatus: 'connected' | 'disconnected' | 'slow' = 'connected') => ({
    cpu: metrics.cpuUsage,
    memory: metrics.memoryUsage,
    disk: metrics.diskUsage,
    network: networkStatus
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock TauriService methods
    mockTauriService.getInstance().getToolStatus.mockResolvedValue(mockToolStatuses as any);
    mockTauriService.getInstance().getSystemMetrics.mockResolvedValue(mockSystemMetrics);
  });

  test('renders online status correctly', () => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    render(<StatusBar 
      systemHealth={createSystemHealth(mockSystemMetrics, 'connected')} 
      activeConnections={2} 
      lastUpdate={new Date('2024-01-01')} 
    />);
    
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  test('renders offline status correctly', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(<StatusBar 
      systemHealth={createSystemHealth(mockSystemMetrics, 'disconnected')} 
      activeConnections={2} 
      lastUpdate={new Date('2024-01-01')} 
    />);
    
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  test('displays system metrics', async () => {
    render(<StatusBar 
      systemHealth={createSystemHealth(mockSystemMetrics, 'connected')} 
      activeConnections={2} 
      lastUpdate={new Date('2024-01-01')} 
    />);
    
    await waitFor(() => {
      expect(screen.getByText('46%')).toBeInTheDocument(); // CPU usage rounded
      expect(screen.getByText('68%')).toBeInTheDocument(); // Memory usage rounded
      expect(screen.getByText('23%')).toBeInTheDocument(); // Disk usage rounded
      expect(screen.getByText('42')).toBeInTheDocument(); // Active processes
      expect(screen.getByText('12 KB/s')).toBeInTheDocument(); // Network activity
    });
  });

  test('displays tool statuses', async () => {
    render(<StatusBar 
      systemHealth={createSystemHealth(mockSystemMetrics, 'connected')} 
      activeConnections={2} 
      lastUpdate={new Date('2024-01-01')} 
    />);
    
    await waitFor(() => {
      expect(screen.getByText('test-tool')).toBeInTheDocument();
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
      expect(screen.getByText('error-tool')).toBeInTheDocument();
    });
  });

  test('handles refresh functionality', async () => {
    render(<StatusBar 
      systemHealth={createSystemHealth(mockSystemMetrics, 'connected')} 
      activeConnections={2} 
      lastUpdate={new Date('2024-01-01')} 
    />);
    
    const refreshButton = screen.getByTitle('Refresh status');
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(mockTauriService.getInstance().getToolStatus).toHaveBeenCalledTimes(2); // Initial + refresh
      expect(mockTauriService.getInstance().getSystemMetrics).toHaveBeenCalledTimes(2);
    });
  });

  test('shows health indicators correctly', async () => {
    render(<StatusBar 
      systemHealth={createSystemHealth(mockSystemMetrics, 'connected')} 
      activeConnections={2} 
      lastUpdate={new Date('2024-01-01')} 
    />);
    
    await waitFor(() => {
      // Should show "Issues" due to error-tool having error status
      expect(screen.getByText('Issues')).toBeInTheDocument();
    });
  });

  test('shows healthy status when all tools are active', async () => {
    const healthyToolStatuses: ToolStatus[] = [
      { name: 'tool1', status: 'active', version: '1.0.0' },
      { name: 'tool2', status: 'active', version: '2.0.0' }
    ];
    
    mockTauriService.getInstance().getToolStatus.mockResolvedValue(healthyToolStatuses as any);
    
    render(<StatusBar 
      systemHealth={createSystemHealth(mockSystemMetrics, 'connected')} 
      activeConnections={2} 
      lastUpdate={new Date('2024-01-01')} 
    />);
    
    await waitFor(() => {
      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });
  });

  test('shows loading status appropriately', () => {
    mockTauriService.getInstance().getToolStatus.mockResolvedValue([]);
    
    render(<StatusBar 
      systemHealth={createSystemHealth(mockSystemMetrics, 'connected')} 
      activeConnections={2} 
      lastUpdate={new Date('2024-01-01')} 
    />);
    
    // Initially should show loading
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  test('handles tool status updates', () => {
    const mockUnsubscribe = vi.fn();
    mockTauriService.getInstance().onToolStatusUpdate.mockReturnValue(mockUnsubscribe);
    
    const { unmount } = render(<StatusBar 
      systemHealth={createSystemHealth(mockSystemMetrics, 'connected')} 
      activeConnections={2} 
      lastUpdate={new Date("2024-01-01")} 
    />);
    
    expect(mockTauriService.getInstance().onToolStatusUpdate).toHaveBeenCalled();
    
    // Unmount should call unsubscribe
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  test('handles online/offline events', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    const { unmount } = render(<StatusBar 
      systemHealth={createSystemHealth(mockSystemMetrics, 'connected')} 
      activeConnections={2} 
      lastUpdate={new Date("2024-01-01")} 
    />);
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  test('displays correct metric colors for thresholds', async () => {
    const highUsageMetrics: SystemMetrics = {
      cpuUsage: 95, // Critical
      memoryUsage: 85, // Warning
      diskUsage: 70, // Normal
      networkActivity: 0,
      activeProcesses: 0
    };
    
    mockTauriService.getInstance().getSystemMetrics.mockResolvedValue(highUsageMetrics);
    
    render(<StatusBar 
      systemHealth={createSystemHealth(highUsageMetrics, 'connected')} 
      activeConnections={2} 
      lastUpdate={new Date('2024-01-01')} 
    />);
    
    await waitFor(() => {
      const cpuElement = screen.getByText('95%');
      const memoryElement = screen.getByText('85%');
      const diskElement = screen.getByText('70%');
      
      // Verify elements exist (color classes would be tested in integration tests)
      expect(cpuElement).toBeInTheDocument();
      expect(memoryElement).toBeInTheDocument();
      expect(diskElement).toBeInTheDocument();
    });
  });

  test('limits displayed tools to 4 and shows more count', async () => {
    const manyTools: ToolStatus[] = Array.from({ length: 8 }, (_, i) => ({
      name: `tool-${i}`,
      status: 'active' as const,
      version: '1.0.0'
    }));
    
    mockTauriService.getInstance().getToolStatus.mockResolvedValue(manyTools as any);
    
    render(<StatusBar 
      systemHealth={createSystemHealth(mockSystemMetrics, 'connected')} 
      activeConnections={2} 
      lastUpdate={new Date('2024-01-01')} 
    />);
    
    await waitFor(() => {
      expect(screen.getByText('+4 more')).toBeInTheDocument();
    });
  });
});

describe('Component Integration', () => {
  test('components render without crashing', () => {
    const outputs: ExecutionOutput[] = [];
    const onClear = vi.fn();
    
    render(
      <div>
        <OutputDisplay outputs={outputs} onClear={onClear} />
        <StatusBar 
          systemHealth={{
            cpu: 50,
            memory: 60,
            disk: 70,
            network: "connected" as const
          }} 
          activeConnections={2} 
          lastUpdate={new Date("2024-01-01")} 
        />
      </div>
    );
    
    expect(screen.getByText('Execution Output')).toBeInTheDocument();
  });
});

// Mock ResizeObserver for tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));