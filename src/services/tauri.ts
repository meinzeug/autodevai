import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Command } from '@tauri-apps/plugin-shell';
import type {
  ExecutionOutput,
  ToolStatus,
  DockerContainer,
  SystemMetrics,
  ClaudeFlowCommand,
  ExecutionResult,
  PrerequisiteStatus,
  SystemInfo,
  Settings,
} from '../types';

export class TauriService {
  private static instance: TauriService;
  private outputListeners: ((output: ExecutionOutput) => void)[] = [];
  private statusListeners: ((status: ToolStatus[]) => void)[] = [];

  static getInstance(): TauriService {
    if (!TauriService.instance) {
      TauriService.instance = new TauriService();
    }
    return TauriService.instance;
  }

  async initialize(): Promise<void> {
    // Set up event listeners for real-time updates
    await this.setupEventListeners();

    // Initialize tool status monitoring
    await this.startToolMonitoring();
  }

  private async setupEventListeners(): Promise<void> {
    // Listen for execution output
    await listen('execution-output', event => {
      const output = event.payload as ExecutionOutput;
      this.outputListeners.forEach(listener => listener(output));
    });

    // Listen for tool status updates
    await listen('tool-status-update', event => {
      const status = event.payload as ToolStatus[];
      this.statusListeners.forEach(listener => listener(status));
    });
  }

  // Claude-Flow Integration
  async executeClaudeFlowCommand(command: ClaudeFlowCommand): Promise<string> {
    try {
      const result = await invoke('execute_claude_flow_command', {
        mode: command.mode,
        task: command.task,
        options: command.options,
      });
      return result as string;
    } catch (error) {
      throw new Error(`Claude-Flow execution failed: ${error}`);
    }
  }

  async getAvailableClaudeFlowModes(): Promise<string[]> {
    try {
      const modes = await invoke('get_claude_flow_modes');
      return modes as string[];
    } catch (error) {
      console.error('Failed to get Claude-Flow modes:', error);
      return [];
    }
  }

  // OpenAI Codex Integration
  async executeCodexCommand(prompt: string, mode: string): Promise<string> {
    try {
      const result = await invoke('execute_codex_command', {
        prompt,
        mode,
      });
      return result as string;
    } catch (error) {
      throw new Error(`Codex execution failed: ${error}`);
    }
  }

  // Docker Management
  async getDockerContainers(): Promise<DockerContainer[]> {
    try {
      const containers = await invoke('get_docker_containers');
      return containers as DockerContainer[];
    } catch (error) {
      console.error('Failed to get Docker containers:', error);
      return [];
    }
  }

  async createDockerSandbox(image: string, name: string): Promise<string> {
    try {
      const containerId = await invoke('create_docker_sandbox', {
        image,
        name,
      });
      return containerId as string;
    } catch (error) {
      throw new Error(`Failed to create Docker sandbox: ${error}`);
    }
  }

  async stopDockerContainer(containerId: string): Promise<void> {
    try {
      await invoke('stop_docker_container', { containerId });
    } catch (error) {
      throw new Error(`Failed to stop container: ${error}`);
    }
  }

  // Tool Status Management
  async getToolStatus(): Promise<ToolStatus[]> {
    try {
      const status = await invoke('get_tool_status');
      return status as ToolStatus[];
    } catch (error) {
      console.error('Failed to get tool status:', error);
      return [];
    }
  }

  private async startToolMonitoring(): Promise<void> {
    try {
      await invoke('start_tool_monitoring');
    } catch (error) {
      console.error('Failed to start tool monitoring:', error);
    }
  }

