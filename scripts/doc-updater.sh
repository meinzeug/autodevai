#!/bin/bash

# AutoDev-AI Documentation Updater
# Automatically updates documentation based on code changes and roadmap
# Usage: ./scripts/doc-updater.sh [--dry-run] [--force] [--roadmap-only]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCS_DIR="$PROJECT_ROOT/docs"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Options
DRY_RUN=false
FORCE_UPDATE=false
ROADMAP_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE_UPDATE=true
            shift
            ;;
        --roadmap-only)
            ROADMAP_ONLY=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--dry-run] [--force] [--roadmap-only]"
            exit 1
            ;;
    esac
done

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Initialize
setup_environment() {
    log_info "Setting up documentation update environment..."
    
    cd "$PROJECT_ROOT"
    
    # Ensure docs directories exist
    mkdir -p "$DOCS_DIR"/{api,roadmap,security,architecture,guides,reports}
    
    # Install dependencies if needed
    if [ ! -f "node_modules/.bin/typedoc" ] && [ -f "package.json" ]; then
        log_info "Installing documentation dependencies..."
        npm install --save-dev typedoc @typescript-eslint/parser
    fi
}

# Update API documentation
update_api_docs() {
    log_info "Updating API documentation..."
    
    # Generate TypeScript API docs
    if [ -f "tsconfig.json" ] && command -v npx >/dev/null; then
        log_info "Generating TypeScript API documentation..."
        
        if [ "$DRY_RUN" = false ]; then
            npx typedoc --out "$DOCS_DIR/api/typescript" \
                --readme README.md \
                --name "AutoDev-AI API Documentation" \
                --theme default \
                --excludePrivate \
                --excludeProtected \
                src/ || log_warning "TypeScript documentation generation failed"
        else
            log_info "DRY RUN - Would generate TypeScript docs"
        fi
    fi
    
    # Generate Rust API docs
    if [ -d "src-tauri" ]; then
        log_info "Generating Rust API documentation..."
        
        cd "$PROJECT_ROOT/src-tauri"
        
        if [ "$DRY_RUN" = false ]; then
            cargo doc --no-deps --document-private-items --open || log_warning "Rust documentation generation failed"
            
            # Copy generated docs to our docs directory
            if [ -d "target/doc" ]; then
                cp -r target/doc "$DOCS_DIR/api/rust" || log_warning "Failed to copy Rust docs"
            fi
        else
            log_info "DRY RUN - Would generate Rust docs"
        fi
        
        cd "$PROJECT_ROOT"
    fi
    
    # Update API index
    update_api_index
}

