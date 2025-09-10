# Contributing to AutoDev-AI Neural Bridge Platform

We welcome contributions to the AutoDev-AI Neural Bridge Platform! This guide will help you get started with contributing to the project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community Guidelines](#community-guidelines)
- [Issue Management](#issue-management)
- [Security](#security)

## Code of Conduct

### Our Pledge
We are committed to making participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

#### Positive Behavior
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

#### Unacceptable Behavior
- The use of sexualized language or imagery and unwelcome sexual attention or advances
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

### Enforcement
Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team at conduct@autodev-ai.com. All complaints will be reviewed and investigated promptly and fairly.

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Rust 1.70+ and Cargo
- Git
- Docker and Docker Compose
- Basic understanding of TypeScript, Rust, and React

### Fork and Clone
```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/autodevai.git
cd autodevai

# Add the original repository as upstream
git remote add upstream https://github.com/meinzeug/autodevai.git
```

### Initial Setup
```bash
# Install dependencies
npm install

# Install Rust dependencies
cd src-tauri
cargo fetch

# Set up pre-commit hooks
cd ..
npm run prepare
```

## Development Setup

### Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Configure required variables
# OPENROUTER_API_KEY=your_key_here (optional for testing)
# CLAUDE_API_KEY=your_key_here (optional for testing)
```

### Development Workflow

#### Frontend Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix
```

#### Backend (Tauri) Development
```bash
cd src-tauri

# Run tests
cargo test

# Run with logging
RUST_LOG=debug cargo tauri dev

# Build release
cargo tauri build --release

# Format code
cargo fmt

# Lint code
cargo clippy
```

#### Docker Development
```bash
# Development environment
docker compose -f docker/docker-compose.dev.yml up -d

# Production-like environment
docker compose -f docker/docker-compose.prod.yml up -d

# Run tests in Docker
docker compose exec autodev-ai npm test
```

### Development Tools

#### Recommended VS Code Extensions
- Rust Analyzer
- TypeScript and JavaScript Language Features
- Prettier - Code formatter
- ESLint
- Tauri
- Docker

#### IDE Configuration (.vscode/settings.json)
```json
{
  "rust-analyzer.checkOnSave.command": "clippy",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Code Standards

### TypeScript/JavaScript Guidelines

#### Code Style
```typescript
// Use interfaces for object types
interface UserConfig {
  id: string;
  name: string;
  preferences: UserPreferences;
}

// Prefer const assertions for literal types
const SUPPORTED_MODELS = ['claude-3', 'gpt-4', 'codex'] as const;
type SupportedModel = typeof SUPPORTED_MODELS[number];

// Use proper error handling
async function fetchUserData(id: string): Promise<UserData> {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch user ${id}: ${error.message}`);
  }
}

// Document complex functions
/**
 * Orchestrates multiple AI agents for code generation
 * @param task - The development task to perform
 * @param agents - Array of agent configurations
 * @param options - Orchestration options
 * @returns Promise resolving to orchestration result
 */
async function orchestrateAgents(
  task: Task,
  agents: AgentConfig[],
  options: OrchestrationOptions
): Promise<OrchestrationResult> {
  // Implementation...
}
```

#### File Organization
```
src/
├── components/         # React components
│   ├── common/        # Shared components
│   ├── forms/         # Form components
│   └── layout/        # Layout components
├── hooks/             # Custom React hooks
├── services/          # API and service layers
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── stores/            # State management
└── pages/             # Page components
```

#### Naming Conventions
```typescript
// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_ENDPOINTS = {
  USERS: '/api/users',
  PROJECTS: '/api/projects'
} as const;

// Functions: camelCase
function calculateTokenUsage(prompt: string): number { }
async function generateCode(specification: Spec): Promise<Code> { }

// Components: PascalCase
function ProjectCard(props: ProjectCardProps) { }
function AIAssistantPanel() { }

// Types/Interfaces: PascalCase
interface ProjectConfiguration { }
type AIModel = 'claude-3' | 'gpt-4' | 'codex';
```

### Rust Guidelines

#### Code Style
```rust
// Use descriptive names
pub struct NeuralBridgeConfig {
    pub max_agents: usize,
    pub topology: TopologyType,
    pub coordination_strategy: CoordinationStrategy,
}

// Implement proper error handling
#[derive(Debug, thiserror::Error)]
pub enum BridgeError {
    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
    #[error("Agent communication failed")]
    CommunicationFailure,
    #[error("Neural network error: {0}")]
    NeuralNetwork(#[from] NeuralError),
}

// Use async/await properly
pub async fn orchestrate_agents(
    config: &NeuralBridgeConfig,
    task: Task,
) -> Result<OrchestrationResult, BridgeError> {
    let agents = spawn_agents(config).await?;
    let result = coordinate_execution(agents, task).await?;
    Ok(result)
}

// Document public APIs
/// Initializes the neural bridge with the specified configuration.
/// 
/// # Arguments
/// * `config` - Configuration for the neural bridge
/// * `models` - Available AI models
/// 
/// # Returns
/// A configured neural bridge instance
/// 
/// # Errors
/// Returns `BridgeError::InvalidConfig` if configuration is invalid
pub fn init_neural_bridge(
    config: NeuralBridgeConfig,
    models: Vec<AIModel>,
) -> Result<NeuralBridge, BridgeError> {
    // Implementation...
}
```

#### File Organization
```
src-tauri/src/
├── commands/           # Tauri command handlers
├── config/            # Configuration management
├── neural/            # Neural bridge implementation
│   ├── agents/        # AI agent management
│   ├── coordination/  # Agent coordination
│   └── models/        # AI model interfaces
├── services/          # Core services
├── utils/             # Utility functions
└── errors/            # Error types
```

### CSS/Styling Guidelines

#### Tailwind CSS Usage
```tsx
// Prefer semantic class combinations
function Button({ variant, children }: ButtonProps) {
  const baseClasses = "px-4 py-2 rounded-md font-medium transition-colors";
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700"
  };
  
  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </button>
  );
}
```

#### Component Styling
```css
/* Use CSS modules for component-specific styles */
.neural-bridge-panel {
  @apply bg-gradient-to-br from-blue-50 to-indigo-100;
  @apply border border-blue-200 rounded-lg shadow-sm;
}

.agent-card {
  @apply p-4 bg-white rounded-md shadow-sm border border-gray-200;
  @apply hover:shadow-md transition-shadow duration-200;
}

.code-editor {
  @apply font-mono text-sm leading-relaxed;
  @apply bg-gray-900 text-gray-100;
}
```

## Pull Request Process

### Before Creating a PR

#### 1. Update Your Fork
```bash
# Fetch latest changes from upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

#### 2. Make Your Changes
- Write clear, focused commits
- Follow code standards
- Add tests for new functionality
- Update documentation if needed

#### 3. Test Your Changes
```bash
# Run all tests
npm test
cd src-tauri && cargo test

# Run linting
npm run lint
cargo clippy

# Test Docker build
docker compose -f docker/docker-compose.dev.yml build
```

### PR Requirements

#### PR Template
```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Performance impact assessed

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

#### Commit Message Format
```
type(scope): description

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(neural-bridge): add multi-model consensus mechanism

Implement consensus building between multiple AI models to improve
code generation quality and reduce hallucinations.

- Add ConsensusBuilder class
- Implement majority voting algorithm
- Add configuration options for consensus strategies
- Include comprehensive tests

Closes #123
```

### Review Process

#### Reviewer Guidelines
- Check code quality and adherence to standards
- Verify tests cover new functionality
- Ensure documentation is updated
- Test the changes locally
- Provide constructive feedback

#### Author Guidelines
- Respond to feedback promptly
- Make requested changes in separate commits
- Keep discussions focused on the code
- Be open to suggestions and improvements

#### Merge Requirements
- [ ] All CI checks pass
- [ ] At least one approval from maintainer
- [ ] No conflicts with main branch
- [ ] All conversations resolved

## Testing Requirements

### Unit Tests

#### Frontend Testing (Jest + React Testing Library)
```typescript
// Component tests
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from './ProjectCard';

describe('ProjectCard', () => {
  const mockProject = {
    id: '1',
    name: 'Test Project',
    description: 'Test description'
  };

  it('renders project information', () => {
    render(<ProjectCard project={mockProject} />);
    
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const onSelect = jest.fn();
    render(<ProjectCard project={mockProject} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(mockProject);
  });
});
```

#### Backend Testing (Rust)
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;

    #[tokio::test]
    async fn test_neural_bridge_initialization() {
        let config = NeuralBridgeConfig {
            max_agents: 5,
            topology: TopologyType::Mesh,
            coordination_strategy: CoordinationStrategy::Adaptive,
        };

        let bridge = init_neural_bridge(config, vec![]).unwrap();
        assert_eq!(bridge.max_agents(), 5);
    }

    #[tokio::test]
    async fn test_agent_orchestration() {
        let mut bridge = create_test_bridge().await;
        let task = Task::new("test task");
        
        let result = bridge.orchestrate_agents(task).await;
        assert!(result.is_ok());
    }
}
```

### Integration Tests

#### API Testing
```typescript
import request from 'supertest';
import { app } from '../src/app';

describe('API Integration', () => {
  describe('POST /api/projects', () => {
    it('creates a new project', async () => {
      const projectData = {
        name: 'Test Project',
        template: 'react-typescript'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: 'Test Project',
        template: 'react-typescript'
      });
    });
  });
});
```

### End-to-End Tests

#### Playwright Tests
```typescript
import { test, expect } from '@playwright/test';

test.describe('AutoDev-AI Application', () => {
  test('creates a new project', async ({ page }) => {
    await page.goto('/');
    
    // Click new project button
    await page.click('[data-testid="new-project-button"]');
    
    // Fill project form
    await page.fill('[data-testid="project-name"]', 'E2E Test Project');
    await page.selectOption('[data-testid="template-select"]', 'react-typescript');
    
    // Submit form
    await page.click('[data-testid="create-project-button"]');
    
    // Verify project creation
    await expect(page.locator('[data-testid="project-title"]')).toContainText('E2E Test Project');
  });
});
```

### Test Coverage Requirements
- **Minimum Coverage**: 80% overall
- **Critical Paths**: 90% coverage required
- **New Features**: 95% coverage required
- **Bug Fixes**: Must include regression tests

### Running Tests
```bash
# Frontend tests
npm test
npm run test:coverage

# Backend tests
cd src-tauri
cargo test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

## Documentation

### Code Documentation

#### TypeScript Documentation
```typescript
/**
 * Neural Bridge configuration options
 */
interface NeuralBridgeOptions {
  /** Maximum number of concurrent agents */
  maxAgents: number;
  /** Network topology for agent communication */
  topology: 'mesh' | 'hierarchical' | 'ring';
  /** Coordination strategy */
  strategy: 'adaptive' | 'fixed' | 'learned';
}

/**
 * Initializes the neural bridge with specified configuration.
 * 
 * @param options Configuration options for the neural bridge
 * @returns Configured neural bridge instance
 * @throws {Error} When configuration is invalid
 * 
 * @example
 * ```typescript
 * const bridge = initNeuralBridge({
 *   maxAgents: 5,
 *   topology: 'mesh',
 *   strategy: 'adaptive'
 * });
 * ```
 */
export function initNeuralBridge(options: NeuralBridgeOptions): NeuralBridge {
  // Implementation...
}
```

#### Rust Documentation
```rust
/// Configuration for the Neural Bridge system.
///
/// The neural bridge coordinates multiple AI agents to work together
/// on complex development tasks.
///
/// # Examples
///
/// ```rust
/// use autodev_ai::neural::NeuralBridgeConfig;
///
/// let config = NeuralBridgeConfig {
///     max_agents: 5,
///     topology: TopologyType::Mesh,
///     coordination_strategy: CoordinationStrategy::Adaptive,
/// };
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NeuralBridgeConfig {
    /// Maximum number of agents that can be active simultaneously
    pub max_agents: usize,
    /// Network topology for agent communication
    pub topology: TopologyType,
    /// Strategy for coordinating agent actions
    pub coordination_strategy: CoordinationStrategy,
}
```

### User Documentation

#### API Documentation
- Use OpenAPI/Swagger specifications
- Include examples for all endpoints
- Document error responses
- Provide SDK usage examples

#### Feature Documentation
- Write clear feature descriptions
- Include screenshots and examples
- Provide configuration instructions
- Add troubleshooting guides

## Community Guidelines

### Communication Channels
- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: General questions, ideas
- **Discord**: Real-time community chat
- **Email**: security@autodev-ai.com for security issues

### Issue Labels
- `bug`: Something isn't working
- `enhancement`: New feature or improvement
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Community help needed
- `priority/high`: High priority issues
- `status/in-progress`: Currently being worked on

### Mentorship Program
We encourage experienced contributors to mentor newcomers:
- Guide first-time contributors
- Review beginner-friendly PRs
- Help with development environment setup
- Share knowledge about project architecture

## Issue Management

### Bug Reports

#### Bug Report Template
```markdown
## Bug Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
A clear and concise description of what you expected to happen.

## Screenshots
If applicable, add screenshots to help explain your problem.

## Environment
- OS: [e.g. Ubuntu 24.04]
- Browser: [e.g. Chrome 91]
- Version: [e.g. 1.0.0]

## Additional Context
Add any other context about the problem here.
```

### Feature Requests

#### Feature Request Template
```markdown
## Feature Description
A clear and concise description of the feature you'd like to see.

## Problem Statement
What problem does this feature solve?

## Proposed Solution
Describe your preferred solution.

## Alternatives Considered
Describe alternatives you've considered.

## Implementation Ideas
Any ideas on how this could be implemented?

## Additional Context
Add any other context or screenshots about the feature request here.
```

### Issue Triage Process
1. **New Issues**: Labeled as `needs-triage`
2. **Initial Review**: Maintainers review within 48 hours
3. **Labeling**: Appropriate labels applied
4. **Assignment**: Issues assigned to milestones
5. **Community**: `good first issue` for newcomers

## Security

### Reporting Security Vulnerabilities
**DO NOT** create public GitHub issues for security vulnerabilities.

Instead:
1. Email security@autodev-ai.com
2. Include detailed description
3. Provide steps to reproduce
4. Wait for initial response (within 48 hours)

### Security Review Process
1. **Assessment**: Severity and impact evaluation
2. **Timeline**: Fix timeline based on severity
3. **Development**: Private fix development
4. **Testing**: Thorough security testing
5. **Disclosure**: Coordinated public disclosure

### Security Best Practices
- Never commit API keys or secrets
- Use environment variables for configuration
- Validate all user inputs
- Implement proper authentication
- Use HTTPS in production
- Regular dependency updates
- Security scanning in CI/CD

### Responsible Disclosure
We follow responsible disclosure practices:
- Initial acknowledgment within 48 hours
- Regular updates on progress
- Credit to security researchers
- Public disclosure after fixes
- CVE assignment for significant issues

## Getting Help

### Documentation
- [User Guide](USER_GUIDE.md)
- [Deployment Guide](DEPLOYMENT.md)
- [API Documentation](https://api.autodev-ai.com/docs)

### Community Support
- **GitHub Discussions**: General questions
- **Discord**: Real-time chat
- **Stack Overflow**: Tag with `autodev-ai`

### Maintainer Contact
For project-specific questions:
- **General**: hello@autodev-ai.com
- **Security**: security@autodev-ai.com
- **Business**: business@autodev-ai.com

Thank you for contributing to AutoDev-AI Neural Bridge Platform! 🚀