import { invoke } from '@tauri-apps/api/tauri';
import type {
  ExecutionResult,
  PrerequisiteStatus,
  SystemInfo,
  Settings,
} from '@/types';

export const TauriService = {
  async executeClaudeFlow(command: string): Promise<ExecutionResult> {
    return invoke('execute_claude_flow', { command });
  },

  async executeOpenAICodex(
    task: string,
    mode: string
  ): Promise<ExecutionResult> {
    return invoke('execute_openai_codex', { task, mode });
  },

  async orchestrateDualMode(
    task: string,
    openrouterKey: string
  ): Promise<ExecutionResult> {
    return invoke('orchestrate_dual_mode', { task, openrouterKey });
  },

  async createSandbox(projectId: string): Promise<string> {
    return invoke('create_sandbox', { projectId });
  },

  async stopSandbox(projectId: string): Promise<string> {
    return invoke('stop_sandbox', { projectId });
  },

  async checkPrerequisites(): Promise<PrerequisiteStatus> {
    return invoke('check_prerequisites');
  },

  async getSystemInfo(): Promise<SystemInfo> {
    return invoke('get_system_info');
  },

  async saveSettings(settings: Settings): Promise<void> {
    return invoke('save_settings', { settings });
  },

  async loadSettings(): Promise<Settings> {
    return invoke('load_settings');
  },
};