# Update API index file
update_api_index() {
    local api_index="$DOCS_DIR/api/README.md"
    
    cat > "$api_index" << EOF
# 📚 AutoDev-AI API Documentation

**Generated:** $(date -u)  
**Version:** $(cat package.json | jq -r '.version' 2>/dev/null || echo "Unknown")

## Available Documentation

### TypeScript/Frontend API
- [TypeScript API Documentation](./typescript/index.html)
- React components and hooks
- Service layer interfaces
- Type definitions

### Rust/Backend API
- [Rust API Documentation](./rust/index.html)
- Tauri commands and handlers
- Core business logic
- System interfaces

## Quick Reference

### Key Components

#### Frontend (TypeScript)
- \`AiOrchestrationPanel\` - Main AI orchestration interface
- \`updateNotifications\` - System update management
- \`ai-orchestration\` - Core AI service layer

#### Backend (Rust)
- \`commands\` - Tauri command handlers
- \`ai_orchestration\` - AI orchestration logic
- \`security\` - Security and audit systems

### API Endpoints

#### Tauri Commands
- \`execute_ai_workflow\` - Execute AI workflows
- \`get_system_status\` - System health checks
- \`update_configuration\` - Configuration management

### Usage Examples

#### Basic AI Workflow Execution
\`\`\`typescript
import { invoke } from '@tauri-apps/api/tauri';

const result = await invoke('execute_ai_workflow', {
  workflowType: 'code-analysis',
  parameters: { target: 'src/' }
});
\`\`\`

#### Security Audit
\`\`\`typescript
const auditResult = await invoke('run_security_audit', {
  scope: 'full'
});
\`\`\`

## Development

### Building Documentation
\`\`\`bash
# Generate all documentation
npm run docs:generate

# TypeScript only
npx typedoc

# Rust only
cd src-tauri && cargo doc
\`\`\`

### Contributing
1. Update code comments and documentation strings
2. Run documentation generation
3. Review generated docs for accuracy
4. Submit with pull request

---
*Auto-generated by AutoDev-AI Documentation Updater*
EOF

    log_success "API documentation index updated"
}

# Update roadmap documentation
update_roadmap_docs() {
    log_info "Updating roadmap documentation..."
    
    local roadmap_file="$DOCS_DIR/roadmap.md"
    
    if [ ! -f "$roadmap_file" ]; then
        log_warning "Roadmap file not found, creating template..."
        create_roadmap_template
        return
    fi
    
    # Backup existing roadmap
    if [ "$DRY_RUN" = false ]; then
        cp "$roadmap_file" "$roadmap_file.backup-$TIMESTAMP"
    fi
    
    # Extract current status from various sources
    local completed_features=""
    local security_status=""
    local performance_metrics=""
    
    # Check for completed features by analyzing git log
    if git log --oneline --since="1 month ago" --grep="feat:" | wc -l > /dev/null; then
        local recent_features=$(git log --oneline --since="1 month ago" --grep="feat:" | head -5)
        completed_features="Recent completed features:\n$recent_features"
    fi
    
    # Check security status
    if [ -f "$DOCS_DIR/security-reports/combined/security-report-"*.json ]; then
        local latest_security=$(ls -t "$DOCS_DIR/security-reports/combined/security-report-"*.json | head -1)
        if [ -f "$latest_security" ]; then
            local vuln_count=$(cat "$latest_security" | jq '.summary.total_vulnerabilities // 0')
            security_status="Security Status: $vuln_count vulnerabilities found ($(date -r "$latest_security"))"
        fi
    fi
    
    # Update roadmap with current progress
    update_roadmap_progress "$roadmap_file" "$completed_features" "$security_status"
}

# Update roadmap progress
update_roadmap_progress() {
    local roadmap_file="$1"
    local completed_features="$2"
    local security_status="$3"
    
    log_info "Updating roadmap progress tracking..."
    
    # Create updated roadmap content
    local temp_roadmap="/tmp/roadmap-update-$TIMESTAMP.md"
    
    # Read existing roadmap and update progress sections
    if [ "$DRY_RUN" = false ]; then
        # Add progress update section
        cat >> "$temp_roadmap" << EOF

## 📊 Progress Update - $(date -u +"%Y-%m-%d")

### Recently Completed
$completed_features

### Current Status
- **Build Status:** $(get_build_status)
- **Test Coverage:** $(get_test_coverage)
- **Security:** $security_status
- **Documentation:** Updated $(date -u)

### Next Sprint Planning
- Review and prioritize pending roadmap items
- Update estimates based on recent velocity
- Identify dependencies and blockers

EOF
        
        # Append to existing roadmap
        cat "$roadmap_file" "$temp_roadmap" > "$roadmap_file.new"
        mv "$roadmap_file.new" "$roadmap_file"
        rm "$temp_roadmap"
        
        log_success "Roadmap updated with current progress"
    else
        log_info "DRY RUN - Would update roadmap with progress"
    fi
}

# Create roadmap template if it doesn't exist
create_roadmap_template() {
    local roadmap_file="$DOCS_DIR/roadmap.md"
    
    cat > "$roadmap_file" << 'EOF'
# 🗺️ AutoDev-AI Development Roadmap

## Current Sprint (Auto-Updated)

### 🎯 Sprint Goals
- Implement daily maintenance pipeline
- Enhance security scanning automation
- Improve documentation coverage

### 📋 Active Tasks
- [ ] Complete CI/CD pipeline implementation
- [ ] Security vulnerability automation
- [ ] Documentation auto-generation
- [ ] Performance monitoring dashboard

## Upcoming Sprints

### Sprint 2: AI Enhancement
- [ ] Advanced AI orchestration
- [ ] Neural network integration
- [ ] Claude-Flow optimization
- [ ] Hive-mind coordination

### Sprint 3: Platform Expansion
- [ ] Multi-platform deployment
- [ ] Cloud integration
- [ ] API expansion
- [ ] Third-party integrations

## Long-term Vision

### Q1 Goals
- Complete core platform functionality
- Achieve 90%+ test coverage
- Implement comprehensive security
- Launch beta version

### Q2 Goals
- Production release
- Community building
- Plugin ecosystem
- Advanced AI features

## Metrics & KPIs

### Development Metrics
- **Code Quality:** Maintain >90% test coverage
- **Security:** Zero critical vulnerabilities
- **Performance:** <2s response times
- **Documentation:** 100% API coverage

### User Metrics
- **Adoption:** Target 1000+ beta users
- **Satisfaction:** >4.5/5 rating
- **Retention:** >80% monthly retention
- **Support:** <24h response time

## Risk Management

### Technical Risks
- AI model reliability
- Performance at scale
- Security vulnerabilities
- Third-party dependencies

### Mitigation Strategies
- Comprehensive testing
- Security-first development
- Performance monitoring
- Dependency management

---
*This roadmap is automatically updated by the maintenance pipeline*
EOF

    log_success "Roadmap template created"
}

# Update architecture documentation
update_architecture_docs() {
    if [ "$ROADMAP_ONLY" = true ]; then
        return
    fi
    
    log_info "Updating architecture documentation..."
    
    local arch_file="$DOCS_DIR/architecture/ARCHITECTURE.md"
    mkdir -p "$(dirname "$arch_file")"
    
    # Generate architecture overview
    cat > "$arch_file" << 'EOF'
# 🏗️ AutoDev-AI System Architecture

**Last Updated:** $(date -u)

## System Overview

AutoDev-AI is a neural bridge platform that orchestrates AI workflows using Claude-Flow and OpenRouter integration. The system follows a modular, microservices-inspired architecture with strong security and performance foundations.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Services   │
│   (React/TS)    │◄──►│   (Rust/Tauri)  │◄──►│   (Claude-Flow) │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ UI Components│ │    │ │ Commands    │ │    │ │ Orchestrator│ │
│ │ Services    │ │    │ │ Security    │ │    │ │ Neural Net  │ │
│ │ State Mgmt  │ │    │ │ Performance │ │    │ │ Hive Mind   │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Component Details

### Frontend Layer (TypeScript/React)
- **UI Components**: Modular React components with Tailwind CSS
- **State Management**: Zustand for global state
- **Service Layer**: API abstraction and caching
- **Type Safety**: Full TypeScript coverage

### Backend Layer (Rust/Tauri)
- **Commands**: Tauri command handlers for frontend integration
- **Security**: Audit logging and validation
- **Performance**: Profiling and optimization
- **AI Integration**: Claude-Flow orchestration

### AI Services Layer
- **Claude-Flow**: Multi-agent orchestration
- **Neural Networks**: WASM-accelerated inference
- **Hive Mind**: Distributed AI coordination
- **OpenRouter**: External AI service integration

## Data Flow

1. **User Interaction**: Frontend captures user actions
2. **Command Dispatch**: Tauri commands bridge frontend/backend
3. **Business Logic**: Rust handlers process requests
4. **AI Orchestration**: Claude-Flow manages AI workflows
5. **Response**: Results flow back through the stack

## Security Architecture

### Defense in Depth
- **Input Validation**: All inputs sanitized and validated
- **Command Filtering**: Security layer filters dangerous operations
- **Audit Logging**: Complete audit trail of all actions
- **Encryption**: Data encrypted at rest and in transit

### Security Components
- **Audit Logger**: Comprehensive logging system
- **Command Validator**: Input validation and sanitization
- **Security Scanner**: Automated vulnerability detection
- **Access Control**: Role-based permissions

## Performance Architecture

### Optimization Strategies
- **WASM Acceleration**: Neural network inference
- **Async Processing**: Non-blocking operations
- **Caching**: Multi-layer caching strategy
- **Profiling**: Continuous performance monitoring

### Monitoring
- **Real-time Metrics**: Performance dashboard
- **Bottleneck Detection**: Automated analysis
- **Resource Monitoring**: CPU/Memory tracking
- **SLA Monitoring**: Response time tracking

## Deployment Architecture

### Development
- **Local Development**: Tauri dev environment
- **Testing**: Comprehensive test suites
- **CI/CD**: Automated pipeline with security scanning

### Production
- **Container Deployment**: Docker-based deployment
- **Kubernetes**: Orchestration and scaling
- **Monitoring**: Full observability stack
- **Backup**: Automated backup strategies

## Technology Stack

### Core Technologies
- **Frontend**: React 18+, TypeScript, Tailwind CSS
- **Backend**: Rust, Tauri 2.0, Tokio
- **AI**: Claude-Flow, OpenRouter, Neural Networks
- **Database**: SQLite (local), PostgreSQL (production)

### Development Tools
- **Build**: Vite, Cargo, Docker
- **Testing**: Vitest, Cargo Test, Playwright
- **Quality**: ESLint, Clippy, Security Scanners
- **CI/CD**: GitHub Actions, Docker

## Scalability Considerations

### Horizontal Scaling
- **Microservices**: Service decomposition
- **Load Balancing**: Traffic distribution
- **Caching**: Redis for distributed caching
- **Message Queues**: Async job processing

### Vertical Scaling
- **Resource Optimization**: Memory and CPU tuning
- **Database Optimization**: Query optimization
- **Network Optimization**: CDN and compression
- **AI Optimization**: Model compression and caching

## Future Architecture

### Planned Enhancements
- **Multi-cloud Deployment**: Cloud provider abstraction
- **Edge Computing**: Edge AI inference
- **Blockchain Integration**: Decentralized features
- **Advanced AI**: Next-gen model integration

---
*Auto-generated architecture documentation*
EOF

    log_success "Architecture documentation updated"
}

# Update guides and tutorials
update_guides() {
    if [ "$ROADMAP_ONLY" = true ]; then
        return
    fi
    
    log_info "Updating user guides and tutorials..."
    
    local guides_dir="$DOCS_DIR/guides"
    mkdir -p "$guides_dir"
    
    # Generate getting started guide
    cat > "$guides_dir/getting-started.md" << 'EOF'
# 🚀 Getting Started with AutoDev-AI

## Quick Start

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/meinzeug/autodevai.git
cd autodevai

# Install dependencies
npm install

# Install Rust dependencies
cd src-tauri && cargo build && cd ..
```

### 2. Development Setup
```bash
# Start development server
npm run tauri:dev

# Run tests
npm run test

# Run security scan
npm run security:scan
```

### 3. Basic Usage
1. Launch the application
2. Configure AI orchestration settings
3. Start your first AI workflow
4. Monitor progress in the dashboard

## Configuration

### Environment Variables
```bash
# API Keys
OPENROUTER_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here

# GitHub Integration
GITHUB_TOKEN=your_token_here
GITHUB_REPOSITORY=owner/repo
```

### Claude-Flow Setup
```bash
# Initialize Claude-Flow
npm run claude-flow:init

# Start swarm coordination
npm run claude-flow:swarm
```

## Common Tasks

### Running AI Workflows
```typescript
import { invoke } from '@tauri-apps/api/tauri';

const result = await invoke('execute_ai_workflow', {
  type: 'code-analysis',
  target: 'src/',
  options: { depth: 'full' }
});
```

### Security Scanning
```bash
# Full security scan
./scripts/security-scanner.sh --report

# Fix vulnerabilities
./scripts/security-scanner.sh --fix
```

### Performance Monitoring
```bash
# Start monitoring dashboard
python3 scripts/pipeline-monitor.py

# View dashboard at http://localhost:8080
```

## Troubleshooting

### Common Issues
1. **Build Failures**: Check Rust/Node versions
2. **API Errors**: Verify API keys and network
3. **Performance Issues**: Check system resources

### Getting Help
- Check the [FAQ](./faq.md)
- Review [Troubleshooting Guide](./troubleshooting.md)
- Open an issue on GitHub

---
*Updated automatically by documentation system*
EOF

    log_success "User guides updated"
}

