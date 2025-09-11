/**
 * Mock Tauri API - shell module
 */
import { vi } from 'vitest';

export class Command {
  constructor(public program: string, public args?: string[]) {}
  
  execute = vi.fn(() => Promise.resolve({
    code: 0,
    stdout: '',
    stderr: '',
  }));

  spawn = vi.fn();
  kill = vi.fn();
}

export const open = vi.fn();
export default {
  Command,
  open,
};