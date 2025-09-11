/**
 * GitHub Workflow Validation Tests
 * Tests workflow triggers, automation, and roadmap execution gates
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MockGitHubAPI } from '../mocks/github-api';
import { MockWebhookServer } from '../mocks/webhook-server';
import { TestRepository } from '../utils/test-repository';
import { WorkflowValidator } from '../utils/workflow-validator';

const TEST_CONFIG = {
  repository: 'workflow-validation-repo',
  webhookPort: 19003,
  timeout: 30000
};

const mockGitHubAPI = new MockGitHubAPI();
const mockWebhookServer = new MockWebhookServer(TEST_CONFIG.webhookPort);
const testRepo = new TestRepository(TEST_CONFIG.repository);
const workflowValidator = new WorkflowValidator();

describe('GitHub Workflow Validation Tests', () => {
  beforeAll(async () => {
    await mockWebhookServer.start();
    await testRepo.setup();
    await mockGitHubAPI.setup();
    await workflowValidator.setup();
    
    console.log('✅ Workflow validation test environment initialized');
  }, TEST_CONFIG.timeout);

  afterAll(async () => {
    await mockWebhookServer.stop();
    await testRepo.cleanup();
    await mockGitHubAPI.cleanup();
    await workflowValidator.cleanup();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGitHubAPI.reset();
    await testRepo.reset();
    workflowValidator.reset();
  });

  describe('Workflow Trigger Validation', () => {
    test('should trigger CI/CD on main branch push', async () => {
      // Arrange: Set up main branch push
      await testRepo.createFile('src/new-feature.js', 'console.log("New feature");');
      const commitSha = await testRepo.commitChanges('Add new feature');
      
      // Act: Send push webhook
      await mockWebhookServer.sendWebhook({
        ref: 'refs/heads/main',
        commits: [{
          id: commitSha,
          message: 'Add new feature',
          author: { name: 'Test User', email: 'test@example.com' }
        }]
      }, 'push');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Assert: Verify CI/CD workflow triggered
      const workflows = mockGitHubAPI.getTriggeredWorkflows();
      expect(workflows).toHaveLength(1);
      expect(workflows[0].name).toBe('CI/CD Pipeline');
      expect(workflows[0].head_sha).toBe(commitSha);
      expect(workflows[0].event).toBe('push');
    });

    test('should trigger different workflows for feature branches', async () => {
      // Arrange: Create feature branch
      await testRepo.createBranch('feature/new-component');
      await testRepo.createFile('components/NewComponent.tsx', 'export const NewComponent = () => null;');
      const commitSha = await testRepo.commitChanges('Add new component');
      
      // Act: Send push webhook for feature branch
      await mockWebhookServer.sendWebhook({
        ref: 'refs/heads/feature/new-component',
        commits: [{
          id: commitSha,
          message: 'Add new component'
        }]
      }, 'push');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Assert: Verify feature branch workflow triggered
      const workflows = mockGitHubAPI.getTriggeredWorkflows();
      const featureWorkflow = workflows.find(w => w.name === 'Feature Branch CI');
      expect(featureWorkflow).toBeDefined();
      expect(featureWorkflow.head_sha).toBe(commitSha);
    });

    test('should trigger security scan on dependency changes', async () => {
      // Arrange: Update dependencies
      await testRepo.updateFile('package.json', JSON.stringify({
        name: 'test-app',
        dependencies: {
          'lodash': '4.17.21', // Updated version
          'react': '18.2.0'    // New dependency
        }
      }, null, 2));
      
      const commitSha = await testRepo.commitChanges('Update dependencies');
      
      // Act: Send push webhook
      await mockWebhookServer.sendWebhook({
        ref: 'refs/heads/main',
        commits: [{
          id: commitSha,
          message: 'Update dependencies',
          modified: ['package.json']
        }]
      }, 'push');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Assert: Verify security scan triggered
      const securityScans = mockGitHubAPI.getTriggeredSecurityScans();
      expect(securityScans).toHaveLength(1);
      expect(securityScans[0].trigger).toBe('dependency_update');
      expect(securityScans[0].files).toContain('package.json');
    });

    test('should validate webhook authentication', async () => {
      // Test valid signature
      const validPayload = { test: 'data' };
      const validResponse = await mockWebhookServer.sendAuthenticatedWebhook(
        validPayload,
        'test',
        'test_webhook_secret'
      );
      expect(validResponse.status).toBe(200);
      
      // Test invalid signature
      const invalidResponse = await mockWebhookServer.sendAuthenticatedWebhook(
        validPayload,
        'test',
        'wrong_secret'
      );
      expect(invalidResponse.status).toBe(401);
      
      // Test missing signature
      const fetch = (await import('node-fetch')).default;
      const noSigResponse = await fetch(`http://localhost:${TEST_CONFIG.webhookPort}/webhooks/github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'test'
        },
        body: JSON.stringify(validPayload)
      });
      expect(noSigResponse.status).toBe(200); // Should pass when no secret is configured
    });
  });

  describe('Workflow Automation Validation', () => {
    test('should auto-merge Dependabot PRs when tests pass', async () => {
      // Arrange: Create Dependabot PR
      const dependabotPR = {
        number: 1001,
        user: { login: 'dependabot[bot]' },
        title: 'Bump lodash from 4.17.20 to 4.17.21',
        head: { ref: 'dependabot/npm_and_yarn/lodash-4.17.21' },
        base: { ref: 'main' },
        mergeable: true,
        state: 'open'
      };
      
      mockGitHubAPI.mockPullRequest(dependabotPR);
      mockGitHubAPI.mockChecks(dependabotPR.number, { conclusion: 'success' });
      
      // Act: Process Dependabot PR
      await mockWebhookServer.sendWebhook({
        action: 'opened',
        pull_request: dependabotPR
      }, 'pull_request');
      
      // Simulate successful checks
      await mockWebhookServer.sendWebhook({
        action: 'completed',
        check_run: {
          pull_requests: [{ number: dependabotPR.number }],
          conclusion: 'success'
        }
      }, 'check_run');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Assert: Verify auto-merge occurred
      const mergeAttempts = mockGitHubAPI.getMergeAttempts(dependabotPR.number);
      expect(mergeAttempts).toHaveLength(1);
      expect(mergeAttempts[0].merge_method).toBe('squash');
      expect(mergeAttempts[0].commit_title).toContain('Auto-merge');
    });

    test('should not auto-merge when tests fail', async () => {
      // Arrange: Create Dependabot PR with failing tests
      const failingPR = {
        number: 1002,
        user: { login: 'dependabot[bot]' },
        title: 'Bump vulnerable-package',
        state: 'open'
      };
      
      mockGitHubAPI.mockPullRequest(failingPR);
      mockGitHubAPI.mockChecks(failingPR.number, { conclusion: 'failure' });
      
      // Act: Process failing PR
      await mockWebhookServer.sendWebhook({
        action: 'opened',
        pull_request: failingPR
      }, 'pull_request');
      
      await mockWebhookServer.sendWebhook({
        action: 'completed',
        check_run: {
          pull_requests: [{ number: failingPR.number }],
          conclusion: 'failure'
        }
      }, 'check_run');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Assert: Verify no auto-merge
      const mergeAttempts = mockGitHubAPI.getMergeAttempts(failingPR.number);
      expect(mergeAttempts).toHaveLength(0);
      
      // Verify failure notification
      const issues = mockGitHubAPI.getCreatedIssues();
      const failureIssue = issues.find(issue => 
        issue.title.includes('Dependabot PR Failed')
      );
      expect(failureIssue).toBeDefined();
    });

    test('should handle concurrent workflow executions', async () => {
      // Arrange: Multiple simultaneous workflows
      const workflows = [
        { name: 'CI/CD Pipeline', trigger: 'push' },
        { name: 'Security Scan', trigger: 'push' },
        { name: 'Code Quality', trigger: 'push' },
        { name: 'Dependency Check', trigger: 'push' }
      ];
      
      // Act: Trigger all workflows simultaneously
      const promises = workflows.map(workflow => 
        mockWebhookServer.sendWebhook({
          action: 'trigger_workflow',
          workflow: workflow.name,
          trigger: workflow.trigger
        }, 'repository_dispatch')
      );
      
      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Assert: Verify all workflows processed
      const triggeredWorkflows = mockGitHubAPI.getTriggeredWorkflows();
      expect(triggeredWorkflows).toHaveLength(4);
      
      workflows.forEach(workflow => {
        const triggered = triggeredWorkflows.find(tw => tw.name === workflow.name);
        expect(triggered).toBeDefined();
      });
    });
  });

  describe('Roadmap Execution Gate Validation', () => {
    test('should execute roadmap tasks on successful main merge', async () => {
      // Arrange: Set up successful main branch merge
      const successfulPR = {
        number: 2001,
        title: 'Implement feature X',
        merged: true,
        base: { ref: 'main' },
        merge_commit_sha: 'abc123def456'
      };
      
      mockGitHubAPI.mockPullRequest(successfulPR);
      mockGitHubAPI.mockWorkflowRun({
        conclusion: 'success',
        head_sha: successfulPR.merge_commit_sha
      });
      
      // Act: Send PR merge webhook
      await mockWebhookServer.sendWebhook({
        action: 'closed',
        pull_request: successfulPR
      }, 'pull_request');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Assert: Verify roadmap execution triggered
      const roadmapExecutions = mockGitHubAPI.getRoadmapExecutions();
      expect(roadmapExecutions).toHaveLength(1);
      expect(roadmapExecutions[0].trigger).toBe('main_branch_merge');
      expect(roadmapExecutions[0].commit_sha).toBe(successfulPR.merge_commit_sha);
    });

    test('should block roadmap execution on failing tests', async () => {
      // Arrange: Merge with failing workflow
      const failingMerge = {
        number: 2002,
        merged: true,
        base: { ref: 'main' },
        merge_commit_sha: 'def456ghi789'
      };
      
      mockGitHubAPI.mockPullRequest(failingMerge);
      mockGitHubAPI.mockWorkflowRun({
        conclusion: 'failure',
        head_sha: failingMerge.merge_commit_sha
      });
      
      // Act: Send merge webhook
      await mockWebhookServer.sendWebhook({
        action: 'closed',
        pull_request: failingMerge
      }, 'pull_request');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Assert: Verify roadmap execution blocked
      const roadmapExecutions = mockGitHubAPI.getRoadmapExecutions();
      expect(roadmapExecutions).toHaveLength(0);
      
      // Verify blocking issue created
      const issues = mockGitHubAPI.getCreatedIssues();
      const blockingIssue = issues.find(issue => 
        issue.title.includes('Roadmap execution blocked')
      );
      expect(blockingIssue).toBeDefined();
      expect(blockingIssue.body).toContain('failing tests');
    });

    test('should validate roadmap task prerequisites', async () => {
      // Arrange: Set up roadmap task with prerequisites
      const roadmapTask = {
        id: 'feature-implementation',
        title: 'Implement new feature',
        prerequisites: [
          'security-review-completed',
          'performance-benchmarks-passed',
          'api-documentation-updated'
        ],
        status: 'pending'
      };
      
      mockGitHubAPI.mockRoadmapTask(roadmapTask);
      
      // Mock prerequisite statuses (some missing)
      mockGitHubAPI.mockPrerequisiteStatus('security-review-completed', true);
      mockGitHubAPI.mockPrerequisiteStatus('performance-benchmarks-passed', false);
      mockGitHubAPI.mockPrerequisiteStatus('api-documentation-updated', true);
      
      // Act: Attempt roadmap execution
      await mockWebhookServer.triggerRoadmapExecution('feature-implementation');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Assert: Verify execution blocked due to missing prerequisites
      const taskStatus = mockGitHubAPI.getRoadmapTaskStatus('feature-implementation');
      expect(taskStatus.status).toBe('blocked');
      expect(taskStatus.blockedReason).toContain('performance-benchmarks-passed');
      
      // Verify prerequisite check issue created
      const issues = mockGitHubAPI.getCreatedIssues();
      const prerequisiteIssue = issues.find(issue => 
        issue.title.includes('Prerequisites not met')
      );
      expect(prerequisiteIssue).toBeDefined();
    });

    test('should execute roadmap when all prerequisites are met', async () => {
      // Arrange: Set up task with all prerequisites met
      const readyTask = {
        id: 'ready-feature',
        title: 'Ready feature implementation',
        prerequisites: ['docs-updated', 'tests-written'],
        status: 'pending'
      };
      
      mockGitHubAPI.mockRoadmapTask(readyTask);
      mockGitHubAPI.mockPrerequisiteStatus('docs-updated', true);
      mockGitHubAPI.mockPrerequisiteStatus('tests-written', true);
      
      // Act: Trigger execution
      await mockWebhookServer.triggerRoadmapExecution('ready-feature');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Assert: Verify execution proceeds
      const taskStatus = mockGitHubAPI.getRoadmapTaskStatus('ready-feature');
      expect(taskStatus.status).toBe('in_progress');
      
      const executions = mockGitHubAPI.getRoadmapExecutions();
      const execution = executions.find(e => e.task_id === 'ready-feature');
      expect(execution).toBeDefined();
      expect(execution.status).toBe('started');
    });

    test('should handle roadmap execution priority', async () => {
      // Arrange: Multiple roadmap tasks with different priorities
      const tasks = [
        { id: 'low-priority', priority: 'low', status: 'pending' },
        { id: 'high-priority', priority: 'high', status: 'pending' },
        { id: 'critical-priority', priority: 'critical', status: 'pending' }
      ];
      
      tasks.forEach(task => {
        mockGitHubAPI.mockRoadmapTask(task);
      });
      
      // Act: Trigger all tasks simultaneously
      const promises = tasks.map(task => 
        mockWebhookServer.triggerRoadmapExecution(task.id)
      );
      
      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Assert: Verify execution order by priority
      const executions = mockGitHubAPI.getRoadmapExecutions();
      expect(executions).toHaveLength(3);
      
      // Critical should execute first
      const criticalExecution = executions.find(e => e.task_id === 'critical-priority');
      const highExecution = executions.find(e => e.task_id === 'high-priority');
      const lowExecution = executions.find(e => e.task_id === 'low-priority');
      
      expect(new Date(criticalExecution.executed_at).getTime())
        .toBeLessThanOrEqual(new Date(highExecution.executed_at).getTime());
      expect(new Date(highExecution.executed_at).getTime())
        .toBeLessThanOrEqual(new Date(lowExecution.executed_at).getTime());
    });
  });

  describe('Workflow Performance and Reliability', () => {
    test('should handle webhook processing within time limits', async () => {
      // Arrange: Large webhook payload
      const largePayload = {
        action: 'synchronize',
        pull_request: {
          number: 3001,
          title: 'Large PR with many changes',
          commits: Array.from({ length: 100 }, (_, i) => ({
            id: `commit-${i}`,
            message: `Commit ${i}`,
            modified: [`file-${i}.js`]
          }))
        }
      };
      
      const startTime = Date.now();
      
      // Act: Process large webhook
      await mockWebhookServer.sendWebhook(largePayload, 'pull_request');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const processingTime = Date.now() - startTime;
      
      // Assert: Verify processing time is reasonable
      expect(processingTime).toBeLessThan(5000); // < 5 seconds
      
      const processedWebhooks = mockWebhookServer.getProcessedWebhooks();
      const processedWebhook = processedWebhooks.find(w => 
        w.payload.pull_request?.number === 3001
      );
      expect(processedWebhook.status).toBe('processed');
    });

    test('should maintain workflow state consistency', async () => {
      // Arrange: Sequential workflow events
      const prNumber = 4001;
      const events = [
        { action: 'opened', sequence: 1 },
        { action: 'synchronize', sequence: 2 },
        { action: 'review_requested', sequence: 3 },
        { action: 'closed', sequence: 4 }
      ];
      
      // Act: Send events in order
      for (const event of events) {
        await mockWebhookServer.sendWebhook({
          ...event,
          pull_request: { number: prNumber }
        }, 'pull_request');
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Assert: Verify events processed in correct order
      const processingSequence = mockWebhookServer.getProcessingSequence(prNumber);
      expect(processingSequence).toEqual([1, 2, 3, 4]);
    });

    test('should recover from transient failures', async () => {
      // Arrange: Simulate GitHub API outage
      mockGitHubAPI.simulateOutage(3000); // 3 second outage
      
      const webhook = {
        action: 'opened',
        pull_request: {
          number: 5001,
          title: 'PR during outage'
        }
      };
      
      // Act: Send webhook during outage
      await mockWebhookServer.sendWebhook(webhook, 'pull_request');
      
      // Wait for outage to end and retries to work
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Assert: Verify eventual success
      const retryAttempts = mockGitHubAPI.getRetryAttempts(5001);
      expect(retryAttempts.length).toBeGreaterThan(1);
      expect(retryAttempts[retryAttempts.length - 1].success).toBe(true);
    });
  });

  describe('Workflow Configuration Validation', () => {
    test('should validate CI/CD workflow configuration', async () => {
      // Act: Validate workflow configuration
      const validation = await workflowValidator.validateWorkflow('ci-cd');
      
      // Assert: Verify workflow is properly configured
      expect(validation.isValid).toBe(true);
      expect(validation.triggers).toContain('push');
      expect(validation.triggers).toContain('pull_request');
      expect(validation.jobs).toContain('build-and-test');
      expect(validation.jobs).toContain('security-scan');
    });

    test('should detect missing workflow configurations', async () => {
      // Act: Validate missing workflow
      const validation = await workflowValidator.validateWorkflow('missing-workflow');
      
      // Assert: Verify validation fails appropriately
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Workflow file not found');
    });

    test('should validate webhook endpoint configuration', async () => {
      // Act: Validate webhook endpoint
      const endpointValidation = await workflowValidator.validateWebhookEndpoint(
        `http://localhost:${TEST_CONFIG.webhookPort}/webhooks/github`
      );
      
      // Assert: Verify endpoint is accessible
      expect(endpointValidation.isAccessible).toBe(true);
      expect(endpointValidation.responseTime).toBeLessThan(1000);
    });
  });
});
