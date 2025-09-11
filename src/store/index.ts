import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Task,
  Settings,
  OrchestrationMode,
  Tool,
  CodexMode,
  ClaudeFlowCommand,
  PrerequisiteStatus,
  SystemInfo,
} from '@/types';

interface AppState {
  // Tasks
  tasks: Task[];
  currentTask: Task | null;
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'status'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  setCurrentTask: (task: Task | null) => void;

  // Settings
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;

  // UI State
  mode: OrchestrationMode;
  selectedTool: Tool;
  codexMode: CodexMode;
  claudeFlowCommand: ClaudeFlowCommand;
  claudeFlowArgs: string;
  isExecuting: boolean;
  output: string;

  setMode: (mode: OrchestrationMode) => void;
  setSelectedTool: (tool: Tool) => void;
  setCodexMode: (mode: CodexMode) => void;
  setClaudeFlowCommand: (command: ClaudeFlowCommand) => void;
  setClaudeFlowArgs: (args: string) => void;
  setIsExecuting: (executing: boolean) => void;
  setOutput: (output: string) => void;
  appendOutput: (output: string) => void;

  // System
  prerequisites: PrerequisiteStatus | null;
  systemInfo: SystemInfo | null;
  setPrerequisites: (status: PrerequisiteStatus) => void;
  setSystemInfo: (info: SystemInfo) => void;
}

export const useStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Tasks
        tasks: [],
        currentTask: null,
        addTask: (task) =>
          set((state) => ({
            tasks: [
              ...state.tasks,
              {
                ...task,
                id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
                status: 'pending',
              },
            ],
          })),
        updateTask: (id, updates) =>
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === id ? { ...task, ...updates } : task
            ),
          })),
        removeTask: (id) =>
          set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id),
          })),
        setCurrentTask: (task) => set({ currentTask: task }),

        // Settings
        settings: {
          default_mode: 'single',
          default_tool: 'claude-flow',
          docker_enabled: true,
          auto_quality_check: true,
        },
        updateSettings: (updates) =>
          set((state) => ({
            settings: { ...state.settings, ...updates },
          })),

        // UI State
        mode: 'single',
        selectedTool: 'claude-flow',
        codexMode: 'suggest',
        claudeFlowCommand: 'swarm',
        claudeFlowArgs: '',
        isExecuting: false,
        output: '',

        setMode: (mode) => set({ mode }),
        setSelectedTool: (tool) => set({ selectedTool: tool }),
        setCodexMode: (mode) => set({ codexMode: mode }),
        setClaudeFlowCommand: (command) => set({ claudeFlowCommand: command }),
        setClaudeFlowArgs: (args) => set({ claudeFlowArgs: args }),
        setIsExecuting: (executing) => set({ isExecuting: executing }),
        setOutput: (output) => set({ output }),
        appendOutput: (output) =>
          set((state) => ({ output: state.output + '\n' + output })),

        // System
        prerequisites: null,
        systemInfo: null,
        setPrerequisites: (status) => set({ prerequisites: status }),
        setSystemInfo: (info) => set({ systemInfo: info }),
      }),
      {
        name: 'autodev-ai-storage',
        partialize: (state) => ({
          settings: state.settings,
          tasks: state.tasks,
        }),
      }
    )
  )
);