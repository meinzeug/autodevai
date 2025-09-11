# GitHub Workflow Automation - Optimized Execution Order

## 🎯 WORKFLOW OVERVIEW

This prompt defines the **STRICT execution order** for GitHub synchronization and development workflow.
The system follows a **3-phase sequential process** that ensures GitHub is fully synchronized and secure
before any roadmap execution begins.

## ⚡ EXECUTION PHASES (STRICT ORDER - NO SKIPPING)

### PHASE 1: GitHub Synchronization & PR Management
**Objective**: Ensure main branch is up-to-date with all safe changes merged

1. **Check for Dependabot PRs** (PRIORITY: HIGHEST)
   ```bash
   gh pr list --label dependencies --state open
   ```
   - Auto-merge all patch updates
   - Auto-merge minor updates with passing tests
   - Request review for major updates

2. **Process all open PRs targeting main**
   ```bash
   gh pr list --base main --state open
   ```
   - Merge approved PRs with passing CI
   - Resolve conflicts automatically where possible
   - Escalate complex conflicts for manual review

3. **Sync local with remote main**
   ```bash
   git checkout main
   git pull origin main --rebase
   ```

**✅ Phase 1 Complete when:**
- No mergeable PRs remain open
- Local main matches remote main exactly
- No merge conflicts exist

---

### PHASE 2: Security & Issue Resolution
**Objective**: Fix all security vulnerabilities and GitHub issues locally

1. **Security Vulnerability Scan & Fix**
   ```bash
   npm audit fix --force
   cargo audit fix
   ```
   - Fix all high/critical vulnerabilities
   - Document any that cannot be auto-fixed
   - Create issues for manual fixes needed

2. **GitHub Issues Resolution**
   ```bash
   gh issue list --state open --label bug,security
   ```
   - Fix all automated test failures
   - Resolve security issues
   - Fix CI/CD pipeline issues

3. **Validate Fixes**
   ```bash
   npm test
   npm run build
   cargo test
   cargo build --release
   ```

4. **Push fixes to main**
   ```bash
   git add -A
   git commit -m "fix: Resolve GitHub issues and security vulnerabilities"
   git push origin main
   ```

5. **Close resolved issues**
   ```bash
   gh issue close [ISSUE_NUMBER] --comment "Resolved in latest commit"
   ```

**✅ Phase 2 Complete when:**
- No security vulnerabilities remain
- All CI/CD checks pass
- All automated issues are closed
- Main branch is green (all checks passing)

---

### PHASE 3: Roadmap Execution
**Objective**: Execute development tasks from roadmap.md

**⚠️ PREREQUISITE CHECK (MANDATORY):**
```bash
# This check MUST pass before roadmap execution
./scripts/github-status-check.sh

# Expected output:
# ✅ No open Dependabot PRs
# ✅ No open PRs targeting main
# ✅ No security vulnerabilities
# ✅ No failing CI/CD checks
# ✅ Main branch is up-to-date
```

**Only if ALL checks pass**, proceed with roadmap:

1. **Read roadmap.md**
   ```bash
   cat docs/roadmap.md
   ```

2. **Execute roadmap tasks in priority order**
   - High priority items first
   - Follow SPARC methodology
   - Create feature branches as needed

3. **Create PR for completed work**
   ```bash
   gh pr create --base main --title "feat: [Roadmap item]"
   ```

**✅ Phase 3 Complete when:**
- Roadmap tasks are implemented
- PR is created for review
- All tests pass

---

## 🤖 AUTOMATION CONFIGURATION

### Daily Dependabot Schedule
```yaml
# .github/dependabot.yml
schedule:
  interval: "daily"
  time: "09:00"
groups:
  all-dependencies:
    patterns: ["*"]
    update-types: ["minor", "patch"]
```

### Auto-Merge Workflow
```yaml
# .github/workflows/auto-merge.yml
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  auto-merge:
    if: github.actor == 'dependabot[bot]'
    steps:
      - name: Auto-merge safe updates
        run: gh pr merge --auto --squash
```

### Security Auto-Fix
```yaml
# .github/workflows/security-fix.yml
on:
  schedule:
    - cron: '0 8 * * *'  # Daily at 8 AM

jobs:
  security:
    steps:
      - name: Fix vulnerabilities
        run: |
          npm audit fix --force
          cargo audit fix
```

---

## 📋 EXECUTION COMMANDS

