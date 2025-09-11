# Automation Configuration Reference

**Generated**: 2025-09-11  
**Repository**: AutoDev-AI Neural Bridge Platform  
**Version**: 1.0.0

## Overview

Complete configuration reference for all GitHub Actions workflows, automation rules, and integration points in the AutoDev-AI platform.

## Table of Contents

1. [Workflow Configuration](#workflow-configuration)
2. [Trigger Configuration](#trigger-configuration)
3. [Environment Variables](#environment-variables)
4. [Security Configuration](#security-configuration)
5. [Automation Rules](#automation-rules)
6. [Integration Configuration](#integration-configuration)
7. [Performance Configuration](#performance-configuration)
8. [Monitoring Configuration](#monitoring-configuration)

---

## Workflow Configuration

### CI/CD Pipeline (ci.yml)

#### Basic Configuration
```yaml
name: CI/CD Pipeline
run-name: "🚀 CI/CD Pipeline - ${{ github.event.head_commit.message }}"

# Concurrency control
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

# Global environment variables
env:
  NODE_VERSION: '22'
  CARGO_TERM_COLOR: always
  RUST_BACKTRACE: 1
```

#### Job Configuration
```yaml
jobs:
  quick-check:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    outputs:
      cache-hit: ${{ steps.cache.outputs.cache-hit }}
    
  build-and-test:
    needs: quick-check
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix:
        platform: [ubuntu-latest]
    
  security-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
```

#### Step Configuration Templates
```yaml
# Node.js setup template
- name: Setup Node.js
  uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8
  with:
    node-version: ${{ env.NODE_VERSION }}
    cache: 'npm'
    cache-dependency-path: package-lock.json

# Rust setup template
- name: Setup Rust
  uses: dtolnay/rust-toolchain@stable
  with:
    toolchain: stable
    components: rustfmt, clippy

# Cache configuration template
- name: Cache dependencies
  uses: actions/cache@ab5e6d0c87105b4c9c2047343972218f562e4319
  with:
    path: |
      ~/.npm
      ~/.cargo
      target/
    key: ${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json', '**/Cargo.lock') }}
    restore-keys: |
      ${{ runner.os }}-deps-
```

### Security Workflow (security.yml)

#### Configuration Matrix
```yaml
strategy:
  matrix:
    scan-type: 
      - npm-audit
      - cargo-audit
      - codeql
      - trivy
      - trufflehog
    include:
      - scan-type: npm-audit
        command: npm audit --audit-level=high
        artifact: npm-audit-report
      - scan-type: cargo-audit
        command: cargo audit
        artifact: cargo-audit-report
      - scan-type: codeql
        language: [javascript, typescript, rust]
        artifact: codeql-results
```

#### Security Tools Configuration
```yaml
# CodeQL configuration
- name: Initialize CodeQL
  uses: github/codeql-action/init@v3
  with:
    languages: javascript,typescript,rust
    config-file: ./.github/codeql/codeql-config.yml
    
# Trivy configuration
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    scan-ref: '.'
    format: 'sarif'
    output: 'trivy-results.sarif'
    
# TruffleHog configuration
- name: TruffleHog OSS
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: main
    head: HEAD
    extra_args: --debug --only-verified
```

### Build Automation (build-automation.yml)

#### Multi-platform Configuration
```yaml
strategy:
  fail-fast: false
  matrix:
    platform:
      - os: ubuntu-latest
        target: x86_64-unknown-linux-gnu
        artifact: linux
      - os: windows-latest
        target: x86_64-pc-windows-msvc
        artifact: windows
      - os: macos-latest
        target: x86_64-apple-darwin
        artifact: macos
    include:
      - platform: { os: ubuntu-latest }
        dependencies: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.0-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

#### Build Configuration
```yaml
# Tauri build configuration
- name: Build Tauri application
  uses: tauri-apps/tauri-action@0e6ec9bb7e2aab7c2de1c93b88d2b8c6ccb9d4c4
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
    TAURI_KEY_PASSWORD: ${{ secrets.TAURI_KEY_PASSWORD }}
  with:
    tagName: v__VERSION__
    releaseName: "AutoDev-AI v__VERSION__"
    releaseBody: "See the assets to download this version and install."
    releaseDraft: true
    prerelease: false
```

---

## Trigger Configuration

### Event Triggers

#### Push Events
```yaml
on:
  push:
    branches: 
      - main
      - develop
      - 'feature/*'
      - 'hotfix/*'
    paths:
      - 'src/**'
      - 'src-tauri/**'
      - 'package.json'
      - 'Cargo.toml'
      - '.github/workflows/**'
    paths-ignore:
      - 'docs/**'
      - '*.md'
      - 'LICENSE'
      - '.gitignore'
    tags:
      - 'v*'
      - 'release/*'
```

#### Pull Request Events
```yaml
on:
  pull_request:
    types: 
      - opened
      - synchronize
      - reopened
      - ready_for_review
    branches:
      - main
      - develop
    paths:
      - 'src/**'
      - 'src-tauri/**'
      - 'tests/**'
    paths-ignore:
      - 'docs/**'
      - '*.md'
```

#### Scheduled Events
```yaml
on:
  schedule:
    # Daily security scan at 6 AM UTC
    - cron: '0 6 * * *'
    # Weekly dependency update check
    - cron: '0 9 * * 1'
    # Monthly performance analysis
    - cron: '0 10 1 * *'
```

#### Manual Triggers
```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production
      version:
        description: 'Version to deploy'
        required: false
        default: 'latest'
        type: string
      dry_run:
        description: 'Perform dry run'
        required: false
        default: false
        type: boolean
```

### Conditional Execution

#### Path-based Conditions
```yaml
# Run only if source code changes
if: contains(github.event.head_commit.modified, 'src/') || contains(github.event.head_commit.modified, 'src-tauri/')

# Skip on documentation-only changes
if: "!contains(github.event.head_commit.message, '[skip ci]') && !contains(github.event.head_commit.message, '[docs only]')"

# Run only on specific branches
if: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/heads/release/')
```

#### Event-based Conditions
```yaml
# Different behavior for different events
- name: Deploy to staging
  if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
  
- name: Deploy to production
  if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')
  
- name: PR validation only
  if: github.event_name == 'pull_request'
```

---

## Environment Variables

### Global Environment Variables

#### Repository Level
```yaml
# .github/workflows/env.yml
env:
  # Application configuration
  NODE_VERSION: '22'
  RUST_VERSION: 'stable'
  PYTHON_VERSION: '3.11'
  
  # Build configuration
  BUILD_MODE: 'release'
  CARGO_TERM_COLOR: 'always'
  RUST_BACKTRACE: '1'
  
  # Security configuration
  SECURITY_SCAN_LEVEL: 'high'
  AUDIT_LEVEL: 'high'
  
  # Performance configuration
  CACHE_VERSION: 'v1'
  PARALLEL_JOBS: '4'
  
  # Notification configuration
  SLACK_CHANNEL: '#dev-ops'
  NOTIFICATION_LEVEL: 'errors'
```

#### Job-specific Environment Variables
```yaml
jobs:
  frontend-build:
    env:
      NODE_ENV: production
      VITE_API_URL: ${{ secrets.API_URL }}
      VITE_APP_VERSION: ${{ github.sha }}
      
  backend-build:
    env:
      CARGO_INCREMENTAL: '1'
      RUSTFLAGS: '-D warnings'
      TARGET_DIR: './target'
      
  security-scan:
    env:
      TRIVY_CACHE_DIR: '/tmp/trivy'
      CODEQL_EXTRACTOR_JAVASCRIPT_OPTION_TYPESCRIPT: 'true'
```

### Secret Management

#### Required Secrets
```yaml
# GitHub repository secrets configuration
secrets:
  # Core application secrets
  API_KEY: "Application API key"
  DATABASE_URL: "Database connection string"
  
  # Build and deployment secrets
  TAURI_PRIVATE_KEY: "Tauri code signing private key"
  TAURI_KEY_PASSWORD: "Tauri key password"
  
  # Third-party integrations
  SLACK_WEBHOOK_URL: "Slack notification webhook"
  DISCORD_WEBHOOK_URL: "Discord notification webhook"
  
  # Security and monitoring
  SECURITY_TOKEN: "Security scanning token"
  MONITORING_API_KEY: "Application monitoring API key"
```

#### Environment-specific Secrets
```yaml
# Production environment
environments:
  production:
    secrets:
      API_URL: "https://api.prod.example.com"
      DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
      
# Staging environment
  staging:
    secrets:
      API_URL: "https://api.staging.example.com"
      DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
```

---

## Security Configuration

### CodeQL Configuration

#### Language Matrix
```yaml
# .github/codeql/codeql-config.yml
name: "CodeQL Config"

disable-default-queries: false

queries:
  - name: security-and-quality
    uses: security-and-quality
  - name: security-extended
    uses: security-extended
    
languages:
  - javascript
  - typescript
  - rust

paths-ignore:
  - "tests/**"
  - "docs/**"
  - "node_modules/**"
  - "target/**"
  - "dist/**"
  - "coverage/**"
  
paths:
  - "src/**"
  - "src-tauri/**"
```

### Dependency Scanning

#### NPM Audit Configuration
```yaml
- name: NPM Security Audit
  run: |
    # Audit with different levels
    npm audit --audit-level=moderate --output=json > npm-audit-moderate.json || true
    npm audit --audit-level=high --output=json > npm-audit-high.json || true
    npm audit --audit-level=critical --output=json > npm-audit-critical.json || true
    
    # Check for critical vulnerabilities
    if [ $(jq '.metadata.vulnerabilities.critical' npm-audit-critical.json) -gt 0 ]; then
      echo "Critical vulnerabilities found!"
      exit 1
    fi
```

#### Cargo Audit Configuration
```yaml
- name: Cargo Security Audit
  working-directory: ./src-tauri
  run: |
    # Install cargo-audit if not present
    cargo install --force cargo-audit
    
    # Run audit with different outputs
    cargo audit --output json > cargo-audit.json || true
    cargo audit --output human > cargo-audit.txt || true
    
    # Check for vulnerabilities
    if cargo audit --deny warnings; then
      echo "No security vulnerabilities found"
    else
      echo "Security vulnerabilities detected"
      exit 1
    fi
```

### Permission Configuration

#### Minimal Permissions
```yaml
permissions:
  contents: read          # Read repository contents
  security-events: write  # Write security events
  issues: write          # Create issues for failures
  pull-requests: write   # Update PR status
  actions: read          # Read action results
  checks: write          # Write check results
```

#### Restrictive Permissions
```yaml
permissions:
  contents: read
  # All other permissions explicitly denied
```

---

## Automation Rules

### Auto-merge Configuration

#### Dependabot Auto-merge
```yaml
- name: Auto-merge Dependabot PRs
  if: |
    github.actor == 'dependabot[bot]' &&
    github.event.pull_request.draft == false &&
    contains(github.event.pull_request.labels.*.name, 'dependencies')
  run: |
    # Wait for checks to complete
    gh pr checks ${{ github.event.pull_request.number }} --watch
    
    # Auto-merge if checks pass
    if gh pr checks ${{ github.event.pull_request.number }} --json state | jq -r '.[] | select(.state != "SUCCESS") | length' == 0; then
      gh pr merge ${{ github.event.pull_request.number }} --auto --squash
    fi
```

#### Safe Auto-merge Rules
```yaml
- name: Safe Auto-merge
  if: |
    github.event.pull_request.user.login == 'dependabot[bot]' &&
    contains(github.event.pull_request.title, 'patch') &&
    !contains(github.event.pull_request.title, 'major')
  run: |
    # Additional safety checks
    if [ "$(gh pr view ${{ github.event.pull_request.number }} --json reviewDecision -q .reviewDecision)" = "APPROVED" ]; then
      gh pr merge ${{ github.event.pull_request.number }} --auto --squash
    fi
```

### Label Automation

#### Auto-labeling Configuration
```yaml
# .github/labeler.yml
'frontend':
  - 'src/**/*'
  - 'public/**/*'
  - 'package.json'

'backend':
  - 'src-tauri/**/*'
  - 'Cargo.toml'
  - 'Cargo.lock'

'documentation':
  - 'docs/**/*'
  - '*.md'
  - 'README.*'

'ci/cd':
  - '.github/**/*'
  - 'docker/**/*'
  - 'k8s/**/*'

'dependencies':
  - 'package-lock.json'
  - 'Cargo.lock'
  - 'yarn.lock'

'security':
  - 'tests/security/**/*'
  - '.github/workflows/security.yml'
```

#### Size-based Labeling
```yaml
- name: Add size labels
  uses: codelytv/pr-size-labeler@v1
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    xs_label: 'size/xs'
    xs_max_size: '10'
    s_label: 'size/s'
    s_max_size: '100'
    m_label: 'size/m'
    m_max_size: '500'
    l_label: 'size/l'
    l_max_size: '1000'
    xl_label: 'size/xl'
    fail_if_xl: 'false'
```

### Issue Automation

#### Failure Issue Creation
```yaml
# Custom action configuration
- name: Create failure issue
  if: failure()
  uses: ./.github/actions/create-failure-issue
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    job-name: ${{ github.job }}
    workflow-name: ${{ github.workflow }}
    error-message: ${{ job.status }}
    labels: 'ci-failure,automated,priority-high'
```

#### Issue Template Configuration
```yaml
# .github/ISSUE_TEMPLATE/ci-failure.yml
name: CI/CD Failure
description: Automated issue creation for CI/CD failures
title: "🚨 CI/CD Failure - [WORKFLOW] [JOB]"
labels: ["ci-failure", "automated"]
assignees:
  - meinzeug
body:
  - type: markdown
    attributes:
      value: |
        ## Automated CI/CD Failure Report
        This issue was automatically created due to a workflow failure.
  
  - type: input
    id: workflow
    attributes:
      label: Failed Workflow
      description: Name of the failed workflow
    validations:
      required: true
      
  - type: input
    id: job
    attributes:
      label: Failed Job
      description: Name of the failed job
    validations:
      required: true
```

---

## Integration Configuration

### Slack Integration

#### Webhook Configuration
```yaml
- name: Notify Slack on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    channel: '#dev-ops'
    webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
    fields: repo,message,commit,author,action,eventName,ref,workflow
    custom_payload: |
      {
        "attachments": [{
          "color": "danger",
          "title": "🚨 Workflow Failed",
          "text": "Workflow `${{ github.workflow }}` failed in repository `${{ github.repository }}`",
          "fields": [
            {
              "title": "Branch",
              "value": "${{ github.ref }}",
              "short": true
            },
            {
              "title": "Commit",
              "value": "${{ github.sha }}",
              "short": true
            },
            {
              "title": "Author",
              "value": "${{ github.actor }}",
              "short": true
            },
            {
              "title": "Run",
              "value": "https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}",
              "short": false
            }
          ]
        }]
      }
```

### Discord Integration

#### Webhook Notification
```yaml
- name: Discord notification
  uses: Ilshidur/action-discord@master
  env:
    DISCORD_WEBHOOK: ${{ secrets.DISCORD_WEBHOOK_URL }}
  with:
    args: |
      🚀 **Deployment Successful**
      Repository: `${{ github.repository }}`
      Branch: `${{ github.ref }}`
      Commit: `${{ github.sha }}`
      Author: `${{ github.actor }}`
```

### Email Integration

#### SMTP Configuration
```yaml
- name: Send email notification
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 587
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: "CI/CD Failure - ${{ github.repository }}"
    to: tech-leads@company.com
    from: noreply@company.com
    body: |
      Workflow failed in repository ${{ github.repository }}
      
      Details:
      - Workflow: ${{ github.workflow }}
      - Branch: ${{ github.ref }}
      - Commit: ${{ github.sha }}
      - Author: ${{ github.actor }}
      - Run: https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

---

## Performance Configuration

### Caching Strategy

#### Multi-level Caching
```yaml
# Level 1: Package manager caches
- name: Cache npm dependencies
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-

# Level 2: Build artifacts
- name: Cache build artifacts
  uses: actions/cache@v4
  with:
    path: |
      dist/
      target/release/
    key: ${{ runner.os }}-build-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-build-

# Level 3: Tool caches
- name: Cache tools
  uses: actions/cache@v4
  with:
    path: |
      ~/.cargo/bin/
      ~/.cargo/registry/index/
      ~/.cargo/registry/cache/
      ~/.cargo/git/db/
    key: ${{ runner.os }}-cargo-tools-${{ hashFiles('**/Cargo.lock') }}
```

#### Cache Management
```yaml
- name: Cache cleanup
  run: |
    # Clean old cache entries
    gh cache list --limit 100 | grep -E "^[0-9]+" | head -50 | awk '{print $1}' | xargs -I {} gh cache delete {}
  continue-on-error: true
```

### Parallel Execution

#### Job Parallelization
```yaml
strategy:
  matrix:
    task: [lint, test, build, security]
    node-version: [18, 20, 22]
  max-parallel: 6
  fail-fast: false
```

#### Step Parallelization
```yaml
- name: Run parallel tasks
  run: |
    # Run multiple tasks in parallel
    (npm run test:unit &)
    (npm run test:integration &)
    (npm run lint &)
    (npm run typecheck &)
    
    # Wait for all to complete
    wait
```

### Resource Optimization

#### Memory Management
```yaml
jobs:
  memory-intensive:
    runs-on: ubuntu-latest-4-cores
    env:
      NODE_OPTIONS: '--max-old-space-size=8192'
      CARGO_BUILD_JOBS: '4'
```

#### Timeout Configuration
```yaml
jobs:
  quick-tasks:
    timeout-minutes: 5
    
  build-tasks:
    timeout-minutes: 30
    
  comprehensive-tests:
    timeout-minutes: 60
```

---

## Monitoring Configuration

### Metrics Collection

#### Build Metrics
```yaml
- name: Collect build metrics
  run: |
    # Build time tracking
    start_time=$(date +%s)
    npm run build
    end_time=$(date +%s)
    build_duration=$((end_time - start_time))
    
    # Save metrics
    echo "build_duration_seconds=$build_duration" >> $GITHUB_OUTPUT
    echo "build_timestamp=$(date -Iseconds)" >> $GITHUB_OUTPUT
    
    # Send to monitoring service
    curl -X POST "${{ secrets.METRICS_ENDPOINT }}" \
      -H "Authorization: Bearer ${{ secrets.METRICS_TOKEN }}" \
      -d "{\"metric\": \"build_duration\", \"value\": $build_duration, \"timestamp\": \"$(date -Iseconds)\"}"
```

#### Performance Tracking
```yaml
- name: Performance benchmark
  run: |
    # Run performance tests
    npm run test:performance -- --json > performance-results.json
    
    # Extract metrics
    test_duration=$(jq '.duration' performance-results.json)
    memory_usage=$(jq '.memory.peak' performance-results.json)
    
    # Store as artifacts
    echo "test_duration=$test_duration" >> $GITHUB_OUTPUT
    echo "memory_usage=$memory_usage" >> $GITHUB_OUTPUT
```

### Health Checks

#### Service Health Monitoring
```yaml
- name: Health check
  run: |
    # Check service endpoints
    curl -f http://localhost:8080/health || exit 1
    curl -f http://localhost:3000/api/health || exit 1
    
    # Check database connectivity
    npm run db:check || exit 1
    
    # Check external dependencies
    curl -f https://api.external-service.com/status || exit 1
```

#### Dependency Health
```yaml
- name: Dependency health check
  run: |
    # Check for outdated dependencies
    npm outdated --json > outdated.json || true
    
    # Check for security vulnerabilities
    npm audit --json > audit.json || true
    
    # Check Rust dependencies
    cargo outdated --json > cargo-outdated.json || true
```

### Alerting Configuration

#### Alert Thresholds
```yaml
env:
  # Performance thresholds
  MAX_BUILD_TIME: '1800'  # 30 minutes
  MAX_TEST_TIME: '600'    # 10 minutes
  MIN_SUCCESS_RATE: '95'  # 95%
  
  # Security thresholds
  MAX_CRITICAL_VULNS: '0'
  MAX_HIGH_VULNS: '2'
  
  # Resource thresholds
  MAX_MEMORY_USAGE: '4096'  # 4GB
  MAX_DISK_USAGE: '10240'   # 10GB
```

#### Alert Rules
```yaml
- name: Performance alerts
  if: steps.benchmark.outputs.duration > env.MAX_BUILD_TIME
  run: |
    echo "⚠️ Build time exceeded threshold: ${{ steps.benchmark.outputs.duration }}s > ${MAX_BUILD_TIME}s"
    gh issue create \
      --title "⚠️ Performance Alert: Build time exceeded threshold" \
      --body "Build duration: ${{ steps.benchmark.outputs.duration }}s (threshold: ${MAX_BUILD_TIME}s)" \
      --label "performance,alert"

- name: Security alerts
  if: steps.security.outputs.critical_vulns > env.MAX_CRITICAL_VULNS
  run: |
    echo "🚨 Critical security vulnerabilities found: ${{ steps.security.outputs.critical_vulns }}"
    gh issue create \
      --title "🚨 Security Alert: Critical vulnerabilities detected" \
      --body "Critical vulnerabilities: ${{ steps.security.outputs.critical_vulns }}" \
      --label "security,critical,alert"
```

---

## Advanced Configuration

### Dynamic Configuration

#### Environment-based Configuration
```yaml
- name: Set environment configuration
  run: |
    if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
      echo "ENVIRONMENT=production" >> $GITHUB_ENV
      echo "API_URL=${{ secrets.PROD_API_URL }}" >> $GITHUB_ENV
    elif [[ "${{ github.ref }}" == "refs/heads/develop" ]]; then
      echo "ENVIRONMENT=staging" >> $GITHUB_ENV
      echo "API_URL=${{ secrets.STAGING_API_URL }}" >> $GITHUB_ENV
    else
      echo "ENVIRONMENT=development" >> $GITHUB_ENV
      echo "API_URL=http://localhost:3000" >> $GITHUB_ENV
    fi
```

#### Feature Flag Configuration
```yaml
- name: Configure feature flags
  run: |
    # Enable experimental features for develop branch
    if [[ "${{ github.ref }}" == "refs/heads/develop" ]]; then
      echo "ENABLE_EXPERIMENTAL=true" >> $GITHUB_ENV
      echo "ENABLE_BETA_FEATURES=true" >> $GITHUB_ENV
    fi
    
    # Production-only features
    if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
      echo "ENABLE_ANALYTICS=true" >> $GITHUB_ENV
      echo "ENABLE_MONITORING=true" >> $GITHUB_ENV
    fi
```

### Custom Actions Configuration

#### Reusable Action Configuration
```yaml
# .github/actions/setup-environment/action.yml
name: 'Setup Environment'
description: 'Setup Node.js and Rust environment with caching'
inputs:
  node-version:
    description: 'Node.js version'
    required: false
    default: '22'
  rust-version:
    description: 'Rust version'
    required: false
    default: 'stable'
  cache-key:
    description: 'Cache key prefix'
    required: false
    default: 'v1'

runs:
  using: 'composite'
  steps:
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: 'npm'
    
    - name: Setup Rust
      uses: dtolnay/rust-toolchain@stable
      with:
        toolchain: ${{ inputs.rust-version }}
    
    - name: Cache dependencies
      uses: actions/cache@v4
      with:
        path: |
          ~/.npm
          ~/.cargo
          target/
        key: ${{ inputs.cache-key }}-${{ runner.os }}-${{ hashFiles('**/package-lock.json', '**/Cargo.lock') }}
```

### Workflow Templates

#### Template Configuration
```yaml
# .github/workflow-templates/ci-template.yml
name: CI Template
description: Standard CI workflow template
iconName: octicon-verified
categories: [ci]

on:
  push:
    branches: [$default-branch]
  pull_request:
    branches: [$default-branch]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-environment
      - run: npm ci
      - run: npm test
      - run: npm run build
```

---

## Configuration Validation

### Schema Validation

#### Workflow Schema
```json
{
  "$schema": "https://json.schemastore.org/github-workflow.json",
  "name": "workflow-validation",
  "properties": {
    "name": {"type": "string", "minLength": 1},
    "on": {"type": "object"},
    "jobs": {
      "type": "object",
      "patternProperties": {
        "^[a-zA-Z_][a-zA-Z0-9_-]*$": {
          "type": "object",
          "required": ["runs-on"],
          "properties": {
            "runs-on": {"type": "string"},
            "timeout-minutes": {"type": "integer", "minimum": 1, "maximum": 360}
          }
        }
      }
    }
  },
  "required": ["name", "on", "jobs"]
}
```

### Linting Configuration

#### Action Linting
```yaml
# .github/workflows/validate-workflows.yml
name: Validate Workflows
on:
  pull_request:
    paths:
      - '.github/workflows/**'
      - '.github/actions/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate workflow syntax
        run: |
          # Install actionlint
          curl -sSLf https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash | bash
          
          # Validate all workflows
          ./actionlint .github/workflows/*.yml
      
      - name: Validate action metadata
        run: |
          for action in .github/actions/*/action.yml; do
            echo "Validating $action"
            # Add validation logic here
          done
```

---

This configuration reference provides comprehensive guidance for setting up, maintaining, and optimizing GitHub Actions workflows for the AutoDev-AI platform. Regular review and updates ensure optimal performance and security.

**Last Updated**: 2025-09-11  
**Configuration Version**: 1.0.0  
**Compatibility**: GitHub Actions latest  
**Next Review**: 2025-12-11