/**
 * GitHub Security Workflow Integration Tests
 * Tests security-specific GitHub automation workflows
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { MockGitHubAPI } from '../mocks/github-api';
import { MockWebhookServer } from '../mocks/webhook-server';
import { TestRepository } from '../utils/test-repository';
import { SecurityScanner } from '../utils/security-scanner';

const TEST_CONFIG = {
  repository: 'security-test-repo',
  webhookPort: 19002,
  timeout: 30000
};

const mockGitHubAPI = new MockGitHubAPI();
const mockWebhookServer = new MockWebhookServer(TEST_CONFIG.webhookPort);
const testRepo = new TestRepository(TEST_CONFIG.repository);
const securityScanner = new SecurityScanner();

describe('GitHub Security Workflow Integration Tests', () => {
  beforeAll(async () => {
    await mockWebhookServer.start();
    await testRepo.setup();
    await mockGitHubAPI.setup();
    await securityScanner.setup();
    
    console.log('✅ Security test environment initialized');
  }, TEST_CONFIG.timeout);

  afterAll(async () => {
    await mockWebhookServer.stop();
    await testRepo.cleanup();
    await mockGitHubAPI.cleanup();
    await securityScanner.cleanup();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGitHubAPI.reset();
    await testRepo.reset();
    securityScanner.reset();
  });

  describe('Vulnerability Detection and Auto-Fix', () => {
    test('should detect and auto-fix dependency vulnerabilities', async () => {
      // Arrange: Create vulnerable dependency
      await testRepo.updateFile('package.json', JSON.stringify({
        name: 'test-app',
        dependencies: {
          'lodash': '4.17.19', // Known vulnerability
          'axios': '0.21.0'    // Known vulnerability
        }
      }, null, 2));
      
      await testRepo.commitChanges('Add vulnerable dependencies');
      
      // Mock security advisory
      mockGitHubAPI.mockSecurityAdvisory({
        package: 'lodash',
        vulnerability: 'CVE-2021-23337',
        fixedVersion: '4.17.21',
        severity: 'high'
      });
      
      mockGitHubAPI.mockSecurityAdvisory({
        package: 'axios',
        vulnerability: 'CVE-2021-3749',
        fixedVersion: '0.21.2',
        severity: 'medium'
      });
      
      // Act: Trigger security scan
      await securityScanner.scanRepository(testRepo.getRepoPath());
      
      // Simulate webhook from security scan
      await mockWebhookServer.sendWebhook({
        action: 'security_scan_completed',
        vulnerabilities: [
          {
            package: 'lodash',
            version: '4.17.19',
            vulnerability: 'CVE-2021-23337',
            severity: 'high',
            fixAvailable: true
          },
          {
            package: 'axios',
            version: '0.21.0',
            vulnerability: 'CVE-2021-3749',
            severity: 'medium',
            fixAvailable: true
          }
        ]
      }, 'repository_dispatch');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Assert: Verify auto-fix PRs created
      const pullRequests = mockGitHubAPI.getCreatedPullRequests();
      expect(pullRequests).toHaveLength(1); // Should group fixes into single PR
      
      const securityFixPR = pullRequests[0];
      expect(securityFixPR.title).toContain('Security fixes');
      expect(securityFixPR.body).toContain('CVE-2021-23337');
      expect(securityFixPR.body).toContain('CVE-2021-3749');
      expect(securityFixPR.labels).toContain('security');
      expect(securityFixPR.labels).toContain('automated');
    });

    test('should prioritize critical vulnerabilities', async () => {
      // Arrange: Create multiple vulnerabilities with different severities
      const vulnerabilities = [
        {
          package: 'critical-package',
          vulnerability: 'CVE-2023-CRITICAL',
          severity: 'critical',
          fixAvailable: true
        },
        {
          package: 'high-package',
          vulnerability: 'CVE-2023-HIGH',
          severity: 'high',
          fixAvailable: true
        },
        {
          package: 'medium-package',
          vulnerability: 'CVE-2023-MEDIUM',
          severity: 'medium',
          fixAvailable: true
        }
      ];
      
      // Act: Trigger security scan with multiple vulnerabilities
      await mockWebhookServer.sendWebhook({
        action: 'security_scan_completed',
        vulnerabilities
      }, 'repository_dispatch');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Assert: Verify critical vulnerabilities are handled first
      const pullRequests = mockGitHubAPI.getCreatedPullRequests();
      const criticalPR = pullRequests.find(pr => 
        pr.title.includes('CRITICAL') || pr.labels.includes('critical')
      );
      
      expect(criticalPR).toBeDefined();
      expect(criticalPR.priority).toBe('urgent');
      
      // Verify issue created for critical vulnerability
      const issues = mockGitHubAPI.getCreatedIssues();
      const criticalIssue = issues.find(issue => 
        issue.title.includes('Critical Security Vulnerability')
      );
      expect(criticalIssue).toBeDefined();
      expect(criticalIssue.labels).toContain('security-critical');
    });

    test('should handle unfixable vulnerabilities appropriately', async () => {
      // Arrange: Create vulnerability with no available fix
      const unfixableVuln = {
        package: 'deprecated-package',
        vulnerability: 'CVE-2023-NOFX',
        severity: 'high',
        fixAvailable: false,
        recommendation: 'Replace with alternative package'
      };
      
      mockGitHubAPI.mockSecurityAdvisory({
        package: 'deprecated-package',
        vulnerability: 'CVE-2023-NOFX',
        fixedVersion: null,
        requiresManualReview: true
      });
      
      // Act: Process unfixable vulnerability
      await mockWebhookServer.sendWebhook({
        action: 'security_scan_completed',
        vulnerabilities: [unfixableVuln]
      }, 'repository_dispatch');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Assert: Verify manual review process triggered
      const issues = mockGitHubAPI.getCreatedIssues();
      const manualReviewIssue = issues.find(issue => 
        issue.title.includes('Manual Security Review Required')
      );
      
      expect(manualReviewIssue).toBeDefined();
      expect(manualReviewIssue.body).toContain('deprecated-package');
      expect(manualReviewIssue.body).toContain('Replace with alternative package');
      expect(manualReviewIssue.labels).toContain('needs-manual-review');
      expect(manualReviewIssue.labels).toContain('security-blocked');
      
      // Verify no auto-fix PR created
      const pullRequests = mockGitHubAPI.getCreatedPullRequests();
      const autoFixPR = pullRequests.find(pr => 
        pr.body.includes('deprecated-package')
      );
      expect(autoFixPR).toBeUndefined();
    });
  });

  describe('Security Policy Enforcement', () => {
    test('should block PRs with security vulnerabilities', async () => {
      // Arrange: Create PR with security vulnerabilities
      const vulnerablePR = {
        number: 500,
        title: 'Add new dependencies',
        head: { ref: 'feature/new-deps' },
        base: { ref: 'main' },
        state: 'open'
      };
      
      mockGitHubAPI.mockPullRequest(vulnerablePR);
      
      // Simulate security scan finding vulnerabilities in PR
      securityScanner.mockScanResults({
        vulnerabilities: [
          {
            package: 'new-vulnerable-package',
            severity: 'high',
            introduced_in_pr: true
          }
        ]
      });
      
      // Act: Process PR with security check
      await mockWebhookServer.sendWebhook({
        action: 'opened',
        pull_request: vulnerablePR
      }, 'pull_request');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Assert: Verify PR is blocked
      const comments = mockGitHubAPI.getPullRequestComments(vulnerablePR.number);
      const blockingComment = comments.find(comment => 
        comment.body.includes('Security vulnerabilities detected')
      );
      expect(blockingComment).toBeDefined();
      
      // Verify blocking label added
      const labels = mockGitHubAPI.getLabelUpdates(vulnerablePR.number);
      expect(labels).toContain('security-blocked');
      expect(labels).toContain('do-not-merge');
      
      // Verify review requested from security team
      const reviewRequests = mockGitHubAPI.getReviewRequests(vulnerablePR.number);
      expect(reviewRequests).toContain('security-team');
    });

    test('should enforce secure coding standards', async () => {
      // Arrange: Create PR with security anti-patterns
      await testRepo.createBranch('feature/insecure-code');
      
      // Add code with security issues
      await testRepo.createFile('src/insecure.js', `
        // Security anti-patterns
        eval(userInput); // Code injection vulnerability
        document.innerHTML = userInput; // XSS vulnerability
        const password = '12345'; // Hardcoded credential
        const apiKey = process.env.API_KEY || 'default-key'; // Fallback credential
      `);
      
      await testRepo.commitChanges('Add insecure code patterns');
      
      const insecurePR = {
        number: 501,
        title: 'Add new authentication logic',
        head: { ref: 'feature/insecure-code' },
        base: { ref: 'main' },
        state: 'open'
      };
      
      mockGitHubAPI.mockPullRequest(insecurePR);
      
      // Act: Trigger security code scan
      await securityScanner.scanCode(testRepo.getRepoPath());
      
      await mockWebhookServer.sendWebhook({
        action: 'synchronize',
        pull_request: insecurePR
      }, 'pull_request');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Assert: Verify security violations detected
      const comments = mockGitHubAPI.getPullRequestComments(insecurePR.number);
      const securityComment = comments.find(comment => 
        comment.body.includes('Security code review findings')
      );
      
      expect(securityComment).toBeDefined();
      expect(securityComment.body).toContain('eval(userInput)');
      expect(securityComment.body).toContain('document.innerHTML');
      expect(securityComment.body).toContain('Hardcoded credential');
      
      // Verify security labels applied
      const labels = mockGitHubAPI.getLabelUpdates(insecurePR.number);
      expect(labels).toContain('security-review-required');
      expect(labels).toContain('code-quality-issues');
    });
  });

  describe('Incident Response Automation', () => {
    test('should trigger incident response for critical vulnerabilities', async () => {
      // Arrange: Create critical security incident
      const criticalIncident = {
        severity: 'critical',
        vulnerability: 'CVE-2023-CRITICAL',
        package: 'core-dependency',
        exploitInWild: true,
        affectedVersions: ['1.0.0', '1.1.0'],
        description: 'Remote code execution vulnerability'
      };
      
      // Act: Trigger incident response
      await mockWebhookServer.sendWebhook({
        action: 'security_incident',
        incident: criticalIncident
      }, 'repository_dispatch');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Assert: Verify incident response actions
      const issues = mockGitHubAPI.getCreatedIssues();
      const incidentIssue = issues.find(issue => 
        issue.title.includes('SECURITY INCIDENT')
      );
      
      expect(incidentIssue).toBeDefined();
      expect(incidentIssue.labels).toContain('security-incident');
      expect(incidentIssue.labels).toContain('p0-critical');
      expect(incidentIssue.assignees).toContain('security-team-lead');
      
      // Verify emergency PR created
      const pullRequests = mockGitHubAPI.getCreatedPullRequests();
      const emergencyPR = pullRequests.find(pr => 
        pr.title.includes('EMERGENCY')
      );
      
      expect(emergencyPR).toBeDefined();
      expect(emergencyPR.draft).toBe(false); // Should be ready for immediate review
      expect(emergencyPR.reviewers).toContain('security-team');
      
      // Verify stakeholder notifications
      const notifications = mockGitHubAPI.getNotifications();
      expect(notifications).toContainEqual({
        type: 'security_incident',
        severity: 'critical',
        recipients: ['security-team', 'engineering-leads', 'product-owner']
      });
    });

    test('should coordinate response across multiple repositories', async () => {
      // Arrange: Multi-repo security incident
      const multiRepoIncident = {
        vulnerability: 'CVE-2023-MULTI',
        affectedRepos: ['frontend-app', 'backend-api', 'shared-libs'],
        severity: 'high'
      };
      
      // Act: Trigger multi-repo incident response
      await mockWebhookServer.sendWebhook({
        action: 'multi_repo_security_incident',
        incident: multiRepoIncident
      }, 'repository_dispatch');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Assert: Verify coordination issue created
      const issues = mockGitHubAPI.getCreatedIssues();
      const coordinationIssue = issues.find(issue => 
        issue.title.includes('Multi-Repository Security Coordination')
      );
      
      expect(coordinationIssue).toBeDefined();
      expect(coordinationIssue.body).toContain('frontend-app');
      expect(coordinationIssue.body).toContain('backend-api');
      expect(coordinationIssue.body).toContain('shared-libs');
      
      // Verify tracking labels
      expect(coordinationIssue.labels).toContain('multi-repo-incident');
      expect(coordinationIssue.labels).toContain('coordination-required');
    });
  });

  describe('Compliance and Audit', () => {
    test('should maintain security audit trail', async () => {
      // Arrange: Perform security actions
      const securityActions = [
        { action: 'vulnerability_detected', package: 'test-pkg' },
        { action: 'auto_fix_applied', package: 'test-pkg' },
        { action: 'security_review_requested', pr: 502 },
        { action: 'vulnerability_resolved', package: 'test-pkg' }
      ];
      
      // Act: Execute security workflow
      for (const action of securityActions) {
        await mockWebhookServer.sendWebhook({
          action: 'security_audit_event',
          event: action
        }, 'repository_dispatch');
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Assert: Verify audit trail maintained
      const auditEvents = mockGitHubAPI.getAuditEvents();
      expect(auditEvents).toHaveLength(4);
      
      expect(auditEvents[0]).toMatchObject({
        action: 'vulnerability_detected',
        package: 'test-pkg',
        timestamp: expect.any(String)
      });
      
      expect(auditEvents[3]).toMatchObject({
        action: 'vulnerability_resolved',
        package: 'test-pkg'
      });
      
      // Verify audit summary generated
      const auditSummary = mockGitHubAPI.getAuditSummary();
      expect(auditSummary.vulnerabilities_detected).toBe(1);
      expect(auditSummary.auto_fixes_applied).toBe(1);
      expect(auditSummary.manual_reviews_requested).toBe(1);
      expect(auditSummary.vulnerabilities_resolved).toBe(1);
    });

    test('should generate compliance reports', async () => {
      // Arrange: Set up compliance monitoring
      const complianceRequirements = {
        securityScanFrequency: 'daily',
        vulnerabilityResponseTime: '24h',
        criticalVulnerabilityResponseTime: '4h',
        auditRetentionPeriod: '2y'
      };
      
      // Act: Trigger compliance report generation
      await mockWebhookServer.sendWebhook({
        action: 'generate_compliance_report',
        requirements: complianceRequirements
      }, 'repository_dispatch');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Assert: Verify compliance report created
      const issues = mockGitHubAPI.getCreatedIssues();
      const complianceReport = issues.find(issue => 
        issue.title.includes('Security Compliance Report')
      );
      
      expect(complianceReport).toBeDefined();
      expect(complianceReport.body).toContain('Compliance Status: COMPLIANT');
      expect(complianceReport.body).toContain('Security Scan Frequency: Met');
      expect(complianceReport.body).toContain('Response Time SLA: Met');
      
      expect(complianceReport.labels).toContain('compliance-report');
      expect(complianceReport.labels).toContain('security-metrics');
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle security scan failures gracefully', async () => {
      // Arrange: Simulate security scanner failure
      securityScanner.simulateFailure('Network timeout');
      
      // Act: Attempt security scan
      await mockWebhookServer.sendWebhook({
        action: 'trigger_security_scan'
      }, 'repository_dispatch');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Assert: Verify graceful failure handling
      const issues = mockGitHubAPI.getCreatedIssues();
      const failureIssue = issues.find(issue => 
        issue.title.includes('Security Scan Failed')
      );
      
      expect(failureIssue).toBeDefined();
      expect(failureIssue.body).toContain('Network timeout');
      expect(failureIssue.labels).toContain('security-infrastructure');
      expect(failureIssue.labels).toContain('needs-investigation');
      
      // Verify retry scheduled
      const retryEvents = mockGitHubAPI.getScheduledEvents();
      expect(retryEvents).toContainEqual({
        action: 'retry_security_scan',
        scheduledFor: expect.any(String)
      });
    });

    test('should process large numbers of vulnerabilities efficiently', async () => {
      // Arrange: Generate large vulnerability dataset
      const vulnerabilities = Array.from({ length: 100 }, (_, i) => ({
        package: `vulnerable-package-${i}`,
        vulnerability: `CVE-2023-${String(i).padStart(4, '0')}`,
        severity: ['low', 'medium', 'high', 'critical'][i % 4],
        fixAvailable: i % 3 !== 0
      }));
      
      const startTime = Date.now();
      
      // Act: Process all vulnerabilities
      await mockWebhookServer.sendWebhook({
        action: 'bulk_security_scan_completed',
        vulnerabilities
      }, 'repository_dispatch');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const processingTime = Date.now() - startTime;
      
      // Assert: Verify efficient processing
      expect(processingTime).toBeLessThan(10000); // < 10 seconds
      
      // Verify all vulnerabilities processed
      const pullRequests = mockGitHubAPI.getCreatedPullRequests();
      const issues = mockGitHubAPI.getCreatedIssues();
      
      // Should group fixes efficiently
      expect(pullRequests.length).toBeLessThan(vulnerabilities.length);
      expect(pullRequests.length).toBeGreaterThan(0);
      
      // Verify critical vulnerabilities prioritized
      const criticalPRs = pullRequests.filter(pr => 
        pr.labels.includes('critical') || pr.title.includes('Critical')
      );
      expect(criticalPRs.length).toBeGreaterThan(0);
    });
  });
});
