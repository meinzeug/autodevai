/**
 * Security Scanner utility for testing security workflows
 */

import fs from 'fs/promises';
import path from 'path';

export class SecurityScanner {
  private scanResults: any = null;
  private failureMode: string | null = null;
  private auditEvents: any[] = [];
  private scheduledEvents: any[] = [];
  
  async setup(): Promise<void> {
    console.log('🔒 SecurityScanner initialized');
  }
  
  async cleanup(): Promise<void> {
    this.reset();
    console.log('🧹 SecurityScanner cleaned up');
  }
  
  reset(): void {
    this.scanResults = null;
    this.failureMode = null;
    this.auditEvents = [];
    this.scheduledEvents = [];
  }
  
  async scanRepository(repoPath: string): Promise<any> {
    if (this.failureMode) {
      throw new Error(this.failureMode);
    }
    
    // Simulate repository security scan
    const packageJsonPath = path.join(repoPath, 'package.json');
    let vulnerabilities: any[] = [];
    
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      // Check for known vulnerable packages
      const vulnerablePackages = {
        'lodash': {
          '4.17.19': { vulnerability: 'CVE-2021-23337', severity: 'high' },
          '4.17.20': { vulnerability: 'CVE-2021-23337', severity: 'high' }
        },
        'axios': {
          '0.21.0': { vulnerability: 'CVE-2021-3749', severity: 'medium' },
          '0.21.1': { vulnerability: 'CVE-2021-3749', severity: 'medium' }
        },
        'node-fetch': {
          '2.6.0': { vulnerability: 'CVE-2022-0235', severity: 'high' },
          '2.6.1': { vulnerability: 'CVE-2022-0235', severity: 'high' }
        }
      };
      
      for (const [pkg, version] of Object.entries(packageJson.dependencies || {})) {
        if (vulnerablePackages[pkg]?.[version]) {
          vulnerabilities.push({
            package: pkg,
            version,
            ...vulnerablePackages[pkg][version],
            fixAvailable: true,
            recommendedVersion: this.getRecommendedVersion(pkg)
          });
        }
      }
      
    } catch (error: any) {
      console.warn(`Could not scan package.json: ${error.message}`);
    }
    
    const results = {
      vulnerabilities,
      scanTime: new Date().toISOString(),
      scanType: 'dependency'
    };
    
    this.scanResults = results;
    this.recordAuditEvent({
      action: 'repository_scan_completed',
      vulnerabilities: vulnerabilities.length,
      timestamp: new Date().toISOString()
    });
    
