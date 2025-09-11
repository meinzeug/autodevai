import { z } from 'zod';

export const taskSchema = z.object({
  description: z.string().min(1, 'Task description is required'),
  mode: z.enum(['single', 'dual']),
  tool: z.enum(['claude-flow', 'openai-codex']).optional(),
});

export const settingsSchema = z.object({
  default_mode: z.enum(['single', 'dual']),
  default_tool: z.string(),
  openrouter_key: z.string().optional(),
  docker_enabled: z.boolean(),
  auto_quality_check: z.boolean(),
});

export const claudeFlowArgsSchema = z.object({
  command: z.enum(['swarm', 'sparc', 'hive-mind', 'memory']),
  args: z.string(),
});

export function validateTask(data: unknown) {
  return taskSchema.safeParse(data);
}

export function validateSettings(data: unknown) {
  return settingsSchema.safeParse(data);
}

export function validateClaudeFlowArgs(data: unknown) {
  return claudeFlowArgsSchema.safeParse(data);
}