/**
 * Test Repository utility for GitHub workflow integration tests
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export class TestRepository {
  private repoPath: string;
  private originalBranch: string = 'main';
  
  constructor(private repoName: string) {
    this.repoPath = path.join('/tmp', `test-repo-${repoName}-${Date.now()}`);
  }
  
  async setup(): Promise<void> {
    try {
      // Create test repository directory
      await fs.mkdir(this.repoPath, { recursive: true });
      
      // Initialize git repository
      await this.runGitCommand(['init']);
      
      // Set up basic git config for tests
      await this.runGitCommand(['config', 'user.email', 'test@example.com']);
      await this.runGitCommand(['config', 'user.name', 'Test User']);
      
      // Create initial commit
      await this.createFile('README.md', '# Test Repository\n\nThis is a test repository.');
      await this.createFile('package.json', JSON.stringify({
        name: 'test-repo',
        version: '1.0.0',
        dependencies: {
          'lodash': '4.17.20',
          'express': '4.18.0'
        }
      }, null, 2));
      
      await this.runGitCommand(['add', '.']);
      await this.runGitCommand(['commit', '-m', 'Initial commit']);
      
      console.log(`📋 Test repository created at: ${this.repoPath}`);
    } catch (error: any) {
      throw new Error(`Failed to setup test repository: ${error.message}`);
    }
  }
  
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.repoPath, { recursive: true, force: true });
      console.log('🧹 Test repository cleaned up');
    } catch (error: any) {
      console.warn(`Warning: Failed to cleanup test repository: ${error.message}`);
    }
  }
  
  async reset(): Promise<void> {
    try {
      // Reset to initial state
      await this.runGitCommand(['reset', '--hard', 'HEAD']);
      await this.runGitCommand(['clean', '-fd']);
      
      // Ensure we're on main branch
      await this.runGitCommand(['checkout', this.originalBranch]);
      
      // Remove any additional branches
      const branches = await this.getBranches();
      for (const branch of branches) {
        if (branch !== this.originalBranch && !branch.includes('*')) {
          await this.runGitCommand(['branch', '-D', branch.trim()]);
        }
      }
    } catch (error: any) {
      console.warn(`Warning: Failed to reset repository: ${error.message}`);
    }
  }
  
  async createFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.repoPath, filePath);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content);
  }
  
  async updateFile(filePath: string, content: string): Promise<void> {
    await this.createFile(filePath, content);
  }
  
  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.repoPath, filePath);
    try {
      await fs.unlink(fullPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
  
  async createBranch(branchName: string, baseBranch: string = 'main'): Promise<void> {
    await this.runGitCommand(['checkout', '-b', branchName, baseBranch]);
  }
  
  async switchBranch(branchName: string): Promise<void> {
    await this.runGitCommand(['checkout', branchName]);
  }
  
  async commitChanges(message: string): Promise<string> {
    await this.runGitCommand(['add', '.']);
    await this.runGitCommand(['commit', '-m', message]);
    
    const result = await this.runGitCommand(['rev-parse', 'HEAD']);
    return result.trim();
  }
  
  async createDependabotBranch(packageName: string, newVersion: string): Promise<string> {
    const branchName = `dependabot/npm_and_yarn/${packageName}-${newVersion}`;
    await this.createBranch(branchName);
    
    // Update package.json to simulate Dependabot update
    const packageJsonPath = path.join(this.repoPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    if (packageJson.dependencies[packageName]) {
      packageJson.dependencies[packageName] = newVersion;
    }
    
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    const commitSha = await this.commitChanges(`Bump ${packageName} from ${packageJson.dependencies[packageName]} to ${newVersion}`);
    
    return commitSha;
  }
  
  async createConflictingChanges(filePath: string, content1: string, content2: string): Promise<{
    branch1: string;
    branch2: string;
    commit1: string;
    commit2: string;
  }> {
    // Create first branch with changes
    const branch1 = 'feature/conflict-1';
    await this.createBranch(branch1);
    await this.updateFile(filePath, content1);
    const commit1 = await this.commitChanges('Add conflicting changes 1');
    
    // Switch back to main and create second branch
    await this.switchBranch('main');
    const branch2 = 'feature/conflict-2';
    await this.createBranch(branch2);
    await this.updateFile(filePath, content2);
    const commit2 = await this.commitChanges('Add conflicting changes 2');
    
    return { branch1, branch2, commit1, commit2 };
  }
  
  async mergeBranch(branchName: string, targetBranch: string = 'main'): Promise<{ success: boolean; conflicts?: string[] }> {
    try {
      await this.switchBranch(targetBranch);
      await this.runGitCommand(['merge', branchName]);
      return { success: true };
    } catch (error: any) {
      // Check if it's a merge conflict
      if (error.message.includes('CONFLICT')) {
        const conflicts = await this.getConflictingFiles();
        return { success: false, conflicts };
      }
      throw error;
    }
  }
  
  async getConflictingFiles(): Promise<string[]> {
    try {
      const result = await this.runGitCommand(['diff', '--name-only', '--diff-filter=U']);
      return result.split('\n').filter(line => line.trim() !== '');
    } catch {
      return [];
    }
  }
  
  async resolveConflicts(filePath: string, resolution: string): Promise<void> {
    await this.updateFile(filePath, resolution);
    await this.runGitCommand(['add', filePath]);
  }
  
  async completeMerge(message: string = 'Resolve merge conflicts'): Promise<string> {
    await this.runGitCommand(['commit', '-m', message]);
    const result = await this.runGitCommand(['rev-parse', 'HEAD']);
    return result.trim();
  }
  
  async getCommits(branchName: string = 'HEAD', limit: number = 10): Promise<any[]> {
    const result = await this.runGitCommand([
      'log',
      '--format=%H|%s|%an|%ae|%ad',
      '--date=iso',
      `-n${limit}`,
      branchName
    ]);
    
    return result.split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        const [hash, message, authorName, authorEmail, date] = line.split('|');
        return {
          hash,
          message,
          author: { name: authorName, email: authorEmail },
          date
        };
      });
  }
  
  async getBranches(): Promise<string[]> {
    const result = await this.runGitCommand(['branch']);
    return result.split('\n')
      .map(line => line.replace('*', '').trim())
      .filter(line => line !== '');
  }
  
  async getCurrentBranch(): Promise<string> {
    const result = await this.runGitCommand(['branch', '--show-current']);
    return result.trim();
  }
  
  async getFileContent(filePath: string): Promise<string> {
    const fullPath = path.join(this.repoPath, filePath);
    return await fs.readFile(fullPath, 'utf-8');
  }
  
  async fileExists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.repoPath, filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
  
  async getStatus(): Promise<{ staged: string[]; unstaged: string[]; untracked: string[] }> {
    const result = await this.runGitCommand(['status', '--porcelain']);
    const lines = result.split('\n').filter(line => line.trim() !== '');
    
    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];
    
    for (const line of lines) {
      const status = line.substring(0, 2);
      const file = line.substring(3);
      
      if (status.startsWith('?')) {
        untracked.push(file);
      } else if (status[0] !== ' ') {
        staged.push(file);
      } else if (status[1] !== ' ') {
        unstaged.push(file);
      }
    }
    
    return { staged, unstaged, untracked };
  }
  
  private async runGitCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('git', args, {
        cwd: this.repoPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Git command failed: ${args.join(' ')}\n${stderr}`));
        }
      });
      
      child.on('error', (error) => {
        reject(new Error(`Failed to spawn git command: ${error.message}`));
      });
    });
  }
  
  getRepoPath(): string {
    return this.repoPath;
  }
}