    return results;
  }
  
  async scanCode(repoPath: string): Promise<any> {
    if (this.failureMode) {
      throw new Error(this.failureMode);
    }
    
    // Simulate static code analysis
    const codeIssues: any[] = [];
    
    try {
      // Scan for security anti-patterns in JavaScript files
      const jsFiles = await this.findJavaScriptFiles(repoPath);
      
      for (const filePath of jsFiles) {
        const content = await fs.readFile(filePath, 'utf-8');
        const issues = this.analyzeCodeSecurity(content, filePath);
        codeIssues.push(...issues);
      }
      
    } catch (error: any) {
      console.warn(`Code scan error: ${error.message}`);
    }
    
    const results = {
      codeIssues,
      scanTime: new Date().toISOString(),
      scanType: 'static_analysis'
    };
    
    this.recordAuditEvent({
      action: 'code_scan_completed',
      issues: codeIssues.length,
      timestamp: new Date().toISOString()
    });
    
    return results;
  }
  
  private async findJavaScriptFiles(repoPath: string): Promise<string[]> {
    const files: string[] = [];
    
    async function scanDirectory(dir: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }
    
    await scanDirectory(repoPath);
    return files;
  }
  
  private analyzeCodeSecurity(content: string, filePath: string): any[] {
    const issues: any[] = [];
    const lines = content.split('\n');
    
    // Security patterns to detect
    const securityPatterns = [
      {
        pattern: /eval\s*\(/,
        severity: 'critical',
        description: 'Use of eval() can lead to code injection vulnerabilities',
        type: 'code_injection'
      },
      {
        pattern: /document\.innerHTML\s*=/,
        severity: 'high',
        description: 'Direct innerHTML assignment can lead to XSS vulnerabilities',
        type: 'xss_vulnerability'
      },
      {
        pattern: /const\s+\w*[Pp]assword\s*=\s*['"][^'"]+['"]/,
        severity: 'critical',
        description: 'Hardcoded password detected',
        type: 'hardcoded_credential'
      },
      {
        pattern: /const\s+\w*[Aa]pi[Kk]ey\s*=\s*['"][^'"]+['"]/,
        severity: 'high',
        description: 'Hardcoded API key detected',
        type: 'hardcoded_credential'
      },
      {
        pattern: /process\.env\.[A-Z_]+\s*\|\|\s*['"][^'"]+['"]/,
        severity: 'medium',
        description: 'Fallback credential or secret detected',
        type: 'credential_fallback'
      },
      {
        pattern: /\$\{[^}]*\}/,
        severity: 'medium',
        description: 'Template literal injection risk',
        type: 'template_injection'
      }
    ];
    
    lines.forEach((line, lineNumber) => {
      securityPatterns.forEach(pattern => {
        if (pattern.pattern.test(line)) {
          issues.push({
            file: filePath,
            line: lineNumber + 1,
            severity: pattern.severity,
            description: pattern.description,
            type: pattern.type,
            code: line.trim(),
            recommendation: this.getSecurityRecommendation(pattern.type)
          });
        }
      });
    });
    
    return issues;
  }
  
  private getSecurityRecommendation(issueType: string): string {
    const recommendations = {
      'code_injection': 'Avoid using eval(). Use JSON.parse() for parsing JSON or implement a safer alternative.',
      'xss_vulnerability': 'Use textContent instead of innerHTML, or sanitize content with a trusted library.',
      'hardcoded_credential': 'Move credentials to environment variables or a secure configuration management system.',
      'credential_fallback': 'Remove fallback values for sensitive data. Fail securely if environment variables are not set.',
      'template_injection': 'Validate and sanitize template variables to prevent injection attacks.'
    };
    
    return recommendations[issueType] || 'Review this code for potential security implications.';
  }
  
  private getRecommendedVersion(packageName: string): string {
    const recommendations = {
      'lodash': '4.17.21',
      'axios': '0.21.2',
      'node-fetch': '2.6.7'
    };
    
    return recommendations[packageName] || 'latest';
  }
  
  mockScanResults(results: any): void {
    this.scanResults = results;
  }
  
  getScanResults(): any {
    return this.scanResults;
  }
  
  simulateFailure(errorMessage: string): void {
    this.failureMode = errorMessage;
  }
  
  clearFailure(): void {
    this.failureMode = null;
  }
  
  recordAuditEvent(event: any): void {
    this.auditEvents.push({
      ...event,
      id: this.auditEvents.length + 1,
      timestamp: event.timestamp || new Date().toISOString()
    });
  }
  
  getAuditEvents(): any[] {
    return this.auditEvents;
  }
  
  getAuditSummary(): any {
    const summary = {
      vulnerabilities_detected: 0,
      auto_fixes_applied: 0,
      manual_reviews_requested: 0,
      vulnerabilities_resolved: 0,
      code_issues_found: 0,
      scans_performed: 0
    };
    
    this.auditEvents.forEach(event => {
      switch (event.action) {
        case 'vulnerability_detected':
          summary.vulnerabilities_detected++;
          break;
        case 'auto_fix_applied':
          summary.auto_fixes_applied++;
          break;
        case 'security_review_requested':
          summary.manual_reviews_requested++;
          break;
        case 'vulnerability_resolved':
          summary.vulnerabilities_resolved++;
          break;
        case 'code_scan_completed':
          summary.code_issues_found += event.issues || 0;
          summary.scans_performed++;
          break;
        case 'repository_scan_completed':
          summary.vulnerabilities_detected += event.vulnerabilities || 0;
          summary.scans_performed++;
          break;
      }
    });
    
    return summary;
  }
  
  scheduleEvent(event: any): void {
    this.scheduledEvents.push({
      ...event,
      id: this.scheduledEvents.length + 1,
      scheduledAt: new Date().toISOString()
    });
  }
  
  getScheduledEvents(): any[] {
    return this.scheduledEvents;
  }
  
  async generateComplianceReport(): Promise<any> {
    const auditSummary = this.getAuditSummary();
    
    const report = {
      reportDate: new Date().toISOString(),
      compliance: {
        status: 'COMPLIANT',
        score: 85,
        requirements: {
          securityScanFrequency: {
            requirement: 'Daily scans',
            status: 'MET',
            lastScan: new Date().toISOString()
          },
          vulnerabilityResponseTime: {
            requirement: '24h response time',
            status: 'MET',
            averageResponseTime: '6h'
          },
          criticalVulnerabilityResponseTime: {
            requirement: '4h response time',
            status: 'MET',
            averageResponseTime: '2h'
          }
        }
      },
      metrics: auditSummary,
      recommendations: [
        'Continue regular security scans',
        'Maintain rapid response times',
        'Consider implementing additional static analysis tools'
      ]
    };
    
    this.recordAuditEvent({
      action: 'compliance_report_generated',
      compliance_score: report.compliance.score
    });
    
    return report;
  }
}
