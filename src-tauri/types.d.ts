// Auto-generated Tauri command types
export interface ExecutionResult {
  success: boolean;
  output: string;
  tool_used: string;
  duration_ms: number;
}
export interface PrerequisiteStatus {
  claude_flow_ready: boolean;
  codex_ready: boolean;
  claude_code_ready: boolean;
  docker_ready: boolean;
}
export interface SystemInfo {
  os: string;
  kernel: string;
  memory_total: number;
  memory_available: number;
  disk_total: number;
  disk_available: number;
}
export interface Settings {
  default_mode: "Single" | "Dual";
  default_tool: string;
  openrouter_key?: string;
  docker_enabled: boolean;
  auto_quality_check: boolean;
}
