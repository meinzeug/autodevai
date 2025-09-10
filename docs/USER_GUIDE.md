# AutoDev-AI Neural Bridge Platform - User Guide

Complete user guide for getting started with the AutoDev-AI Neural Bridge Platform.

## Table of Contents
- [Quick Start](#quick-start)
- [Installation](#installation)
- [First Project Setup](#first-project-setup)
- [AI Services Configuration](#ai-services-configuration)
- [Using OpenRouter](#using-openrouter)
- [Using Claude-Flow](#using-claude-flow)
- [Using Codex](#using-codex)
- [Project Management](#project-management)
- [Neural Bridge Features](#neural-bridge-features)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

## Quick Start

### 1. Launch Application
```bash
# If installed via package manager
autodev-ai

# Or if running from Docker
docker compose -f docker/docker-compose.prod.yml up -d
# Then open http://localhost:50000
```

### 2. Initial Setup Wizard
1. **Welcome Screen**: Click "Get Started"
2. **AI Services**: Configure your API keys
3. **Project Directory**: Choose your workspace
4. **Neural Settings**: Configure bridge parameters
5. **Complete**: Start your first project

### 3. Create Your First Project
1. Click "New Project"
2. Select template (React, Node.js, Python, etc.)
3. Configure project settings
4. Choose AI assistants
5. Start coding with AI assistance

## Installation

### Desktop Application (Recommended)

#### Windows
```powershell
# Download and install from releases
Invoke-WebRequest -Uri "https://releases.autodev-ai.com/windows/autodev-ai-setup.exe" -OutFile "autodev-ai-setup.exe"
.\autodev-ai-setup.exe
```

#### macOS
```bash
# Install via Homebrew
brew tap autodev-ai/tap
brew install autodev-ai

# Or download DMG
curl -L "https://releases.autodev-ai.com/macos/autodev-ai.dmg" -o autodev-ai.dmg
open autodev-ai.dmg
```

#### Ubuntu/Debian
```bash
# Add repository
curl -fsSL https://releases.autodev-ai.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/autodev-ai.gpg
echo "deb [signed-by=/usr/share/keyrings/autodev-ai.gpg] https://releases.autodev-ai.com/deb stable main" | sudo tee /etc/apt/sources.list.d/autodev-ai.list

# Install
sudo apt update
sudo apt install autodev-ai
```

### Docker Installation (Advanced)

#### Quick Setup
```bash
# Clone repository
git clone https://github.com/meinzeug/autodevai.git
cd autodevai

# Start with Docker Compose
docker compose up -d

# Access at http://localhost:50000
```

#### Production Setup
```bash
# Use production configuration
docker compose -f docker/docker-compose.prod.yml up -d

# Configure SSL (optional)
# See DEPLOYMENT.md for complete production setup
```

### From Source (Developers)

#### Prerequisites
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install Tauri dependencies
sudo apt install -y libwebkit2gtk-4.0-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

#### Build & Install
```bash
# Clone and build
git clone https://github.com/meinzeug/autodevai.git
cd autodevai

# Install dependencies
npm install

# Build application
npm run build
cd src-tauri
cargo tauri build

# Install system-wide
sudo cp target/release/neural-bridge-platform /usr/local/bin/autodev-ai
```

## First Project Setup

### 1. Project Creation Wizard

#### Step 1: Choose Template
- **Web Development**: React, Vue, Angular, Svelte
- **Backend**: Node.js, Python Flask/Django, Rust Axum
- **Mobile**: React Native, Flutter
- **AI/ML**: Python ML, Jupyter Notebooks
- **Custom**: Blank project with custom configuration

#### Step 2: Project Configuration
```json
{
  "name": "my-awesome-project",
  "template": "react-typescript",
  "aiAssistants": ["claude-3", "codex", "claude-flow"],
  "features": {
    "autoCompletion": true,
    "codeReview": true,
    "testing": true,
    "documentation": true
  }
}
```

#### Step 3: Directory Structure
```
my-awesome-project/
├── src/
│   ├── components/
│   ├── pages/
│   ├── utils/
│   └── main.tsx
├── .autodev/
│   ├── config.json
│   ├── neural-bridge.json
│   └── assistants/
├── package.json
├── tsconfig.json
└── README.md
```

### 2. Neural Bridge Configuration

#### Basic Setup
```json
{
  "neuralBridge": {
    "enabled": true,
    "models": ["claude-3-sonnet", "gpt-4-turbo", "codex"],
    "features": {
      "codeGeneration": true,
      "codeReview": true,
      "debugging": true,
      "testing": true,
      "documentation": true
    },
    "integrations": {
      "git": true,
      "npm": true,
      "docker": true
    }
  }
}
```

#### Advanced Settings
```json
{
  "neuralBridge": {
    "topology": "hierarchical",
    "maxAgents": 5,
    "coordination": {
      "strategy": "adaptive",
      "memoryPersistence": true,
      "crossSessionLearning": true
    },
    "performance": {
      "parallelExecution": true,
      "tokenOptimization": true,
      "cacheEnabled": true
    }
  }
}
```

## AI Services Configuration

### 1. OpenRouter Setup

#### Get API Key
1. Visit [OpenRouter](https://openrouter.ai)
2. Sign up and create account
3. Navigate to "API Keys"
4. Generate new key
5. Copy key for configuration

#### Configure in AutoDev-AI
```bash
# Via UI: Settings > AI Services > OpenRouter
# Enter API key and select models

# Via CLI:
autodev-ai config set openrouter.api_key "your_key_here"
autodev-ai config set openrouter.models "claude-3-sonnet,gpt-4-turbo"
```

#### Available Models
- **Claude**: claude-3-opus, claude-3-sonnet, claude-3-haiku
- **OpenAI**: gpt-4-turbo, gpt-4, gpt-3.5-turbo
- **Google**: gemini-pro, gemini-pro-vision
- **Anthropic**: claude-instant-1, claude-2
- **Meta**: llama-2-70b, codellama-34b

### 2. Claude-Flow Setup

#### Installation
```bash
# Install Claude-Flow
npm install -g claude-flow@alpha

# Initialize in project
cd your-project
npx claude-flow init

# Configure MCP servers
claude mcp add claude-flow npx claude-flow@alpha mcp start
```

#### Configuration
```json
{
  "claudeFlow": {
    "enabled": true,
    "features": {
      "autoTopologySelection": true,
      "parallelExecution": true,
      "neuralTraining": true,
      "selfHealingWorkflows": true
    },
    "performance": {
      "maxAgents": 10,
      "defaultTopology": "mesh",
      "executionStrategy": "adaptive"
    },
    "integrations": {
      "github": true,
      "docker": true,
      "testing": true
    }
  }
}
```

#### SPARC Workflow
```bash
# Run complete TDD workflow
npx claude-flow sparc tdd "implement user authentication"

# Specific modes
npx claude-flow sparc run architect "design REST API"
npx claude-flow sparc run spec-pseudocode "user login flow"

# Batch processing
npx claude-flow sparc batch "spec,arch,code" "payment system"
```

## Using OpenRouter

### 1. Model Selection

#### For Code Generation
```json
{
  "tasks": {
    "codeGeneration": {
      "primaryModel": "claude-3-sonnet",
      "fallbackModel": "gpt-4-turbo",
      "settings": {
        "temperature": 0.3,
        "maxTokens": 4000,
        "topP": 0.9
      }
    }
  }
}
```

#### For Code Review
```json
{
  "tasks": {
    "codeReview": {
      "primaryModel": "claude-3-opus",
      "settings": {
        "temperature": 0.1,
        "maxTokens": 2000,
        "focusAreas": ["security", "performance", "maintainability"]
      }
    }
  }
}
```

### 2. Usage Examples

#### Interactive Coding
```javascript
// Type comment to generate code
// TODO: Create user authentication middleware

// AutoDev-AI will generate:
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Access denied' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

#### Code Explanation
```python
# Select code and press Ctrl+Shift+E for explanation
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

# AutoDev-AI explains the algorithm, complexity, and use cases
```

## Using Claude-Flow

### 1. Agent Orchestration

#### Simple Task
```bash
# Single agent task
autodev-ai flow run --agent coder "implement login form"
```

#### Complex Workflow
```bash
# Multi-agent coordination
autodev-ai flow orchestrate \
  --agents "architect,coder,tester,reviewer" \
  --task "build e-commerce checkout system" \
  --topology mesh \
  --strategy adaptive
```

### 2. SPARC Methodology

#### Complete Workflow
```bash
# Full SPARC pipeline
autodev-ai sparc pipeline "user management system"

# This runs:
# 1. Specification - Requirements analysis
# 2. Pseudocode - Algorithm design  
# 3. Architecture - System design
# 4. Refinement - TDD implementation
# 5. Completion - Integration testing
```

#### Individual Phases
```bash
# Specification phase
autodev-ai sparc spec "shopping cart functionality"

# Architecture phase  
autodev-ai sparc arch "microservices design for inventory"

# Test-driven development
autodev-ai sparc tdd "payment processing"
```

### 3. Neural Training

#### Pattern Learning
```bash
# Train on successful patterns
autodev-ai neural train --pattern "successful-api-design" \
  --examples "src/examples/api-patterns/"

# Apply learned patterns
autodev-ai neural apply --pattern "successful-api-design" \
  --target "src/api/new-endpoint.js"
```

## Using Codex

### 1. Configuration

#### API Setup
```json
{
  "codex": {
    "enabled": true,
    "apiKey": "your_openai_key",
    "model": "code-davinci-002",
    "settings": {
      "temperature": 0.1,
      "maxTokens": 1000,
      "topP": 1,
      "frequencyPenalty": 0,
      "presencePenalty": 0
    }
  }
}
```

#### Integration Settings
```json
{
  "integrations": {
    "vscode": true,
    "intellij": true,
    "vim": true,
    "emacs": true
  },
  "features": {
    "inlineCompletion": true,
    "contextualSuggestions": true,
    "multiFileAwareness": true
  }
}
```

### 2. Usage Patterns

#### Function Generation
```javascript
// Type function signature and description
/**
 * Calculates compound interest
 * @param {number} principal - Initial amount
 * @param {number} rate - Interest rate (decimal)
 * @param {number} time - Time period in years
 * @param {number} n - Compounding frequency per year
 * @returns {number} Final amount
 */
function calculateCompoundInterest(principal, rate, time, n) {
  // Codex generates implementation
  return principal * Math.pow((1 + rate / n), n * time);
}
```

#### Test Generation
```javascript
// Existing function
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Type comment to generate tests
// TODO: Generate comprehensive tests for fibonacci function

// Codex generates:
describe('fibonacci', () => {
  test('should return 0 for n=0', () => {
    expect(fibonacci(0)).toBe(0);
  });
  
  test('should return 1 for n=1', () => {
    expect(fibonacci(1)).toBe(1);
  });
  
  test('should calculate correct fibonacci sequence', () => {
    expect(fibonacci(5)).toBe(5);
    expect(fibonacci(10)).toBe(55);
  });
});
```

## Project Management

### 1. Workspace Organization

#### Project Structure
```
~/autodev-workspace/
├── projects/
│   ├── web-app/
│   ├── api-server/
│   └── mobile-app/
├── templates/
│   ├── react-ts/
│   ├── node-express/
│   └── python-flask/
├── shared/
│   ├── components/
│   ├── utils/
│   └── types/
└── .autodev/
    ├── global-config.json
    ├── templates/
    └── assistants/
```

#### Project Settings
```json
{
  "project": {
    "name": "My Web App",
    "version": "1.0.0",
    "type": "web-application",
    "framework": "react",
    "language": "typescript"
  },
  "aiSettings": {
    "primaryAssistant": "claude-3-sonnet",
    "codeStyle": "google",
    "testFramework": "jest",
    "documentationStyle": "jsdoc"
  },
  "development": {
    "autoSave": true,
    "formatOnSave": true,
    "lintOnSave": true,
    "testOnSave": false
  }
}
```

### 2. Version Control Integration

#### Git Integration
```bash
# Initialize git with AI assistance
autodev-ai git init --with-ai-hooks

# AI-powered commit messages
autodev-ai git commit --ai-message

# Branch management with AI
autodev-ai git branch --ai-suggest "implement user auth"
```

#### AI-Generated Commit Messages
```bash
# Stage changes
git add .

# Generate commit message
autodev-ai git message

# Output: "feat(auth): implement JWT-based user authentication
# 
# - Add login/logout endpoints
# - Implement middleware for route protection  
# - Add password hashing with bcrypt
# - Include comprehensive test coverage"
```

### 3. Collaborative Development

#### Team Settings
```json
{
  "team": {
    "members": [
      {"name": "Alice", "role": "lead", "aiPreferences": "claude-3-opus"},
      {"name": "Bob", "role": "backend", "aiPreferences": "gpt-4-turbo"},
      {"name": "Carol", "role": "frontend", "aiPreferences": "claude-3-sonnet"}
    ],
    "sharedTemplates": true,
    "aiConsensus": true,
    "codeReviewAI": true
  }
}
```

## Neural Bridge Features

### 1. Multi-Model Coordination

#### Model Selection
```json
{
  "neuralBridge": {
    "models": {
      "primary": "claude-3-sonnet",
      "secondary": "gpt-4-turbo", 
      "specialist": "codex"
    },
    "routing": {
      "codeGeneration": "codex",
      "codeReview": "claude-3-opus",
      "documentation": "gpt-4-turbo",
      "testing": "claude-3-sonnet"
    }
  }
}
```

#### Consensus Building
```javascript
// Multiple models provide solutions
const solutions = await neuralBridge.generateSolutions({
  problem: "optimize database queries",
  models: ["claude-3-sonnet", "gpt-4-turbo", "codex"],
  consensus: "majority"
});

// Select best solution based on criteria
const bestSolution = neuralBridge.selectBest(solutions, {
  criteria: ["performance", "readability", "maintainability"],
  weights: [0.4, 0.3, 0.3]
});
```

### 2. Learning & Adaptation

#### Pattern Recognition
```bash
# Analyze coding patterns
autodev-ai neural analyze --pattern "api-design" --files "src/api/"

# Learn from successful implementations
autodev-ai neural learn --success-metrics "test-coverage,performance" \
  --codebase "src/"

# Apply learned patterns
autodev-ai neural apply --pattern "learned-api-pattern" \
  --target "src/api/new-service.js"
```

#### Continuous Improvement
```json
{
  "learning": {
    "enabled": true,
    "metrics": {
      "codeQuality": 0.8,
      "testCoverage": 0.85,
      "performance": 0.9,
      "maintainability": 0.75
    },
    "feedback": {
      "userRatings": true,
      "codeReviewScores": true,
      "bugReports": true
    }
  }
}
```

### 3. Performance Optimization

#### Token Optimization
```json
{
  "optimization": {
    "tokenReduction": {
      "enabled": true,
      "strategies": ["context-pruning", "caching", "compression"],
      "targetReduction": 0.3
    },
    "caching": {
      "enabled": true,
      "strategies": ["response-caching", "pattern-caching"],
      "ttl": 3600
    }
  }
}
```

## Troubleshooting

### Common Issues

#### 1. AI Service Connection Errors
```bash
# Check API keys
autodev-ai config check

# Test connections
autodev-ai service test openrouter
autodev-ai service test claude-flow

# Reset configuration
autodev-ai config reset --service openrouter
```

#### 2. Performance Issues
```bash
# Check resource usage
autodev-ai status --detailed

# Optimize settings
autodev-ai optimize --auto

# Clear cache
autodev-ai cache clear
```

#### 3. Project Not Loading
```bash
# Validate project structure
autodev-ai project validate

# Repair project configuration  
autodev-ai project repair

# Recreate from template
autodev-ai project recreate --from-template
```

#### 4. Docker Issues (Docker Installation)
```bash
# Check Docker services
docker compose ps

# Restart services
docker compose restart

# Check logs
docker compose logs autodev-ai

# Reset Docker environment
docker compose down -v
docker compose up -d
```

### Debug Mode

#### Enable Debugging
```bash
# Start in debug mode
autodev-ai --debug

# Or set environment variable
export AUTODEV_DEBUG=true
autodev-ai
```

#### Log Analysis
```bash
# View application logs
tail -f ~/.autodev/logs/application.log

# View AI service logs
tail -f ~/.autodev/logs/ai-services.log

# View neural bridge logs  
tail -f ~/.autodev/logs/neural-bridge.log
```

### Error Messages

#### API Key Issues
```
Error: Invalid OpenRouter API key
Solution: Check API key in Settings > AI Services > OpenRouter
```

#### Model Access Issues  
```
Error: Model not available - claude-3-opus
Solution: Check your OpenRouter account has access to this model
```

#### Memory Issues
```
Error: Insufficient memory for neural bridge
Solution: Reduce maxAgents in neural bridge settings or increase system RAM
```

## FAQ

### General Questions

**Q: What AI models does AutoDev-AI support?**
A: All OpenRouter models (Claude 3, GPT-4, Gemini, etc.), OpenAI Codex, and any custom models via API.

**Q: Can I use AutoDev-AI offline?**
A: Limited functionality works offline (cached responses, local templates), but AI features require internet connection.

**Q: Is my code sent to AI services?**
A: Only code you explicitly request AI assistance for. All communication is encrypted and follows each service's privacy policy.

**Q: Can I use custom AI models?**
A: Yes, through OpenRouter or by configuring custom API endpoints in settings.

### Technical Questions

**Q: What programming languages are supported?**
A: All major languages (JavaScript, Python, Java, C#, Go, Rust, etc.) with language-specific optimizations.

**Q: How does neural bridge coordination work?**
A: Multiple AI models work together using consensus mechanisms, with each model contributing its strengths to the solution.

**Q: Can I integrate with existing IDEs?**
A: Yes, through extensions for VS Code, IntelliJ, Vim, and others. Also works as standalone application.

**Q: How much does it cost?**
A: AutoDev-AI is free. You pay only for AI service usage through OpenRouter/OpenAI based on your actual consumption.

### Advanced Usage

**Q: How do I create custom templates?**
A: Use the template editor: File > New Template, or copy existing templates from `~/.autodev/templates/`.

**Q: Can I run my own AI models?**
A: Yes, configure custom endpoints in Settings > AI Services > Custom APIs.

**Q: How do I contribute to the project?**
A: See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

**Q: How do I backup my projects and settings?**
A: Use File > Export Settings, or backup `~/.autodev/` directory. Projects are stored in your chosen workspace directory.

For more help, visit our [GitHub Issues](https://github.com/meinzeug/autodevai/issues) or check the [deployment guide](DEPLOYMENT.md) for advanced setup.