### One-Command Workflow Execution
```bash
# Complete workflow in correct order
./scripts/github-workflow.sh

# Individual phases
./scripts/execute-phase.sh 1  # GitHub Sync
./scripts/execute-phase.sh 2  # Security Fix
./scripts/execute-phase.sh 3  # Roadmap Execute
```

### Status Checks
```bash
# Check if ready for next phase
./scripts/github-status-check.sh

# Detailed status report
gh pr list --state open
gh issue list --state open
npm audit
cargo audit
```

---

## 🚨 FAILURE RECOVERY

### If Phase 1 Fails (PR Merge Issues)
```bash
# Manual conflict resolution
gh pr view [PR_NUMBER]
git checkout -b fix-conflicts
git merge main
# Fix conflicts manually
git push
gh pr create --title "fix: Resolve merge conflicts"
```

### If Phase 2 Fails (Security Issues)
```bash
# Manual security fix
npm audit
# Review and fix manually
npm update [package]
# Or add to exceptions if false positive
echo "[package]" >> .auditignore
```

### If Phase 3 Prerequisites Fail
```bash
# DO NOT PROCEED WITH ROADMAP
# Return to Phase 1 and restart
./scripts/execute-phase.sh 1
```

---

## 📊 SUCCESS METRICS

### Phase 1 Success Criteria
- ✅ 100% of safe Dependabot PRs merged
- ✅ 0 merge conflicts
- ✅ Local and remote main in sync

### Phase 2 Success Criteria
- ✅ 0 high/critical vulnerabilities
- ✅ 100% of automated issues resolved
- ✅ All CI/CD checks passing

### Phase 3 Success Criteria
- ✅ Roadmap tasks completed
- ✅ PR created with passing tests
- ✅ Code review requested

---

## 🔄 WORKFLOW AUTOMATION SCRIPTS

### Main Workflow Script
```bash
#!/bin/bash
# /scripts/github-workflow.sh

set -euo pipefail

echo "🚀 Starting GitHub Workflow Automation"

# Phase 1: GitHub Sync
echo "📥 PHASE 1: GitHub Synchronization"
./scripts/sync/github-sync.sh || exit 1

# Phase 2: Security Fix
echo "🔒 PHASE 2: Security & Issue Resolution"
./scripts/security/security-fix.sh || exit 1

# Phase 3: Roadmap (only if prerequisites pass)
echo "🎯 PHASE 3: Roadmap Execution"
if ./scripts/github-status-check.sh; then
    ./scripts/roadmap/execute-roadmap.sh
else
    echo "❌ Prerequisites not met. Skipping roadmap execution."
    exit 1
fi

echo "✅ Workflow completed successfully!"
```

### Status Check Script
```bash
#!/bin/bash
# /scripts/github-status-check.sh

READY=true

# Check for open PRs
if [ $(gh pr list --state open --json number | jq length) -gt 0 ]; then
    echo "❌ Open PRs exist"
    READY=false
fi

# Check for security issues
if npm audit --audit-level=high 2>/dev/null | grep -q "found.*vulnerabilities"; then
    echo "❌ Security vulnerabilities exist"
    READY=false
fi

# Check CI status
if gh run list --limit 1 --json conclusion | jq -r '.[0].conclusion' | grep -q "failure"; then
    echo "❌ CI/CD checks failing"
    READY=false
fi

if [ "$READY" = true ]; then
    echo "✅ All prerequisites met - ready for roadmap execution"
    exit 0
else
    echo "❌ Prerequisites not met - fix issues before proceeding"
    exit 1
fi
```

---

## 📝 IMPORTANT NOTES

1. **NEVER skip phases** - The order is critical for maintaining repository integrity
2. **ALWAYS check prerequisites** before Phase 3 (roadmap execution)
3. **Daily Dependabot runs at 9:00 AM** - Plan work accordingly
4. **Security fixes are MANDATORY** - Never proceed with vulnerabilities
5. **Roadmap execution is CONDITIONAL** - Only when GitHub is clean

---

## 🎯 QUICK REFERENCE

```bash
# Complete workflow
./scripts/github-workflow.sh

# Check status
./scripts/github-status-check.sh

# Emergency cleanup
./scripts/emergency-github-cleanup.sh

# View all automation
gh workflow list
gh pr list
gh issue list
```

---

*This workflow ensures GitHub repository integrity and security before any development work proceeds.*