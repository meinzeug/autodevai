/**
 * Mock Tauri API - event module
 */
import { vi } from 'vitest';

export const listen = vi.fn(() => Promise.resolve(() => {}));
export const emit = vi.fn(() => Promise.resolve());
export const once = vi.fn(() => Promise.resolve());

export default {
  listen,
  emit,
  once,
};