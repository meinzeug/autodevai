/**
 * Mock Tauri API - tauri module
 */
import { vi } from 'vitest';

export const invoke = vi.fn();
export const convertFileSrc = vi.fn((filePath: string) => filePath);
export const transformCallback = vi.fn();

export default {
  invoke,
  convertFileSrc,
  transformCallback,
};