  // System Metrics
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const metrics = await invoke('get_system_metrics');
      return metrics as SystemMetrics;
    } catch (error) {
      console.error('Failed to get system metrics:', error);
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkActivity: 0,
        activeProcesses: 0,
      };
    }
  }

  // Command Execution
  async executeCommand(command: string, args: string[] = []): Promise<string> {
    try {
      const cmd = Command.create(command, args);
      const output = await cmd.execute();

      if (output.code !== 0) {
        throw new Error(`Command failed with code ${output.code}: ${output.stderr}`);
      }

      return output.stdout;
    } catch (error) {
      throw new Error(`Command execution failed: ${error}`);
    }
  }

  // Event Subscription
  onExecutionOutput(callback: (output: ExecutionOutput) => void): () => void {
    this.outputListeners.push(callback);
    return () => {
      const index = this.outputListeners.indexOf(callback);
      if (index > -1) {
        this.outputListeners.splice(index, 1);
      }
    };
  }

  onToolStatusUpdate(callback: (status: ToolStatus[]) => void): () => void {
    this.statusListeners.push(callback);
    return () => {
      const index = this.statusListeners.indexOf(callback);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  // File Operations
  async readFile(path: string): Promise<string> {
    try {
      const content = await invoke('read_file', { path });
      return content as string;
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    try {
      await invoke('write_file', { path, content });
    } catch (error) {
      throw new Error(`Failed to write file: ${error}`);
    }
  }

  // Process Management
  async killProcess(pid: number): Promise<void> {
    try {
      await invoke('kill_process', { pid });
    } catch (error) {
      throw new Error(`Failed to kill process: ${error}`);
    }
  }

  async getRunningProcesses(): Promise<Array<{ pid: number; name: string; cpuUsage: number }>> {
    try {
      const processes = await invoke('get_running_processes');
      return processes as Array<{ pid: number; name: string; cpuUsage: number }>;
    } catch (error) {
      console.error('Failed to get running processes:', error);
      return [];
    }
  }

  // Roadmap-specific service methods
  async executeClaudeFlow(command: string): Promise<ExecutionResult> {
    try {
      return await invoke('execute_claude_flow', { command });
    } catch (error) {
      throw new Error(`Claude Flow execution failed: ${error}`);
    }
  }

  async executeOpenAICodex(task: string, mode: string): Promise<ExecutionResult> {
    try {
      return await invoke('execute_openai_codex', { task, mode });
    } catch (error) {
      throw new Error(`OpenAI Codex execution failed: ${error}`);
    }
  }

  async orchestrateDualMode(task: string, openrouterKey: string): Promise<ExecutionResult> {
    try {
      return await invoke('orchestrate_dual_mode', { task, openrouterKey });
    } catch (error) {
      throw new Error(`Dual mode orchestration failed: ${error}`);
    }
  }

  async createSandbox(projectId: string): Promise<string> {
    try {
      return await invoke('create_sandbox', { projectId });
    } catch (error) {
      throw new Error(`Sandbox creation failed: ${error}`);
    }
  }

  async stopSandbox(projectId: string): Promise<string> {
    try {
      return await invoke('stop_sandbox', { projectId });
    } catch (error) {
      throw new Error(`Sandbox stop failed: ${error}`);
    }
  }

  async checkPrerequisites(): Promise<PrerequisiteStatus> {
    try {
      return await invoke('check_prerequisites');
    } catch (error) {
      console.error('Failed to check prerequisites:', error);
      return {
        claude_flow_ready: false,
        codex_ready: false,
        claude_code_ready: false,
        docker_ready: false,
      };
    }
  }

  async getSystemInfo(): Promise<SystemInfo> {
    try {
      return await invoke('get_system_info');
    } catch (error) {
      console.error('Failed to get system info:', error);
      return {
        os: 'unknown',
        kernel: 'unknown',
        memory_total: 0,
        memory_available: 0,
        disk_total: 0,
        disk_available: 0,
      };
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    try {
      await invoke('save_settings', { settings });
    } catch (error) {
      throw new Error(`Failed to save settings: ${error}`);
    }
  }

  async loadSettings(): Promise<Settings> {
    try {
      return await invoke('load_settings');
    } catch (error) {
      console.error('Failed to load settings:', error);
      return {
        default_mode: 'single',
        default_tool: 'claude-flow',
        docker_enabled: false,
        auto_quality_check: true,
      };
    }
  }
}

// Export additional service as requested in roadmap
export const TauriService2 = {
  async executeClaudeFlow(command: string): Promise<ExecutionResult> {
    return await invoke('execute_claude_flow', { command });
  },
  async executeOpenAICodex(task: string, mode: string): Promise<ExecutionResult> {
    return await invoke('execute_openai_codex', { task, mode });
  },
  async orchestrateDualMode(task: string, openrouterKey: string): Promise<ExecutionResult> {
    return await invoke('orchestrate_dual_mode', { task, openrouterKey });
  },
  async createSandbox(projectId: string): Promise<string> {
    return await invoke('create_sandbox', { projectId });
  },
  async stopSandbox(projectId: string): Promise<string> {
    return await invoke('stop_sandbox', { projectId });
  },
  async checkPrerequisites(): Promise<PrerequisiteStatus> {
    return await invoke('check_prerequisites');
  },
  async getSystemInfo(): Promise<SystemInfo> {
    return await invoke('get_system_info');
  },
  async saveSettings(settings: Settings): Promise<void> {
    return await invoke('save_settings', { settings });
  },
  async loadSettings(): Promise<Settings> {
    return await invoke('load_settings');
  },
};
