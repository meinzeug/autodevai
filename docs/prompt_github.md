# GitHub-First Development Workflow

## 🎯 CRITICAL EXECUTION ORDER

**MANDATORY SEQUENCE - NO EXCEPTIONS**

### PHASE 1: GitHub Synchronization
**Status: MUST COMPLETE FIRST**

#### 1.1 Dependency Management
```bash
# Check all Dependabot PRs
gh pr list --author "app/dependabot"

# Merge ALL approved Dependabot PRs
gh pr merge --auto --squash

# Verify no conflicts remain
git status --porcelain
```

#### 1.2 Branch Synchronization
```bash
# Pull latest main
git checkout main
git pull origin main

# Check for conflicts
git merge-tree $(git merge-base HEAD origin/main) HEAD origin/main
```

#### 1.3 Status Verification
- [ ] All Dependabot PRs merged
- [ ] No merge conflicts
- [ ] Local branch up-to-date
- [ ] CI/CD passing

### PHASE 2: Security & Issue Resolution
**Status: EXECUTE AFTER PHASE 1 COMPLETE**

#### 2.1 GitHub Issues Audit
```bash
# List all open issues
gh issue list --state open

# Prioritize security issues
gh issue list --label "security" --state open

# Check vulnerability alerts
gh api repos/:owner/:repo/vulnerability-alerts
```

#### 2.2 Local Security Fixes
```bash
# Run security audit
npm audit --audit-level high
cargo audit

# Fix vulnerabilities
npm audit fix
cargo fix --allow-dirty --allow-staged

# Verify fixes
npm audit --audit-level moderate
```

#### 2.3 Issue Resolution Workflow
```bash
# For each issue:
# 1. Create fix branch
git checkout -b fix/issue-{number}

# 2. Implement fix
# 3. Test locally
npm test
cargo test

# 4. Commit with issue reference
git commit -m "fix: resolve issue #{number} - {description}"

# 5. Push and create PR
git push origin fix/issue-{number}
gh pr create --title "Fix #{number}: {title}" --body "Fixes #{number}"

# 6. Auto-merge if CI passes
gh pr merge --auto --squash
```

#### 2.4 Phase 2 Checkpoints
- [ ] All security vulnerabilities fixed
- [ ] High-priority issues resolved
- [ ] All tests passing
- [ ] Documentation updated
- [ ] PRs merged to main

### PHASE 3: Roadmap Execution
**Status: EXECUTE ONLY AFTER PHASES 1-2 COMPLETE**

#### 3.1 Pre-Roadmap Validation
```bash
# Ensure GitHub is clean
gh issue list --state open | wc -l  # Should be minimal
gh pr list --state open | wc -l     # Should be minimal

# Verify build status
npm run build
cargo build --release
```

#### 3.2 Roadmap Task Execution
```bash
# Load roadmap tasks
cat docs/roadmap.md

# Execute in priority order:
# 1. Security enhancements
# 2. Core functionality
# 3. Performance optimizations
# 4. Feature additions
```

#### 3.3 Continuous Integration
```bash
# After each roadmap milestone
git add .
git commit -m "feat: complete roadmap milestone - {description}"
git push origin main

# Verify CI status
gh run list --limit 1
```

## 🚀 Automation Triggers

### Auto-Execute Conditions
```yaml
triggers:
  dependabot_pr_merge:
    condition: "all dependabot PRs approved"
    action: "auto-merge with squash"
    
  security_alert:
    condition: "new vulnerability detected"
    action: "immediate fix branch creation"
    
  issue_labeled_critical:
    condition: "issue labeled 'critical'"
    action: "priority fix workflow"
    
  ci_failure:
    condition: "CI pipeline fails"
    action: "halt roadmap execution"
```

### Status Checkpoints
```yaml
checkpoints:
  phase_1_complete:
    - dependencies_updated: true
    - conflicts_resolved: true
    - main_branch_current: true
    
  phase_2_complete:
    - security_issues_fixed: true
    - tests_passing: true
    - critical_issues_closed: true
    
  phase_3_ready:
    - github_clean: true
    - build_successful: true
    - roadmap_validated: true
```

## 📋 Execution Commands

### Quick Status Check
```bash
# One-command status
./scripts/github-status-check.sh
```

### Phase Execution
```bash
# Execute specific phase
./scripts/execute-phase.sh 1  # GitHub sync
./scripts/execute-phase.sh 2  # Security fixes
./scripts/execute-phase.sh 3  # Roadmap execution
```

### Emergency Procedures
```bash
# Emergency GitHub cleanup
./scripts/emergency-github-cleanup.sh

# Force roadmap halt
./scripts/halt-roadmap-execution.sh
```

## 🔍 Success Metrics

### Phase 1 Success Criteria
- ✅ Zero open Dependabot PRs
- ✅ Zero merge conflicts
- ✅ Main branch == remote main
- ✅ All CI checks passing

### Phase 2 Success Criteria
- ✅ Zero critical security issues
- ✅ < 3 open GitHub issues
- ✅ All tests passing (>95% coverage)
- ✅ Documentation synchronized

### Phase 3 Success Criteria
- ✅ Roadmap milestones completed
- ✅ Feature tests passing
- ✅ Performance benchmarks met
- ✅ Production deployment ready

## 🚨 Failure Recovery

### Phase 1 Failures
```bash
# Dependency conflicts
git reset --hard origin/main
npm install --force
cargo update

# Merge conflicts
git merge --abort
git checkout main
git pull --rebase origin main
```

### Phase 2 Failures
```bash
# Security fix failures
git checkout -b emergency-security-fix
# Manual security patches
git commit -m "emergency: manual security fixes"
```

### Phase 3 Failures
```bash
# Roadmap execution halt
git stash
git checkout main
# Reassess roadmap priorities
```

## 🎯 Integration with Existing Workflow

### Pre-Execution Validation
1. Check current git status
2. Verify no uncommitted changes
3. Confirm internet connectivity
4. Validate GitHub authentication

### Post-Execution Cleanup
1. Update documentation
2. Archive completed issues
3. Update roadmap status
4. Generate execution report

---

**REMEMBER: This workflow is MANDATORY and SEQUENTIAL. Each phase must complete successfully before proceeding to the next. No exceptions.**