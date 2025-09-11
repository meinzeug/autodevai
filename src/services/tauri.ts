import type {
  ExecutionResult,
  PrerequisiteStatus,
  SystemInfo,
  Settings,
} from '@/types';

// Environment detection
const isTauriEnvironment = () => {
  return typeof window !== 'undefined' && (window as any).__TAURI__;
};

// Lazy import of invoke to avoid errors in browser environment
let invoke: any = null;

const getInvoke = async () => {
  if (!invoke && isTauriEnvironment()) {
    try {
      const tauriCore = await import('@tauri-apps/api/core');
      invoke = tauriCore.invoke;
    } catch (error) {
      console.warn('Tauri API not available:', error);
    }
  }
  return invoke;
};

class TauriServiceClass {
  private static instance: TauriServiceClass;

  static getInstance(): TauriServiceClass {
    if (!TauriServiceClass.instance) {
      TauriServiceClass.instance = new TauriServiceClass();
    }
    return TauriServiceClass.instance;
  }

  private constructor() {}


  async executeClaudeFlow(command: string): Promise<ExecutionResult> {
    const tauriInvoke = await getInvoke();
    if (!tauriInvoke) {
      // Browser fallback - simulate execution result
      return {
        success: false,
        output: 'This would execute Claude Flow command: ' + command,
        timestamp: new Date().toISOString()
      };
    }
    return tauriInvoke('execute_claude_flow', { command });
  }

  async executeOpenAICodex(
    task: string,
    mode: string
  ): Promise<ExecutionResult> {
    const tauriInvoke = await getInvoke();
    if (!tauriInvoke) {
      return {
        success: false,
        output: `This would execute OpenAI Codex task: ${task} in mode: ${mode}`,
        timestamp: new Date().toISOString()
      };
    }
    return tauriInvoke('execute_openai_codex', { task, mode });
  }

  async orchestrateDualMode(
    task: string,
    openrouter_key: string
  ): Promise<ExecutionResult> {
    const tauriInvoke = await getInvoke();
    if (!tauriInvoke) {
      return {
        success: false,
        output: `This would orchestrate dual mode task: ${task}`,
        timestamp: new Date().toISOString()
      };
    }
    return tauriInvoke('orchestrate_dual_mode', { task, openrouter_key });
  }

  async createSandbox(projectId: string): Promise<string> {
    const tauriInvoke = await getInvoke();
    if (!tauriInvoke) {
      return `Browser mode: Would create sandbox for project ${projectId}`;
    }
    return tauriInvoke('create_sandbox', { projectId });
  }

  async stopSandbox(projectId: string): Promise<string> {
    const tauriInvoke = await getInvoke();
    if (!tauriInvoke) {
      return `Browser mode: Would stop sandbox for project ${projectId}`;
    }
    return tauriInvoke('stop_sandbox', { projectId });
  }

  async checkPrerequisites(): Promise<PrerequisiteStatus> {
    const tauriInvoke = await getInvoke();
    if (!tauriInvoke) {
      // Browser fallback - return mock status
      return {
      };
    }
    return tauriInvoke('check_prerequisites');
  }

  async getSystemInfo(): Promise<SystemInfo> {
    const tauriInvoke = await getInvoke();
    if (!tauriInvoke) {
      // Browser fallback - return mock system info
      return {
        os: 'browser',
        version: '1.0.0',
        arch: navigator?.platform || 'unknown',
        nodeVersion: 'N/A',
        tauriVersion: 'N/A'
      };
    }
    return tauriInvoke('get_system_info');
  }

  async saveSettings(settings: Settings): Promise<void> {
    const tauriInvoke = await getInvoke();
    if (!tauriInvoke) {
      // Browser fallback - save to localStorage
      localStorage.setItem('autodev-ai-settings', JSON.stringify(settings));
      return;
    }
    return tauriInvoke('save_settings', { settings });
  }

  async loadSettings(): Promise<Settings> {
    const tauriInvoke = await getInvoke();
    if (!tauriInvoke) {
      // Browser fallback - load from localStorage
      const stored = localStorage.getItem('autodev-ai-settings');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (error) {
          console.warn('Failed to parse stored settings:', error);
        }
      }
      // Return default settings
      return {
        openrouter_key: '',
        claudeFlowPath: '',
        dockerEnabled: false,
        theme: 'dark'
      };
    }
    return tauriInvoke('load_settings');
  }

  async getAvailableClaudeFlowModes(): Promise<string[]> {
    const tauriInvoke = await getInvoke();
    if (!tauriInvoke) {
      // Browser fallback - return default modes
      console.info('Browser mode: Using default Claude Flow modes');
      return ['sparc', 'tdd', 'architect', 'refactor', 'test', 'integration'];
    }
    
    try {
      return await tauriInvoke('get_available_claude_flow_modes');
    } catch (error) {
      console.warn('Claude Flow modes not available:', error);
      return ['sparc', 'tdd', 'architect', 'refactor', 'test', 'integration'];
    }
  }

  async getDockerContainers(): Promise<any[]> {
    const tauriInvoke = await getInvoke();
    if (!tauriInvoke) {
      // Browser fallback - return mock containers
      console.info('Browser mode: Docker containers not available');
      return [];
    }
    
    try {
      return await tauriInvoke('get_docker_containers');
    } catch (error) {
      console.warn('Docker containers not available:', error);
      return [];
    }
  }

  async createDockerSandbox(image: string, name: string): Promise<string> {
    const tauriInvoke = await getInvoke();
    if (!tauriInvoke) {
      // Browser fallback - simulate sandbox creation
      const mockId = `browser-sandbox-${Date.now()}`;
      console.info(`Browser mode: Would create Docker sandbox ${name} with image ${image}`);
      return mockId;
    }
    
    try {
      return await tauriInvoke('create_docker_sandbox', { image, name });
    } catch (error) {
      console.error('Failed to create Docker sandbox:', error);
      throw error;
    }
  }
}

export const TauriService = TauriServiceClass.getInstance();