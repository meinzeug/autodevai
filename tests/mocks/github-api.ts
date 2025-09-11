/**
 * Mock GitHub API for testing GitHub workflow integration
 */

export class MockGitHubAPI {
  private pullRequests: Map<number, any> = new Map();
  private issues: Map<number, any> = new Map();
  private checks: Map<number, any> = new Map();
  private mergeAttempts: Map<number, any[]> = new Map();
  private createdIssues: any[] = [];
  private createdPullRequests: any[] = [];
  private issueComments: Map<number, any[]> = new Map();
  private issueUpdates: Map<number, any[]> = new Map();
  private labelUpdates: Map<number, string[]> = new Map();
  private conflicts: Map<number, any[]> = new Map();
  private resolutionCommits: Map<number, any[]> = new Map();
  private pullRequestComments: Map<number, any[]> = new Map();
  private reviewRequests: Map<number, string[]> = new Map();
  private workflowRuns: any[] = [];
  private securityScans: any[] = [];
  private roadmapExecutions: any[] = [];
  private roadmapTasks: Map<string, any> = new Map();
  private prerequisiteStatuses: Map<string, boolean> = new Map();
  private securityAdvisories: Map<string, any> = new Map();
  private retryAttempts: Map<number, any[]> = new Map();
  private outageEndTime: number = 0;
  
  async setup() {
    console.log('🔧 MockGitHubAPI initialized');
  }
  
  async cleanup() {
    this.reset();
    console.log('🧹 MockGitHubAPI cleaned up');
  }
  
  reset() {
    this.pullRequests.clear();
    this.issues.clear();
    this.checks.clear();
    this.mergeAttempts.clear();
    this.createdIssues = [];
    this.createdPullRequests = [];
    this.issueComments.clear();
    this.issueUpdates.clear();
    this.labelUpdates.clear();
    this.conflicts.clear();
    this.resolutionCommits.clear();
    this.pullRequestComments.clear();
    this.reviewRequests.clear();
    this.workflowRuns = [];
    this.securityScans = [];
    this.roadmapExecutions = [];
    this.roadmapTasks.clear();
    this.prerequisiteStatuses.clear();
    this.securityAdvisories.clear();
    this.retryAttempts.clear();
    this.outageEndTime = 0;
  }
  
  // Pull Request mocking
  mockPullRequest(pr: any) {
    this.pullRequests.set(pr.number, pr);
  }
  
  getPullRequest(number: number) {
    return this.pullRequests.get(number);
  }
  
  // Check status mocking
  mockChecks(prNumber: number, status: any) {
    this.checks.set(prNumber, status);
  }
  
  getChecks(prNumber: number) {
    return this.checks.get(prNumber);
  }
  
  // Merge attempts tracking
  attemptMerge(prNumber: number, mergeData: any) {
    if (this.isOutageActive()) {
      this.recordRetryAttempt(prNumber, { success: false, reason: 'service_outage' });
      throw new Error('Service temporarily unavailable');
    }
    
    if (!this.mergeAttempts.has(prNumber)) {
      this.mergeAttempts.set(prNumber, []);
    }
    this.mergeAttempts.get(prNumber)!.push(mergeData);
    this.recordRetryAttempt(prNumber, { success: true });
  }
  
  getMergeAttempts(prNumber: number) {
    return this.mergeAttempts.get(prNumber) || [];
  }
  
  mergePullRequest(prNumber: number) {
    const pr = this.pullRequests.get(prNumber);
    if (pr) {
      pr.merged = true;
      pr.state = 'closed';
    }
  }
  
  // Issue mocking
  mockIssue(issue: any) {
    this.issues.set(issue.number, issue);
  }
  
  createIssue(issueData: any) {
    const issue = {
      number: this.createdIssues.length + 1000,
      ...issueData,
      created_at: new Date().toISOString()
    };
    this.createdIssues.push(issue);
    return issue;
  }
  
  getCreatedIssues() {
    return this.createdIssues;
  }
  
  updateIssue(issueNumber: number, updates: any) {
    if (!this.issueUpdates.has(issueNumber)) {
      this.issueUpdates.set(issueNumber, []);
    }
    this.issueUpdates.get(issueNumber)!.push(updates);
  }
  
  getIssueUpdates(issueNumber: number) {
    return this.issueUpdates.get(issueNumber) || [];
  }
  
  // Comment mocking
  addIssueComment(issueNumber: number, comment: any) {
    if (!this.issueComments.has(issueNumber)) {
      this.issueComments.set(issueNumber, []);
    }
    this.issueComments.get(issueNumber)!.push(comment);
  }
  
