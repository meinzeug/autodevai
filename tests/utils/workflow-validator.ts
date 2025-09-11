/**
 * Workflow Validator utility for testing GitHub workflow configurations
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';

export class WorkflowValidator {
  private workflowDefinitions: Map<string, any> = new Map();
  private validationResults: Map<string, any> = new Map();
  
  async setup(): Promise<void> {
    // Load sample workflow definitions
    this.workflowDefinitions.set('ci-cd', {
      name: 'CI/CD Pipeline',
      on: {
        push: { branches: ['main'] },
        pull_request: { types: ['opened', 'synchronize', 'reopened'] }
      },
      jobs: {
        'build-and-test': {
          'runs-on': 'ubuntu-latest',
          steps: [
            { uses: 'actions/checkout@v4' },
            { name: 'Setup Node.js', uses: 'actions/setup-node@v4' },
            { name: 'Install dependencies', run: 'npm ci' },
            { name: 'Run tests', run: 'npm test' },
            { name: 'Build', run: 'npm run build' }
          ]
        },
        'security-scan': {
          'runs-on': 'ubuntu-latest',
          steps: [
            { uses: 'actions/checkout@v4' },
            { name: 'Run security audit', run: 'npm audit' }
          ]
        }
      }
    });
    
    this.workflowDefinitions.set('dependabot-automerge', {
      name: 'Dependabot Auto-merge',
      on: {
        pull_request: {
          types: ['opened', 'synchronize'],
          branches: ['main']
        }
      },
      jobs: {
        'auto-merge': {
          'runs-on': 'ubuntu-latest',
          if: '${{ github.actor == "dependabot[bot]" }}',
          steps: [
            { name: 'Wait for checks', run: 'sleep 30' },
            { name: 'Merge PR', run: 'gh pr merge --auto --squash' }
          ]
        }
      }
    });
    
    console.log('🔧 WorkflowValidator initialized');
  }
  
  async cleanup(): Promise<void> {
    this.reset();
    console.log('🧹 WorkflowValidator cleaned up');
  }
  
  reset(): void {
    this.validationResults.clear();
  }
  
  async validateWorkflow(workflowName: string): Promise<any> {
    const workflow = this.workflowDefinitions.get(workflowName);
    
    if (!workflow) {
      return {
        isValid: false,
        errors: ['Workflow file not found'],
        workflowName
      };
    }
    
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      workflowName,
      triggers: [],
      jobs: [],
      security: {
        hasSecurityScanning: false,
        hasDependencyChecks: false,
        hasSecretScanning: false
      },
      performance: {
        estimatedRuntime: 0,
        parallelJobs: 0,
        resourceUsage: 'low'
      }
    };
    
    // Validate triggers
    if (workflow.on) {
      validation.triggers = Object.keys(workflow.on);
      
      // Check for common trigger patterns
      if (!workflow.on.push && !workflow.on.pull_request) {
        validation.warnings.push('No push or pull_request triggers found');
      }
    } else {
      validation.errors.push('No triggers defined');
      validation.isValid = false;
    }
    
    // Validate jobs
    if (workflow.jobs) {
      validation.jobs = Object.keys(workflow.jobs);
      validation.performance.parallelJobs = validation.jobs.length;
      
      for (const [jobName, jobConfig] of Object.entries(workflow.jobs)) {
        // Check job configuration
        if (!jobConfig['runs-on']) {
          validation.errors.push(`Job '${jobName}' missing runs-on`);
          validation.isValid = false;
        }
        
        if (!jobConfig.steps || !Array.isArray(jobConfig.steps)) {
          validation.errors.push(`Job '${jobName}' missing steps`);
          validation.isValid = false;
        }
        
        // Analyze steps for security and performance
        if (jobConfig.steps) {
          for (const step of jobConfig.steps) {
            // Check for security scanning
            if (step.run && (
              step.run.includes('audit') ||
              step.run.includes('security') ||
              step.run.includes('vulnerability')
            )) {
              validation.security.hasSecurityScanning = true;
            }
            
            // Check for dependency management
            if (step.run && (
              step.run.includes('npm ci') ||
              step.run.includes('yarn install') ||
              step.run.includes('pip install')
            )) {
              validation.security.hasDependencyChecks = true;
            }
            
            // Estimate runtime based on common operations
            if (step.run) {
              if (step.run.includes('test')) {
                validation.performance.estimatedRuntime += 300; // 5 minutes
              } else if (step.run.includes('build')) {
                validation.performance.estimatedRuntime += 180; // 3 minutes
              } else if (step.run.includes('install') || step.run.includes('ci')) {
                validation.performance.estimatedRuntime += 120; // 2 minutes
              } else {
                validation.performance.estimatedRuntime += 30; // 30 seconds
              }
            }
          }
        }
      }
    } else {
      validation.errors.push('No jobs defined');
      validation.isValid = false;
    }
    
    // Performance assessment
    if (validation.performance.estimatedRuntime > 1800) { // 30 minutes
      validation.performance.resourceUsage = 'high';
      validation.warnings.push('Workflow runtime may exceed 30 minutes');
    } else if (validation.performance.estimatedRuntime > 600) { // 10 minutes
      validation.performance.resourceUsage = 'medium';
    }
    
    // Security assessment
    if (!validation.security.hasSecurityScanning) {
      validation.warnings.push('No security scanning detected');
    }
    
    this.validationResults.set(workflowName, validation);
    return validation;
  }
  
  async validateWebhookEndpoint(endpointUrl: string): Promise<any> {
    const validation = {
      isAccessible: false,
      responseTime: 0,
      statusCode: 0,
      error: null,
      endpoint: endpointUrl
    };
    
    try {
      const fetch = (await import('node-fetch')).default;
      const startTime = Date.now();
      
      const response = await fetch(endpointUrl.replace('/webhooks/github', '/health'), {
        method: 'GET',
        timeout: 5000
      });
      
      validation.responseTime = Date.now() - startTime;
      validation.statusCode = response.status;
      validation.isAccessible = response.ok;
      
    } catch (error: any) {
      validation.error = error.message;
      validation.isAccessible = false;
    }
    
    return validation;
  }
  
  async validateWorkflowSecurity(workflowName: string): Promise<any> {
    const workflow = this.workflowDefinitions.get(workflowName);
    
    if (!workflow) {
      return {
        isSecure: false,
        errors: ['Workflow not found']
      };
    }
    
    const securityValidation = {
      isSecure: true,
      errors: [],
      warnings: [],
      recommendations: [],
      securityScore: 100
    };
    
    // Check for security best practices
    if (workflow.jobs) {
      for (const [jobName, jobConfig] of Object.entries(workflow.jobs)) {
        // Check for hardcoded secrets
        const jobString = JSON.stringify(jobConfig);
        if (/['"][A-Za-z0-9+/]{20,}['"]/.test(jobString)) {
          securityValidation.errors.push(`Potential hardcoded secret in job '${jobName}'`);
          securityValidation.isSecure = false;
          securityValidation.securityScore -= 30;
        }
        
        // Check for unsafe shell operations
        if (jobConfig.steps) {
          for (const step of jobConfig.steps) {
            if (step.run) {
              // Check for dangerous commands
              const dangerousCommands = [
                'curl.*|.*sh',
                'wget.*|.*sh',
                'eval',
                '\$\{.*\}', // Variable expansion without quotes
                'rm -rf /',
                'sudo chmod 777'
              ];
              
              for (const dangerous of dangerousCommands) {
                if (new RegExp(dangerous).test(step.run)) {
                  securityValidation.warnings.push(
                    `Potentially unsafe command in job '${jobName}': ${dangerous}`
                  );
                  securityValidation.securityScore -= 10;
                }
              }
            }
            
            // Check action versions
            if (step.uses && !step.uses.includes('@')) {
              securityValidation.warnings.push(
                `Action '${step.uses}' should specify a version`
              );
              securityValidation.securityScore -= 5;
            }
          }
        }
        
        // Check permissions
        if (!jobConfig.permissions) {
          securityValidation.recommendations.push(
            `Consider adding explicit permissions to job '${jobName}'`
          );
        }
      }
    }
    
    // Check for security-specific jobs
    if (!workflow.jobs['security-scan'] && !workflow.jobs['audit']) {
      securityValidation.recommendations.push(
        'Consider adding a dedicated security scanning job'
      );
    }
    
    return securityValidation;
  }
  
  async validateWorkflowPerformance(workflowName: string): Promise<any> {
    const workflow = this.workflowDefinitions.get(workflowName);
    
    if (!workflow) {
      return {
        isOptimized: false,
        errors: ['Workflow not found']
      };
    }
    
    const performanceValidation = {
      isOptimized: true,
      estimatedRuntime: 0,
      parallelization: 0,
      resourceEfficiency: 'good',
      bottlenecks: [],
      optimizations: []
    };
    
    if (workflow.jobs) {
      const jobNames = Object.keys(workflow.jobs);
      performanceValidation.parallelization = jobNames.length;
      
      // Analyze job dependencies
      const dependencies = new Map();
      for (const [jobName, jobConfig] of Object.entries(workflow.jobs)) {
        if (jobConfig.needs) {
          dependencies.set(jobName, Array.isArray(jobConfig.needs) ? jobConfig.needs : [jobConfig.needs]);
        }
      }
      
      // Calculate critical path
      const criticalPath = this.calculateCriticalPath(workflow.jobs, dependencies);
      performanceValidation.estimatedRuntime = criticalPath.duration;
      
      if (criticalPath.duration > 1800) { // 30 minutes
        performanceValidation.bottlenecks.push('Workflow runtime exceeds 30 minutes');
        performanceValidation.isOptimized = false;
        performanceValidation.resourceEfficiency = 'poor';
      }
      
      // Check for optimization opportunities
      if (performanceValidation.parallelization < 2 && jobNames.length > 2) {
        performanceValidation.optimizations.push('Consider parallelizing independent jobs');
      }
      
      // Check for caching opportunities
      for (const [jobName, jobConfig] of Object.entries(workflow.jobs)) {
        let hasCache = false;
        if (jobConfig.steps) {
          for (const step of jobConfig.steps) {
            if (step.uses && step.uses.includes('cache')) {
              hasCache = true;
              break;
            }
          }
        }
        
        if (!hasCache && jobConfig.steps?.some(step => 
          step.run && (step.run.includes('npm install') || step.run.includes('yarn install'))
        )) {
          performanceValidation.optimizations.push(
            `Consider adding dependency caching to job '${jobName}'`
          );
        }
      }
    }
    
    return performanceValidation;
  }
  
  private calculateCriticalPath(jobs: any, dependencies: Map<string, string[]>): { duration: number; path: string[] } {
    const jobDurations = new Map();
    const visited = new Set();
    const path: string[] = [];
    let maxDuration = 0;
    
    // Estimate duration for each job
    for (const [jobName, jobConfig] of Object.entries(jobs)) {
      let duration = 60; // Base 1 minute
      
      if (jobConfig.steps) {
        for (const step of jobConfig.steps) {
          if (step.run) {
            if (step.run.includes('test')) duration += 300;
            else if (step.run.includes('build')) duration += 180;
            else if (step.run.includes('install')) duration += 120;
            else duration += 30;
          }
        }
      }
      
      jobDurations.set(jobName, duration);
    }
    
    // Find the longest path considering dependencies
    function findLongestPath(jobName: string, currentDuration: number, currentPath: string[]): void {
      if (visited.has(jobName)) return;
      visited.add(jobName);
      
      const jobDuration = jobDurations.get(jobName) || 60;
      const totalDuration = currentDuration + jobDuration;
      const newPath = [...currentPath, jobName];
      
      if (totalDuration > maxDuration) {
        maxDuration = totalDuration;
        path.splice(0, path.length, ...newPath);
      }
      
      // Check jobs that depend on this one
      for (const [otherJob, deps] of dependencies.entries()) {
        if (deps.includes(jobName)) {
          findLongestPath(otherJob, totalDuration, newPath);
        }
      }
    }
    
    // Start from jobs with no dependencies
    for (const jobName of Object.keys(jobs)) {
      if (!dependencies.has(jobName) || dependencies.get(jobName).length === 0) {
        findLongestPath(jobName, 0, []);
        visited.clear();
      }
    }
    
    return { duration: maxDuration, path };
  }
  
  getValidationResults(): Map<string, any> {
    return this.validationResults;
  }
  
  async generateValidationReport(): Promise<any> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalWorkflows: this.validationResults.size,
        validWorkflows: 0,
        invalidWorkflows: 0,
        averageSecurityScore: 0,
        averageRuntime: 0
      },
      workflows: [],
      recommendations: []
    };
    
    let totalSecurityScore = 0;
    let totalRuntime = 0;
    
    for (const [name, validation] of this.validationResults.entries()) {
      if (validation.isValid) {
        report.summary.validWorkflows++;
      } else {
        report.summary.invalidWorkflows++;
      }
      
      // Get additional validations
      const securityValidation = await this.validateWorkflowSecurity(name);
      const performanceValidation = await this.validateWorkflowPerformance(name);
      
      totalSecurityScore += securityValidation.securityScore || 0;
      totalRuntime += performanceValidation.estimatedRuntime || 0;
      
      report.workflows.push({
        name,
        ...validation,
        security: securityValidation,
        performance: performanceValidation
      });
      
      // Collect recommendations
      if (securityValidation.recommendations) {
        report.recommendations.push(...securityValidation.recommendations);
      }
      if (performanceValidation.optimizations) {
        report.recommendations.push(...performanceValidation.optimizations);
      }
    }
    
    report.summary.averageSecurityScore = totalSecurityScore / this.validationResults.size;
    report.summary.averageRuntime = totalRuntime / this.validationResults.size;
    
    return report;
  }
}
