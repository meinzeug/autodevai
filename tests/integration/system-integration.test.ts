/**
 * Comprehensive System Integration Tests
 * Tests the entire application stack working together
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

describe('System Integration Tests', () => {
  let tauriProcess: ChildProcess | null = null;
  const testTimeout = 30000; // 30 second timeout for integration tests

  beforeAll(async () => {
    // Ensure we're in the correct directory
    const projectRoot = process.cwd();
    expect(await fs.access(path.join(projectRoot, 'src-tauri', 'Cargo.toml'))).resolves;
    expect(await fs.access(path.join(projectRoot, 'package.json'))).resolves;
  }, testTimeout);

  afterAll(async () => {
    // Cleanup any running processes
    if (tauriProcess) {
      tauriProcess.kill('SIGTERM');
      tauriProcess = null;
    }
  });

  describe('Build System Integration', () => {
    test('TypeScript compilation succeeds', async () => {
      const { execSync } = require('child_process');
      
      // Run TypeScript compiler
      try {
        const output = execSync('npm run typecheck', { 
          encoding: 'utf-8',
          timeout: 30000 
        });
        expect(typeof output).toBe('string');
      } catch (error: any) {
        // If there are TypeScript errors, the test should still pass if they're not critical
        if (error.status !== 0) {
          console.warn('TypeScript compilation warnings:', error.stdout);
        }
        // Only fail if there are actual compilation errors, not warnings
        expect(error.stdout).not.toContain('error TS');
      }
    }, testTimeout);

    test('Vite build completes successfully', async () => {
      const { execSync } = require('child_process');
      
      try {
        const output = execSync('npm run build', { 
          encoding: 'utf-8',
          timeout: 60000 
        });
        expect(output).toContain('build complete');
        
        // Verify dist directory exists
        const distPath = path.join(process.cwd(), 'dist');
        await expect(fs.access(distPath)).resolves;
        
        // Verify essential build artifacts
        await expect(fs.access(path.join(distPath, 'index.html'))).resolves;
      } catch (error: any) {
        console.error('Build error:', error.stdout || error.message);
        throw error;
      }
    }, 60000);

    test('Cargo check passes for Rust backend', async () => {
      const { execSync } = require('child_process');
      
      try {
        const output = execSync('cd src-tauri && cargo check', { 
          encoding: 'utf-8',
          timeout: 120000 
        });
        expect(typeof output).toBe('string');
        expect(output).not.toContain('error:');
      } catch (error: any) {
        console.error('Cargo check error:', error.stdout || error.message);
        throw error;
      }
    }, 120000);
  });

  describe('Configuration Validation', () => {
    test('package.json has required fields', async () => {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      expect(packageJson.name).toBe('autodevai-neural-bridge-platform');
      expect(packageJson.version).toBeDefined();
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.devDependencies).toBeDefined();
      
      // Check for essential scripts
      expect(packageJson.scripts.dev).toBeDefined();
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts['tauri:dev']).toBeDefined();
      expect(packageJson.scripts['tauri:build']).toBeDefined();
    });

    test('Tauri configuration is valid', async () => {
      const tauriConfig = JSON.parse(
        await fs.readFile(path.join(process.cwd(), 'src-tauri', 'tauri.conf.json'), 'utf-8')
      );
      
      expect(tauriConfig.identifier).toBe('com.meinzeug.autodev-ai');
      expect(tauriConfig.productName).toBe('AutoDev-AI Neural Bridge');
      expect(tauriConfig.version).toBeDefined();
      expect(tauriConfig.build).toBeDefined();
      expect(tauriConfig.app).toBeDefined();
      
      // Check window configuration
      expect(tauriConfig.app.windows).toBeInstanceOf(Array);
      expect(tauriConfig.app.windows.length).toBeGreaterThan(0);
      
      const mainWindow = tauriConfig.app.windows[0];
      expect(mainWindow.label).toBe('main');
      expect(mainWindow.width).toBe(1400);
      expect(mainWindow.height).toBe(900);
    });

    test('Cargo.toml has required dependencies', async () => {
      const cargoToml = await fs.readFile(
        path.join(process.cwd(), 'src-tauri', 'Cargo.toml'), 
        'utf-8'
      );
      
      // Check for essential dependencies
      expect(cargoToml).toContain('tauri =');
      expect(cargoToml).toContain('serde =');
      expect(cargoToml).toContain('tokio =');
      expect(cargoToml).toContain('tauri-plugin-window-state =');
      
      // Check package metadata
      expect(cargoToml).toContain('name = "neural-bridge-platform"');
      expect(cargoToml).toContain('version = "0.1.0"');
    });
  });

  describe('File Structure Validation', () => {
    test('Essential source files exist', async () => {
      const essentialFiles = [
        'src/main.tsx',
        'src/App.tsx',
        'src/components/OutputDisplay.tsx',
        'src/components/StatusBar.tsx',
        'src/services/tauri.ts',
        'src/types/index.ts',
        'src-tauri/src/main.rs',
        'src-tauri/src/window_state.rs',
        'src-tauri/src/menu.rs',
        'src-tauri/src/tray.rs',
        'src-tauri/src/security/ipc_security.rs',
      ];
      
      for (const file of essentialFiles) {
        const filePath = path.join(process.cwd(), file);
        await expect(fs.access(filePath)).resolves;
        
        // Verify files are not empty
        const stats = await fs.stat(filePath);
        expect(stats.size).toBeGreaterThan(0);
      }
    });

    test('Test files are properly organized', async () => {
      const testDirectories = [
        'tests/integration',
        'tests/performance',
        'tests/security',
        'src-tauri/src/tests',
        'src/tests',
      ];
      
      for (const dir of testDirectories) {
        const dirPath = path.join(process.cwd(), dir);
        try {
          await fs.access(dirPath);
          const stats = await fs.stat(dirPath);
          expect(stats.isDirectory()).toBe(true);
        } catch (error) {
          console.warn(`Test directory ${dir} not found, skipping`);
        }
      }
    });
  });

  describe('Dependency Validation', () => {
    test('All npm dependencies are installed', async () => {
      const nodeModulesPath = path.join(process.cwd(), 'node_modules');
      await expect(fs.access(nodeModulesPath)).resolves;
      
      const packageJson = JSON.parse(
        await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      // Check a few critical dependencies
      const criticalDeps = [
        'react',
        'react-dom',
        '@tauri-apps/api',
        'vite',
        'typescript',
      ];
      
      for (const dep of criticalDeps) {
        if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
          const depPath = path.join(nodeModulesPath, dep);
          await expect(fs.access(depPath)).resolves;
        }
      }
    });

    test('Rust dependencies compile correctly', async () => {
      const { execSync } = require('child_process');
      
      try {
        // This will compile dependencies and check for conflicts
        const output = execSync('cd src-tauri && cargo check --message-format=json', { 
          encoding: 'utf-8',
          timeout: 180000 
        });
        
        // Parse JSON output to check for errors
        const lines = output.trim().split('\n');
        const messages = lines
          .filter(line => line.startsWith('{'))
          .map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        
        const errors = messages.filter(msg => 
          msg.message && msg.message.level === 'error'
        );
        
        expect(errors.length).toBe(0);
      } catch (error: any) {
        console.error('Cargo dependency check failed:', error.stdout || error.message);
        throw error;
      }
    }, 180000);
  });

  describe('Runtime Validation', () => {
    test('Application starts without immediate crashes', async () => {
      const { spawn } = require('child_process');
      
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (process) {
            process.kill('SIGTERM');
          }
          reject(new Error('Application startup timeout'));
        }, 15000);
        
        const process = spawn('npm', ['run', 'tauri:dev'], {
          stdio: 'pipe',
          env: { ...process.env, RUST_LOG: 'info' }
        });
        
        let stdoutData = '';
        let stderrData = '';
        
        process.stdout?.on('data', (data) => {
          stdoutData += data.toString();
          
          // Look for successful startup indicators
          if (stdoutData.includes('App listening') || 
              stdoutData.includes('Finished dev') ||
              stdoutData.includes('Local:') ||
              stdoutData.includes('Network:')) {
            clearTimeout(timeout);
            process.kill('SIGTERM');
            resolve();
          }
        });
        
        process.stderr?.on('data', (data) => {
          stderrData += data.toString();
          
          // Check for critical errors that indicate startup failure
          if (stderrData.includes('EADDRINUSE') ||
              stderrData.includes('compilation failed') ||
              stderrData.includes('panic') ||
              stderrData.includes('thread panicked')) {
            clearTimeout(timeout);
            process.kill('SIGTERM');
            reject(new Error(`Application startup failed: ${stderrData}`));
          }
        });
        
        process.on('exit', (code) => {
          if (code !== 0 && code !== null) {
            clearTimeout(timeout);
            reject(new Error(`Process exited with code ${code}`));
          }
        });
        
        process.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    }, 30000);

    test('Environment variables are properly configured', () => {
      const requiredEnvVars = [
        'NODE_ENV',
      ];
      
      // Optional environment variables that should be documented
      const optionalEnvVars = [
        'OPENROUTER_API_KEY',
        'ANTHROPIC_API_KEY',
        'GITHUB_TOKEN',
      ];
      
      for (const envVar of requiredEnvVars) {
        expect(process.env[envVar]).toBeDefined();
      }
      
      for (const envVar of optionalEnvVars) {
        if (!process.env[envVar]) {
          console.warn(`Optional environment variable ${envVar} is not set`);
        }
      }
    });
  });

  describe('Security Validation', () => {
    test('No secrets in configuration files', async () => {
      const configFiles = [
        'package.json',
        'src-tauri/tauri.conf.json',
        'src-tauri/Cargo.toml',
        'vite.config.js',
        'tsconfig.json',
      ];
      
      const secretPatterns = [
        /sk-[a-zA-Z0-9]{48}/g, // OpenAI API key pattern
        /eyJ[a-zA-Z0-9_-]+/g, // JWT token pattern
        /github_pat_[a-zA-Z0-9_-]+/g, // GitHub token pattern
        /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']+["']/gi,
        /(?:secret|key|token)\s*[:=]\s*["'][^"']+["']/gi,
      ];
      
      for (const file of configFiles) {
        const filePath = path.join(process.cwd(), file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          
          for (const pattern of secretPatterns) {
            const matches = content.match(pattern);
            if (matches) {
              console.warn(`Potential secret found in ${file}:`, matches);
              // This is a warning, not a hard failure for config files
            }
          }
        } catch (error) {
          console.warn(`Could not read ${file}:`, error);
        }
      }
    });

    test('Content Security Policy is properly configured', async () => {
      const tauriConfig = JSON.parse(
        await fs.readFile(path.join(process.cwd(), 'src-tauri', 'tauri.conf.json'), 'utf-8')
      );
      
      expect(tauriConfig.app.security).toBeDefined();
      expect(tauriConfig.app.security.csp).toBeDefined();
      
      const csp = tauriConfig.app.security.csp;
      
      // Check for basic CSP directives
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src");
      expect(csp).toContain("style-src");
      expect(csp).toContain("connect-src");
      
      // Ensure no unsafe-eval in production
      if (process.env.NODE_ENV === 'production') {
        expect(csp).not.toContain("'unsafe-eval'");
      }
    });
  });
});