  getIssueComments(issueNumber: number) {
    return this.issueComments.get(issueNumber) || [];
  }
  
  addPullRequestComment(prNumber: number, comment: any) {
    if (!this.pullRequestComments.has(prNumber)) {
      this.pullRequestComments.set(prNumber, []);
    }
    this.pullRequestComments.get(prNumber)!.push(comment);
  }
  
  getPullRequestComments(prNumber: number) {
    return this.pullRequestComments.get(prNumber) || [];
  }
  
  // Label management
  addLabel(issueNumber: number, label: string) {
    if (!this.labelUpdates.has(issueNumber)) {
      this.labelUpdates.set(issueNumber, []);
    }
    this.labelUpdates.get(issueNumber)!.push(label);
  }
  
  getLabelUpdates(issueNumber: number) {
    return this.labelUpdates.get(issueNumber) || [];
  }
  
  // Security advisory mocking
  mockSecurityAdvisory(advisory: any) {
    this.securityAdvisories.set(advisory.package, advisory);
  }
  
  getSecurityAdvisory(packageName: string) {
    return this.securityAdvisories.get(packageName);
  }
  
  // Pull request creation
  createPullRequest(prData: any) {
    const pr = {
      number: this.createdPullRequests.length + 2000,
      ...prData,
      created_at: new Date().toISOString()
    };
    this.createdPullRequests.push(pr);
    return pr;
  }
  
  getCreatedPullRequests() {
    return this.createdPullRequests;
  }
  
  // Conflict handling
  mockConflicts(prNumber: number, conflicts: any[]) {
    this.conflicts.set(prNumber, conflicts);
  }
  
  getConflicts(prNumber: number) {
    return this.conflicts.get(prNumber) || [];
  }
  
  addConflictResolutionCommit(prNumber: number, commit: any) {
    if (!this.resolutionCommits.has(prNumber)) {
      this.resolutionCommits.set(prNumber, []);
    }
    this.resolutionCommits.get(prNumber)!.push(commit);
  }
  
  getConflictResolutionCommits(prNumber: number) {
    return this.resolutionCommits.get(prNumber) || [];
  }
  
  // Review requests
  requestReview(prNumber: number, reviewer: string) {
    if (!this.reviewRequests.has(prNumber)) {
      this.reviewRequests.set(prNumber, []);
    }
    this.reviewRequests.get(prNumber)!.push(reviewer);
  }
  
  getReviewRequests(prNumber: number) {
    return this.reviewRequests.get(prNumber) || [];
  }
  
  // Workflow tracking
  triggerWorkflow(workflow: any) {
    this.workflowRuns.push({
      ...workflow,
      id: Date.now(),
      triggered_at: new Date().toISOString()
    });
  }
  
  getTriggeredWorkflows() {
    return this.workflowRuns;
  }
  
  mockWorkflowRun(workflow: any) {
    this.workflowRuns.push(workflow);
  }
  
  // Security scan tracking
  triggerSecurityScan(scan: any) {
    this.securityScans.push({
      ...scan,
      id: Date.now(),
      triggered_at: new Date().toISOString()
    });
  }
  
  getTriggeredSecurityScans() {
    return this.securityScans;
  }
  
  // Roadmap execution
  executeRoadmap(execution: any) {
    this.roadmapExecutions.push({
      ...execution,
      id: Date.now(),
      executed_at: new Date().toISOString()
    });
  }
  
  getRoadmapExecutions() {
    return this.roadmapExecutions;
  }
  
  mockRoadmapTask(task: any) {
    this.roadmapTasks.set(task.id, task);
  }
  
  getRoadmapTaskStatus(taskId: string) {
    return this.roadmapTasks.get(taskId);
  }
  
  mockPrerequisiteStatus(prerequisite: string, status: boolean) {
    this.prerequisiteStatuses.set(prerequisite, status);
  }
  
  getPrerequisiteStatus(prerequisite: string) {
    return this.prerequisiteStatuses.get(prerequisite);
  }
  
  // Service outage simulation
  simulateOutage(durationMs: number) {
    this.outageEndTime = Date.now() + durationMs;
  }
  
  private isOutageActive(): boolean {
    return Date.now() < this.outageEndTime;
  }
  
  private recordRetryAttempt(identifier: number, attempt: any) {
    if (!this.retryAttempts.has(identifier)) {
      this.retryAttempts.set(identifier, []);
    }
    this.retryAttempts.get(identifier)!.push({
      ...attempt,
      timestamp: new Date().toISOString()
    });
  }
  
  getRetryAttempts(identifier: number) {
    return this.retryAttempts.get(identifier) || [];
  }
}