# Helper functions
get_build_status() {
    if [ -f ".github/workflows/ci.yml" ]; then
        echo "CI configured"
    else
        echo "No CI"
    fi
}

get_test_coverage() {
    if command -v npm >/dev/null && [ -f "package.json" ]; then
        # Try to get coverage from recent test runs
        if [ -f "coverage/lcov.info" ]; then
            echo "Coverage available"
        else
            echo "No coverage data"
        fi
    else
        echo "No tests configured"
    fi
}

# Commit documentation changes
commit_docs() {
    if [ "$DRY_RUN" = true ]; then
        log_info "DRY RUN - Would commit documentation changes"
        return
    fi
    
    cd "$PROJECT_ROOT"
    
    # Check if there are changes to commit
    if ! git diff --quiet HEAD -- docs/; then
        log_info "Committing documentation updates..."
        
        git add docs/
        git commit -m "📚 docs: Auto-update documentation

- API documentation regenerated
- Roadmap progress updated
- Architecture documentation refreshed
- User guides updated

Auto-generated: $TIMESTAMP" || log_warning "Failed to commit documentation changes"
        
        log_success "Documentation changes committed"
    else
        log_info "No documentation changes to commit"
    fi
}

# Main execution
main() {
    log_info "Starting AutoDev-AI Documentation Updater..."
    log_info "Timestamp: $TIMESTAMP"
    log_info "Mode: $([ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "LIVE")"
    log_info "Roadmap only: $([ "$ROADMAP_ONLY" = true ] && echo "YES" || echo "NO")"
    
    setup_environment
    
    # Update documentation components
    if [ "$ROADMAP_ONLY" = true ]; then
        update_roadmap_docs
    else
        update_api_docs
        update_roadmap_docs
        update_architecture_docs
        update_guides
    fi
    
    # Commit changes if not dry run
    commit_docs
    
    log_success "Documentation update completed successfully!"
    
    # Summary
    echo
    log_info "Documentation Update Summary:"
    echo "  - API docs: $([ "$ROADMAP_ONLY" = true ] && echo "Skipped" || echo "Updated")"
    echo "  - Roadmap: Updated"
    echo "  - Architecture: $([ "$ROADMAP_ONLY" = true ] && echo "Skipped" || echo "Updated")"
    echo "  - Guides: $([ "$ROADMAP_ONLY" = true ] && echo "Skipped" || echo "Updated")"
    echo "  - Mode: $([ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "LIVE")"
}

# Run main function
main "$@"