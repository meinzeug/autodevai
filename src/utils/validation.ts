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

export function validateOpenRouterKey(key: string): boolean {
  return key.startsWith('sk-or-') && key.length > 20;
}

export function validateDockerName(name: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/.test(name);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validatePort(port: string | number): boolean {
  const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
  return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
}

export type TaskValidation = z.infer<typeof taskSchema>;
export type SettingsValidation = z.infer<typeof settingsSchema>;