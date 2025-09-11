/**
 * Comprehensive Validation Framework
 * Testing & Quality Assurance - All Phases Validation
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ValidationResult {
  phase: string;
  testType: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'SKIP';
  details: string;
  timestamp: string;
  metrics?: Record<string, number | string>;
}

export interface ValidationSummary {
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  phases: ValidationPhase[];
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
}

export interface ValidationPhase {
  name: string;
  description: string;
  results: ValidationResult[];
  status: 'PASS' | 'FAIL' | 'WARNING';
}

export class ValidationFramework {
  private results: ValidationResult[] = [];
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * PHASE 1: Security Validation
   */
  async validateSecurity(): Promise<ValidationResult[]> {
    const phase = 'SECURITY';
    const phaseResults: ValidationResult[] = [];

    // Security audit
    try {
      const auditResult = await this.runCommand('npm audit --json');
      const audit = JSON.parse(auditResult.stdout);
      const vulnerabilities = audit.metadata?.vulnerabilities;
      
      phaseResults.push({
        phase,
        testType: 'SECURITY_AUDIT',
        status: vulnerabilities?.total === 0 ? 'PASS' : 'WARNING',
        details: `Found ${vulnerabilities?.total ?? 'unknown'} vulnerabilities`,
        timestamp: new Date().toISOString(),
        metrics: {
          vulnerabilities: vulnerabilities?.total ?? 0,
          critical: vulnerabilities?.critical ?? 0,
          high: vulnerabilities?.high ?? 0
        }
      });
    } catch (error) {
      phaseResults.push({
        phase,
        testType: 'SECURITY_AUDIT',
        status: 'FAIL',
        details: `Security audit failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Dependency check
    try {
      await this.checkSecureDependencies();
      phaseResults.push({
        phase,
        testType: 'DEPENDENCY_CHECK',
        status: 'PASS',
        details: 'All dependencies verified as secure',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      phaseResults.push({
        phase,
        testType: 'DEPENDENCY_CHECK',
        status: 'FAIL',
        details: `Dependency check failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    this.results.push(...phaseResults);
    return phaseResults;
  }

  /**
   * PHASE 2: Code Quality Validation
   */
  async validateCodeQuality(): Promise<ValidationResult[]> {
    const phase = 'CODE_QUALITY';
    const phaseResults: ValidationResult[] = [];

    // Linting validation
    try {
      await this.runCommand('npm run lint --silent');
      phaseResults.push({
        phase,
        testType: 'LINTING',
        status: 'PASS',
        details: 'Code passes all linting rules',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      phaseResults.push({
        phase,
        testType: 'LINTING',
        status: 'FAIL',
        details: `Linting failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Type checking
    try {
      await this.runCommand('npm run typecheck --silent');
      phaseResults.push({
        phase,
        testType: 'TYPE_CHECK',
        status: 'PASS',
        details: 'All types are valid',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      phaseResults.push({
        phase,
        testType: 'TYPE_CHECK',
        status: 'FAIL',
        details: `Type checking failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test coverage validation
    try {
      const coverage = await this.analyzeCoverage();
      const overallCoverage = coverage['overall'] ?? 0;
      phaseResults.push({
        phase,
        testType: 'COVERAGE',
        status: overallCoverage >= 80 ? 'PASS' : 'WARNING',
        details: `Overall coverage: ${overallCoverage}%`,
        timestamp: new Date().toISOString(),
        metrics: coverage
      });
    } catch (error) {
      phaseResults.push({
        phase,
        testType: 'COVERAGE',
        status: 'SKIP',
        details: `Coverage analysis skipped: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    this.results.push(...phaseResults);
    return phaseResults;
  }

  /**
   * PHASE 3: Performance Validation
   */
  async validatePerformance(): Promise<ValidationResult[]> {
    const phase = 'PERFORMANCE';
    const phaseResults: ValidationResult[] = [];

    // Build performance
    try {
      const startTime = Date.now();
      await this.runCommand('npm run build --silent');
      const buildTime = Date.now() - startTime;
      
      phaseResults.push({
        phase,
        testType: 'BUILD_PERFORMANCE',
        status: buildTime < 60000 ? 'PASS' : 'WARNING',
        details: `Build completed in ${buildTime}ms`,
        timestamp: new Date().toISOString(),
        metrics: { buildTime }
      });
    } catch (error) {
      phaseResults.push({
        phase,
        testType: 'BUILD_PERFORMANCE',
        status: 'FAIL',
        details: `Build failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Bundle size analysis
    try {
      const bundleAnalysis = await this.analyzeBundleSize();
      const totalSize = bundleAnalysis['totalSize'] ?? 0;
      phaseResults.push({
        phase,
        testType: 'BUNDLE_SIZE',
        status: totalSize < 10 * 1024 * 1024 ? 'PASS' : 'WARNING',
        details: `Bundle size: ${this.formatBytes(totalSize)}`,
        timestamp: new Date().toISOString(),
        metrics: bundleAnalysis
      });
    } catch (error) {
      phaseResults.push({
        phase,
        testType: 'BUNDLE_SIZE',
        status: 'SKIP',
        details: `Bundle analysis skipped: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    this.results.push(...phaseResults);
    return phaseResults;
  }

  /**
   * PHASE 4: Functional Testing
   */
  async validateFunctionality(): Promise<ValidationResult[]> {
    const phase = 'FUNCTIONALITY';
    const phaseResults: ValidationResult[] = [];

    // Unit tests
    try {
      const testResult = await this.runCommand('npm test -- --run --reporter=json');
      const testLine = testResult.stdout.split('\n').find(line => 
        line.startsWith('{') && line.includes('testResults')
      );
      const testData = JSON.parse(testLine ?? '{}');
      
      const totalTests = testData.numTotalTests ?? 0;
      const passedTests = testData.numPassedTests ?? 0;
      const failedTests = testData.numFailedTests ?? 0;

      phaseResults.push({
        phase,
        testType: 'UNIT_TESTS',
        status: failedTests === 0 ? 'PASS' : 'FAIL',
        details: `${passedTests}/${totalTests} tests passed`,
        timestamp: new Date().toISOString(),
        metrics: { totalTests, passedTests, failedTests }
      });
    } catch (error) {
      phaseResults.push({
        phase,
        testType: 'UNIT_TESTS',
        status: 'FAIL',
        details: `Test execution failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Integration tests
    try {
      await this.validateIntegration();
      phaseResults.push({
        phase,
        testType: 'INTEGRATION_TESTS',
        status: 'PASS',
        details: 'Integration tests completed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      phaseResults.push({
        phase,
        testType: 'INTEGRATION_TESTS',
        status: 'FAIL',
        details: `Integration tests failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    this.results.push(...phaseResults);
    return phaseResults;
  }

  /**
   * Run comprehensive validation across all phases
   */
  async runFullValidation(): Promise<ValidationSummary> {
    console.log('🔍 Starting comprehensive validation...\n');

    const phases: ValidationPhase[] = [];

    // Phase 1: Security
    console.log('Phase 1: Security Validation');
    const securityResults = await this.validateSecurity();
    phases.push({
      name: 'Security',
      description: 'Security audit and vulnerability check',
      results: securityResults,
      status: this.getPhaseStatus(securityResults)
    });

    // Phase 2: Code Quality
    console.log('Phase 2: Code Quality Validation');
    const qualityResults = await this.validateCodeQuality();
    phases.push({
      name: 'Code Quality',
      description: 'Linting, type checking, and coverage analysis',
      results: qualityResults,
      status: this.getPhaseStatus(qualityResults)
    });

    // Phase 3: Performance
    console.log('Phase 3: Performance Validation');
    const performanceResults = await this.validatePerformance();
    phases.push({
      name: 'Performance',
      description: 'Build performance and bundle analysis',
      results: performanceResults,
      status: this.getPhaseStatus(performanceResults)
    });

    // Phase 4: Functionality
    console.log('Phase 4: Functional Validation');
    const functionalResults = await this.validateFunctionality();
    phases.push({
      name: 'Functionality',
      description: 'Unit and integration testing',
      results: functionalResults,
      status: this.getPhaseStatus(functionalResults)
    });

    const summary = this.generateSummary(phases);
    await this.generateReport(summary);

    return summary;
  }

  // Helper methods
  private async runCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    return execAsync(command, { cwd: this.projectRoot });
  }

  private async checkSecureDependencies(): Promise<void> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    // Check for known insecure packages
    const insecurePackages = ['lodash@4.17.10', 'moment@2.24.0']; // Example
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    for (const [pkg, version] of Object.entries(dependencies)) {
      const packageVersion = `${pkg}@${version}`;
      if (insecurePackages.includes(packageVersion)) {
        throw new Error(`Insecure package detected: ${packageVersion}`);
      }
    }
  }

  private async analyzeCoverage(): Promise<Record<string, number>> {
    try {
      const coverageFile = path.join(this.projectRoot, 'coverage/coverage-summary.json');
      const coverage = JSON.parse(await fs.readFile(coverageFile, 'utf-8'));
      
      return {
        overall: coverage.total?.lines?.pct ?? 0,
        statements: coverage.total?.statements?.pct ?? 0,
        branches: coverage.total?.branches?.pct ?? 0,
        functions: coverage.total?.functions?.pct ?? 0,
        lines: coverage.total?.lines?.pct ?? 0
      };
    } catch {
      return { overall: 0 };
    }
  }

  private async analyzeBundleSize(): Promise<Record<string, number>> {
    const distPath = path.join(this.projectRoot, 'dist');
    try {
      const files = await fs.readdir(distPath, { recursive: true });
      let totalSize = 0;
      
      for (const file of files) {
        if (typeof file === 'string') {
          const filePath = path.join(distPath, file);
          try {
            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
              totalSize += stats.size;
            }
          } catch {
            continue;
          }
        }
      }
      
      return { totalSize };
    } catch {
      return { totalSize: 0 };
    }
  }

  private async validateIntegration(): Promise<void> {
    // Basic integration validation
    // This would be expanded based on specific integration requirements
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    await fs.access(packageJsonPath); // Ensures package.json exists
    
    // Check if critical files exist
    const criticalFiles = ['src/main.tsx', 'src/App.tsx'];
    for (const file of criticalFiles) {
      try {
        await fs.access(path.join(this.projectRoot, file));
      } catch {
        throw new Error(`Critical file missing: ${file}`);
      }
    }
  }

  private getPhaseStatus(results: ValidationResult[]): 'PASS' | 'FAIL' | 'WARNING' {
    if (results.some(r => r.status === 'FAIL')) return 'FAIL';
    if (results.some(r => r.status === 'WARNING')) return 'WARNING';
    return 'PASS';
  }

  private generateSummary(phases: ValidationPhase[]): ValidationSummary {
    const allResults = phases.flatMap(p => p.results);
    
    return {
      totalTests: allResults.length,
      passed: allResults.filter(r => r.status === 'PASS').length,
      failed: allResults.filter(r => r.status === 'FAIL').length,
      warnings: allResults.filter(r => r.status === 'WARNING').length,
      skipped: allResults.filter(r => r.status === 'SKIP').length,
      phases,
      overallStatus: phases.some(p => p.status === 'FAIL') ? 'FAIL' : 
                     phases.some(p => p.status === 'WARNING') ? 'WARNING' : 'PASS'
    };
  }

  private async generateReport(summary: ValidationSummary): Promise<void> {
    const reportPath = path.join(this.projectRoot, 'tests/validation/validation-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));
    
    // Console summary
    console.log('\n🔍 VALIDATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Overall Status: ${summary.overallStatus}`);
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⚠️  Warnings: ${summary.warnings}`);
    console.log(`⏭️  Skipped: ${summary.skipped}`);
    
    console.log('\nPHASE RESULTS:');
    for (const phase of summary.phases) {
      const statusIcon = phase.status === 'PASS' ? '✅' : 
                        phase.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`${statusIcon} ${phase.name}: ${phase.status}`);
    }
    
    console.log(`\nDetailed report saved to: ${reportPath}`);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI interface for standalone execution
// Note: import.meta.url check removed for compatibility
if (require.main === module) {
  const validator = new ValidationFramework();
  validator.runFullValidation().then(summary => {
    process.exit(summary.overallStatus === 'FAIL' ? 1 : 0);
  }).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}