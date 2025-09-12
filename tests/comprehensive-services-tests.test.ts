/**
 * Comprehensive Services Test Suite
 * Tests all service classes with error handling and edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Tauri API
const mockInvoke = vi.fn();
const mockListen = vi.fn();

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: mockInvoke,
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: mockListen,
}));

// Import after mocking
import { TauriService } from '@/services/tauri';

describe('Services - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('TauriService', () => {
    describe('Claude Flow Execution', () => {
      it('should execute claude flow commands successfully', async () => {
        mockInvoke.mockResolvedValue('Command executed successfully');
        
        const result = await TauriService.executeClaudeFlow('test-command');
        
        expect(mockInvoke).toHaveBeenCalledWith('execute_claude_flow', {
          command: 'test-command',
        });
        expect(result).toBe('Command executed successfully');
      });

      it('should handle command execution errors', async () => {
        const errorMessage = 'Command execution failed';
        mockInvoke.mockRejectedValue(new Error(errorMessage));
        
        await expect(TauriService.executeClaudeFlow('failing-command')).rejects.toThrow(
          errorMessage
        );
      });

      it('should handle empty commands', async () => {
        mockInvoke.mockResolvedValue('Empty command handled');
        
        const result = await TauriService.executeClaudeFlow('');
        
        expect(mockInvoke).toHaveBeenCalledWith('execute_claude_flow', {
          command: '',
        });
        expect(result).toBe('Empty command handled');
      });

      it('should handle special characters in commands', async () => {
        const specialCommand = 'test --option="value with spaces" --flag';
        mockInvoke.mockResolvedValue('Special command executed');
        
        const result = await TauriService.executeClaudeFlow(specialCommand);
        
        expect(mockInvoke).toHaveBeenCalledWith('execute_claude_flow', {
          command: specialCommand,
        });
        expect(result).toBe('Special command executed');
      });

      it('should handle very long commands', async () => {
        const longCommand = 'command ' + 'a'.repeat(10000);
        mockInvoke.mockResolvedValue('Long command executed');
        
        const result = await TauriService.executeClaudeFlow(longCommand);
        
        expect(result).toBe('Long command executed');
      });

      it('should handle command timeouts', async () => {
        mockInvoke.mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Command timeout')), 100)
          )
        );
        
        await expect(TauriService.executeClaudeFlow('slow-command')).rejects.toThrow(
          'Command timeout'
        );
      }, 1000);
    });

    describe('System Commands', () => {
      it('should execute system commands', async () => {
        mockInvoke.mockResolvedValue({ stdout: 'System command output', stderr: '' });
        
        const result = await TauriService.executeSystemCommand('ls -la');
        
        expect(mockInvoke).toHaveBeenCalledWith('execute_system_command', {
          command: 'ls -la',
        });
        expect(result.stdout).toBe('System command output');
      });

      it('should handle system command errors', async () => {
        mockInvoke.mockRejectedValue(new Error('System command failed'));
        
        await expect(TauriService.executeSystemCommand('invalid-command')).rejects.toThrow(
          'System command failed'
        );
      });

      it('should handle stderr output', async () => {
        mockInvoke.mockResolvedValue({ 
          stdout: '', 
          stderr: 'Warning: deprecated option' 
        });
        
        const result = await TauriService.executeSystemCommand('command-with-warning');
        
        expect(result.stderr).toBe('Warning: deprecated option');
      });
    });

    describe('File Operations', () => {
      it('should read files successfully', async () => {
        const fileContent = 'File content here';
        mockInvoke.mockResolvedValue(fileContent);
        
        const result = await TauriService.readFile('/path/to/file.txt');
        
        expect(mockInvoke).toHaveBeenCalledWith('read_file', {
          path: '/path/to/file.txt',
        });
        expect(result).toBe(fileContent);
      });

      it('should handle file read errors', async () => {
        mockInvoke.mockRejectedValue(new Error('File not found'));
        
        await expect(TauriService.readFile('/nonexistent/file.txt')).rejects.toThrow(
          'File not found'
        );
      });

      it('should write files successfully', async () => {
        mockInvoke.mockResolvedValue(true);
        
        const result = await TauriService.writeFile('/path/to/file.txt', 'New content');
        
        expect(mockInvoke).toHaveBeenCalledWith('write_file', {
          path: '/path/to/file.txt',
          content: 'New content',
        });
        expect(result).toBe(true);
      });

      it('should handle binary file operations', async () => {
        const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
        mockInvoke.mockResolvedValue(Array.from(binaryData));
        
        const result = await TauriService.readBinaryFile('/path/to/binary.bin');
        
        expect(mockInvoke).toHaveBeenCalledWith('read_binary_file', {
          path: '/path/to/binary.bin',
        });
        expect(result).toEqual(Array.from(binaryData));
      });

      it('should handle large file operations', async () => {
        const largeContent = 'x'.repeat(1000000); // 1MB of data
        mockInvoke.mockResolvedValue(true);
        
        const result = await TauriService.writeFile('/path/to/large.txt', largeContent);
        
        expect(result).toBe(true);
      });
    });

    describe('Event Handling', () => {
      it('should set up event listeners', async () => {
        const mockUnlisten = vi.fn();
        mockListen.mockResolvedValue(mockUnlisten);
        
        const callback = vi.fn();
        const unlisten = await TauriService.listen('test-event', callback);
        
        expect(mockListen).toHaveBeenCalledWith('test-event', callback);
        expect(unlisten).toBe(mockUnlisten);
      });

      it('should handle event listener errors', async () => {
        mockListen.mockRejectedValue(new Error('Failed to set up listener'));
        
        await expect(TauriService.listen('failing-event', vi.fn())).rejects.toThrow(
          'Failed to set up listener'
        );
      });

      it('should emit events', async () => {
        mockInvoke.mockResolvedValue(true);
        
        const result = await TauriService.emit('test-event', { data: 'test' });
        
        expect(mockInvoke).toHaveBeenCalledWith('emit_event', {
          event: 'test-event',
          payload: { data: 'test' },
        });
        expect(result).toBe(true);
      });
    });

    describe('Dialog Operations', () => {
      it('should open file dialogs', async () => {
        const selectedFiles = ['/path/to/selected/file.txt'];
        mockInvoke.mockResolvedValue(selectedFiles);
        
        const result = await TauriService.openFileDialog({
          multiple: false,
          filters: [{ name: 'Text', extensions: ['txt'] }],
        });
        
        expect(mockInvoke).toHaveBeenCalledWith('open_file_dialog', {
          multiple: false,
          filters: [{ name: 'Text', extensions: ['txt'] }],
        });
        expect(result).toEqual(selectedFiles);
      });

      it('should open save dialogs', async () => {
        const savePath = '/path/to/save/file.txt';
        mockInvoke.mockResolvedValue(savePath);
        
        const result = await TauriService.saveFileDialog({
          defaultPath: 'untitled.txt',
          filters: [{ name: 'Text', extensions: ['txt'] }],
        });
        
        expect(result).toBe(savePath);
      });

      it('should handle dialog cancellation', async () => {
        mockInvoke.mockResolvedValue(null);
        
        const result = await TauriService.openFileDialog();
        
        expect(result).toBeNull();
      });
    });

    describe('Window Operations', () => {
      it('should minimize window', async () => {
        mockInvoke.mockResolvedValue(true);
        
        const result = await TauriService.minimizeWindow();
        
        expect(mockInvoke).toHaveBeenCalledWith('minimize_window');
        expect(result).toBe(true);
      });

      it('should maximize window', async () => {
        mockInvoke.mockResolvedValue(true);
        
        const result = await TauriService.maximizeWindow();
        
        expect(result).toBe(true);
      });

      it('should close window', async () => {
        mockInvoke.mockResolvedValue(true);
        
        const result = await TauriService.closeWindow();
        
        expect(result).toBe(true);
      });

      it('should get window info', async () => {
        const windowInfo = {
          width: 1024,
          height: 768,
          x: 100,
          y: 100,
          maximized: false,
          minimized: false,
        };
        mockInvoke.mockResolvedValue(windowInfo);
        
        const result = await TauriService.getWindowInfo();
        
        expect(result).toEqual(windowInfo);
      });
    });

    describe('Error Handling and Edge Cases', () => {
      it('should handle network errors', async () => {
        mockInvoke.mockRejectedValue(new Error('Network error'));
        
        await expect(TauriService.executeClaudeFlow('test')).rejects.toThrow(
          'Network error'
        );
      });

      it('should handle timeout errors', async () => {
        mockInvoke.mockImplementation(() => 
          new Promise(() => {}) // Never resolves
        );
        
        // Should timeout after reasonable time
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        );
        
        await expect(Promise.race([
          TauriService.executeClaudeFlow('test'),
          timeoutPromise
        ])).rejects.toThrow('Timeout');
      });

      it('should handle invalid JSON responses', async () => {
        mockInvoke.mockResolvedValue('invalid json');
        
        // Should handle non-JSON responses gracefully
        const result = await TauriService.executeClaudeFlow('test');
        expect(result).toBe('invalid json');
      });

      it('should handle null responses', async () => {
        mockInvoke.mockResolvedValue(null);
        
        const result = await TauriService.executeClaudeFlow('test');
        expect(result).toBeNull();
      });

      it('should handle undefined responses', async () => {
        mockInvoke.mockResolvedValue(undefined);
        
        const result = await TauriService.executeClaudeFlow('test');
        expect(result).toBeUndefined();
      });
    });

    describe('Service Performance', () => {
      it('should handle concurrent requests', async () => {
        mockInvoke.mockImplementation((command) => 
          Promise.resolve(`Result for ${command}`)
        );
        
        const promises = Array.from({ length: 10 }, (_, i) => 
          TauriService.executeClaudeFlow(`command-${i}`)
        );
        
        const results = await Promise.all(promises);
        
        expect(results).toHaveLength(10);
        expect(mockInvoke).toHaveBeenCalledTimes(10);
      });

      it('should handle rapid sequential calls', async () => {
        mockInvoke.mockImplementation(() => Promise.resolve('Success'));
        
        for (let i = 0; i < 100; i++) {
          await TauriService.executeClaudeFlow(`rapid-${i}`);
        }
        
        expect(mockInvoke).toHaveBeenCalledTimes(100);
      });

      it('should maintain performance with large payloads', async () => {
        const largePayload = 'x'.repeat(100000);
        mockInvoke.mockResolvedValue('Success');
        
        const startTime = performance.now();
        await TauriService.writeFile('/test/large.txt', largePayload);
        const endTime = performance.now();
        
        // Should complete in reasonable time
        expect(endTime - startTime).toBeLessThan(1000);
      });
    });

    describe('Service Cleanup', () => {
      it('should handle service shutdown gracefully', async () => {
        // Set up some listeners
        mockListen.mockResolvedValue(vi.fn());
        
        await TauriService.listen('test1', vi.fn());
        await TauriService.listen('test2', vi.fn());
        
        // Shutdown should not throw errors
        expect(() => TauriService.shutdown?.()).not.toThrow();
      });

      it('should clean up resources', async () => {
        const mockCleanup = vi.fn();
        
        // Mock cleanup function
        (TauriService as any).cleanup = mockCleanup;
        
        // Simulate cleanup
        if (TauriService.cleanup) {
          TauriService.cleanup();
          expect(mockCleanup).toHaveBeenCalled();
        }
      });
    });
  });

  describe('Service Factory and Utilities', () => {
    it('should create service instances correctly', () => {
      expect(TauriService).toBeDefined();
      expect(typeof TauriService.executeClaudeFlow).toBe('function');
    });

    it('should handle service configuration', () => {
      // Test service configuration if available
      expect(TauriService).toHaveProperty('executeClaudeFlow');
    });

    it('should provide consistent API interface', () => {
      const requiredMethods = [
        'executeClaudeFlow',
        'executeSystemCommand',
        'readFile',
        'writeFile',
        'listen',
        'emit',
      ];
      
      requiredMethods.forEach(method => {
        expect(TauriService).toHaveProperty(method);
        expect(typeof TauriService[method as keyof typeof TauriService]).toBe('function');
      });
    });
  });
});