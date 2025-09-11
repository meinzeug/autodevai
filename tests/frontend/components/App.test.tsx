import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../../src/App';

// Mock Tauri API
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: mockInvoke,
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

describe('App Component', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('app-container')).toBeInTheDocument();
  });

  it('displays the main navigation', () => {
    render(<App />);
    expect(screen.getByText('AutoDev-AI')).toBeInTheDocument();
    expect(screen.getByText('Neural Bridge')).toBeInTheDocument();
  });

  it('initializes swarm on startup', async () => {
    mockInvoke.mockResolvedValue({ success: true, swarm_id: 'test_swarm' });
    
    render(<App />);
    
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('claude_flow_init', expect.any(Object));
    });
  });

  it('handles swarm initialization error', async () => {
    mockInvoke.mockRejectedValue(new Error('Initialization failed'));
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('updates UI when swarm status changes', async () => {
    mockInvoke.mockResolvedValue({ success: true, status: 'active' });
    
    render(<App />);
    
    const statusButton = screen.getByTestId('swarm-status');
    fireEvent.click(statusButton);
    
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('executes code through Codex integration', async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValue({ 
      output: 'Hello, World!', 
      status: 'completed' 
    });
    
    render(<App />);
    
    const codeInput = screen.getByTestId('code-input');
    const executeButton = screen.getByTestId('execute-button');
    
    await user.type(codeInput, 'console.log("Hello, World!");');
    await user.click(executeButton);
    
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('codex_execute', {
        code: 'console.log("Hello, World!");',
        language: 'javascript'
      });
    });
    
    expect(screen.getByText('Hello, World!')).toBeInTheDocument();
  });

  it('manages Docker containers', async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValue({ 
      container_id: 'test_container',
      status: 'running' 
    });
    
    render(<App />);
    
    const dockerTab = screen.getByTestId('docker-tab');
    await user.click(dockerTab);
    
    const createButton = screen.getByTestId('create-container');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('docker_manage', {
        action: 'create',
        image: expect.any(String)
      });
    });
  });

  it('displays agent list correctly', async () => {
    mockInvoke.mockResolvedValue([
      { id: 'agent_1', type: 'researcher', status: 'active' },
      { id: 'agent_2', type: 'coder', status: 'idle' }
    ]);
    
    render(<App />);
    
    const agentsTab = screen.getByTestId('agents-tab');
    fireEvent.click(agentsTab);
    
    await waitFor(() => {
      expect(screen.getByText('researcher')).toBeInTheDocument();
      expect(screen.getByText('coder')).toBeInTheDocument();
    });
  });

  it('handles real-time updates', async () => {
    const mockListen = vi.fn();
    vi.mock('@tauri-apps/api/event', () => ({
      listen: mockListen,
    }));
    
    mockListen.mockImplementation((_event, callback) => {
      // Simulate event
      setTimeout(() => {
        callback({ payload: { type: 'agent_update', data: { status: 'completed' } } });
      }, 100);
      return Promise.resolve(() => {}); // Return unsubscribe function
    });
    
    render(<App />);
    
    await waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith('swarm_update', expect.any(Function));
    });
  });

  it('persists user preferences', async () => {
    const user = userEvent.setup();
    
    render(<App />);
    
    const settingsButton = screen.getByTestId('settings-button');
    await user.click(settingsButton);
    
    const themeToggle = screen.getByTestId('theme-toggle');
    await user.click(themeToggle);
    
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('validates form inputs', async () => {
    const user = userEvent.setup();
    
    render(<App />);
    
    screen.getByTestId('config-form'); // Check form exists
    const submitButton = screen.getByTestId('submit-config');
    
    await user.click(submitButton);
    
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });

  it('handles keyboard shortcuts', async () => {
    const user = userEvent.setup();
    
    render(<App />);
    
    // Test Ctrl+K for command palette
    await user.keyboard('{Control>}k{/Control}');
    
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
  });
});