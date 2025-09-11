# AutoDev-AI Neural Bridge Platform - Tauri Backend

## Overview

The Neural Bridge Platform is a Rust-based Tauri backend that provides comprehensive AI orchestration capabilities, security features, and cross-platform desktop application functionality. This backend serves as the bridge between frontend interfaces and AI services including Claude Flow and OpenAI Codex integration.

## 🏗️ Architecture

### Core Components

- **AI Orchestration** - Multi-agent swarm coordination and SPARC methodology
- **Security Layer** - Enhanced IPC security, input sanitization, and audit logging
- **Performance Monitoring** - Real-time metrics, caching, and optimization
- **State Management** - Window state persistence and application settings
- **Event System** - Cross-component communication and notifications

### Module Structure

```
src/
├── lib.rs                     # Library entry point and exports
├── main.rs                    # Application entry point and setup
├── commands/                  # Tauri command handlers
│   ├── ai_orchestration.rs    # AI swarm and orchestration commands
│   ├── enhanced_ai_commands.rs # Enhanced AI workflow commands
│   └── performance.rs         # Performance monitoring commands
├── security/                  # Security and authentication
│   ├── ipc_security.rs        # Basic IPC security
│   ├── enhanced_ipc_security.rs # Advanced security features
│   ├── input_sanitizer.rs     # Input validation and sanitization
│   ├── command_validator.rs   # Command validation
│   ├── rate_limiter.rs        # Rate limiting
│   ├── session_manager.rs     # Session management
│   └── audit_logger.rs        # Security audit logging
├── performance/               # Performance optimization
│   ├── metrics.rs             # Performance metrics collection
│   ├── monitoring.rs          # Real-time monitoring
│   ├── cache.rs               # Caching strategies
│   ├── memory.rs              # Memory management
│   ├── database.rs            # Database optimization
│   ├── network.rs             # Network optimization
│   ├── concurrency.rs         # Concurrent processing
│   └── profiler.rs            # Performance profiling
├── app/                       # Application management
│   ├── setup.rs               # App initialization and setup
│   └── updater.rs             # Auto-updater functionality
├── api/                       # External API integrations
│   ├── claude_flow.rs         # Claude Flow integration
│   └── docker.rs              # Docker container management
├── database/                  # Data persistence
│   ├── models.rs              # Data models
│   ├── schema.rs              # Database schema
│   ├── backup.rs              # Backup functionality
│   └── mod.rs                 # Database interface
├── orchestration.rs           # AI orchestration core logic
├── window_state.rs            # Window state management
├── settings.rs                # Application settings
├── events.rs                  # Event system
├── tray.rs                    # System tray integration
├── menu.rs                    # Application menu
├── logging.rs                 # Logging configuration
├── errors.rs                  # Error types and handling
└── types.rs                   # Common type definitions
```

## 🚀 Getting Started

### Prerequisites

- **Rust** 1.75+ with cargo
- **Node.js** 18+ and npm
- **System Dependencies**:
  - Linux: `webkit2gtk-4.0-dev`, `build-essential`, `curl`, `wget`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`
  - macOS: Xcode Command Line Tools
  - Windows: Microsoft Visual Studio C++ Build Tools

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd autodevai
   ```

2. **Install Rust dependencies**:
   ```bash
   cd src-tauri
   cargo install tauri-cli
   ```

3. **Build the project**:
   ```bash
   cargo build
   ```

### Development Setup

1. **Development Build**:
   ```bash
   cargo build --profile dev-fast
   ```

2. **Run Tests**:
   ```bash
   cargo test
   ```

3. **Development Server** (with frontend):
   ```bash
   cargo tauri dev
   ```

4. **Production Build**:
   ```bash
   cargo build --release
   ```

## 🔧 Configuration

### Environment Variables

```bash
# AI Service Configuration
CLAUDE_FLOW_API_KEY=your_claude_flow_key
OPENAI_API_KEY=your_openai_key

# Security Configuration
SECURITY_AUDIT_ENABLED=true
RATE_LIMIT_ENABLED=true
SESSION_TIMEOUT=3600

# Performance Configuration
CACHE_ENABLED=true
METRICS_COLLECTION=true
PROFILING_ENABLED=false

# Database Configuration
DATABASE_URL=sqlite:./data/neural_bridge.db
BACKUP_ENABLED=true
BACKUP_INTERVAL=24h
```

### Build Profiles

#### Development (`dev`)
- Debug symbols enabled
- No optimizations
- Fast compilation
- Overflow checks enabled

#### Development Fast (`dev-fast`)
- Minimal optimizations (level 1)
- Incremental compilation
- Debug assertions enabled
- Faster build times

#### Release (`release`)
- Full optimizations (level 3)
- LTO enabled
- Debug symbols stripped
- Panic abort strategy

#### Release LTO (`release-lto`)
- Fat LTO optimization
- Single codegen unit
- Maximum performance

## 📡 API Commands

### Core Commands

#### System Information
```rust
// Get system information
get_system_info() -> Result<serde_json::Value, String>

// Check system status
check_system_status() -> CommandResponse

// Emergency shutdown
emergency_shutdown(app_handle: AppHandle) -> Result<(), String>
```

### AI Orchestration Commands

#### Swarm Management
```rust
// Initialize AI swarm with configuration
initialize_swarm(swarm_config: SwarmConfig) -> Result<String, String>

// Get swarm performance metrics
get_swarm_metrics(session_id: String) -> Result<SwarmMetrics, String>

// Health check for orchestration services
ai_orchestration_health_check() -> Result<serde_json::Value, String>
```

#### SPARC Methodology
```rust
// Execute SPARC methodology modes
execute_sparc_mode(
    prompt: String,
    mode: SparcMode,
    swarm_enabled: bool
) -> Result<ExecutionResponse, String>

// Available modes: Specification, Pseudocode, Architecture, Refinement, Completion, TddWorkflow, Integration
```

#### Hive-Mind Coordination
```rust
// Process hive-mind commands
process_hive_mind_command(command: HiveMindCommand) -> Result<String, String>

// Command types: TaskDistribution, CollectiveDecision, KnowledgeSync, EmergentBehavior, ConsensusBuild, AdaptiveResponse
```

#### Memory Management
```rust
// Store data in persistent memory
store_memory(key: String, value: String, tags: Vec<String>, ttl_seconds: Option<u64>) -> Result<String, String>

// Retrieve data from memory
retrieve_memory(key: String) -> Result<String, String>

// Get memory layer state
get_memory_state() -> Result<MemoryState, String>
```

### Enhanced AI Commands

#### Advanced Workflows
```rust
// Execute enhanced AI request with smart routing
execute_enhanced_ai_request(request: EnhancedAiRequest) -> Result<EnhancedAiResponse, String>

// Initialize enhanced orchestration
initialize_enhanced_orchestration(config: EnhancedOrchestrationConfig) -> Result<String, String>

// Execute adaptive workflow
execute_adaptive_workflow(workflow: AdaptiveWorkflow) -> Result<WorkflowResult, String>
```

### Security Commands

#### Session Management
```rust
// Create security session
create_security_session(config: SecurityConfig) -> Result<String, String>

// Validate IPC commands
validate_ipc_command(command: String, params: serde_json::Value) -> Result<bool, String>

// Get security statistics
get_security_stats() -> Result<SecurityStats, String>
```

### Performance Commands

#### Metrics and Monitoring
```rust
// Get performance metrics
get_performance_metrics() -> Result<PerformanceMetrics, String>

// Get optimization recommendations
get_optimization_recommendations() -> Result<Vec<OptimizationRecommendation>, String>

// Configure performance settings
configure_performance(config: PerformanceConfig) -> Result<(), String>
```

## 🛡️ Security Features

### Input Sanitization
- **XSS Protection**: HTML encoding and script tag filtering
- **SQL Injection Prevention**: Parameterized queries and input validation
- **Path Traversal Protection**: Path normalization and sandboxing
- **Command Injection Prevention**: Command validation and sanitization

### Rate Limiting
- **Configurable Limits**: Per-command and global rate limits
- **Token Bucket Algorithm**: Smooth rate limiting with burst capacity
- **Automatic Cleanup**: Expired rate limit entries cleanup

### Audit Logging
- **Comprehensive Logging**: All security events logged with metadata
- **Structured Logs**: JSON format for easy parsing and analysis
- **Retention Policies**: Configurable log retention and rotation

### Session Management
- **Secure Sessions**: UUID-based session identifiers
- **Timeout Handling**: Configurable session timeouts
- **Session Validation**: Continuous session validity checks

## 📊 Performance Optimization

### Caching Strategies
- **LRU Cache**: Memory-efficient caching with size limits
- **TTL Support**: Time-based cache expiration
- **Cache Metrics**: Hit rates and performance statistics

### Memory Management
- **Pool Allocation**: Efficient memory pools for frequent allocations
- **Leak Detection**: Memory leak monitoring and reporting
- **Garbage Collection**: Automatic cleanup of unused resources

### Concurrency
- **Thread Pools**: Optimized thread pool configurations
- **Async Processing**: Non-blocking asynchronous operations
- **Lock-Free Structures**: High-performance concurrent data structures

### Database Optimization
- **Query Optimization**: Efficient SQL query patterns
- **Connection Pooling**: Database connection management
- **Index Strategies**: Optimized database indexing

## 🔍 Monitoring and Debugging

### Logging
```rust
// Configure logging levels
RUST_LOG=debug cargo run

// Module-specific logging
RUST_LOG=neural_bridge::security=debug,neural_bridge::performance=info cargo run
```

### Performance Profiling
```bash
# Enable profiling
cargo build --release --features profiling

# Run with profiler
cargo run --release --bin neural_bridge --features profiling
```

### Benchmarking
```bash
# Run performance benchmarks
cargo bench

# Generate HTML reports
cargo bench -- --output-format html
```

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
cargo test

# Run specific module tests
cargo test security
cargo test performance
cargo test ai_orchestration

# Run tests with output
cargo test -- --nocapture
```

### Integration Tests
```bash
# Run integration tests
cargo test --test integration

# Run with specific features
cargo test --features test-integration
```

### Test Coverage
```bash
# Install cargo-tarpaulin
cargo install cargo-tarpaulin

# Generate coverage report
cargo tarpaulin --out Html
```

## 📦 Build and Deployment

### Development Builds
```bash
# Fast development build
cargo build --profile dev-fast

# Development with debug info
cargo build --profile dev
```

### Release Builds
```bash
# Standard release build
cargo build --release

# Optimized release with LTO
cargo build --profile release-lto

# Tauri application bundle
cargo tauri build
```

### Cross-Platform Builds
```bash
# Linux (from any platform with cross)
cargo build --target x86_64-unknown-linux-gnu

# Windows (from any platform)
cargo build --target x86_64-pc-windows-gnu

# macOS (from macOS)
cargo build --target x86_64-apple-darwin
```

## 🐛 Troubleshooting

### Common Issues

#### Build Errors
```bash
# Clear cargo cache
cargo clean

# Update dependencies
cargo update

# Rebuild with verbose output
cargo build --verbose
```

#### Runtime Issues
```bash
# Enable debug logging
RUST_LOG=debug cargo run

# Check system dependencies
ldd target/release/neural-bridge-platform
```

#### Performance Issues
```bash
# Enable performance monitoring
cargo run --features performance-monitoring

# Profile memory usage
valgrind --tool=massif target/release/neural-bridge-platform
```

### Debug Configuration

#### Enable Debug Features
```toml
[features]
debug-mode = ["dep:console"]
performance-monitoring = ["dep:perf"]
security-audit = ["dep:audit"]
```

#### Logging Configuration
```rust
// In main.rs
tracing_subscriber::fmt()
    .with_max_level(tracing::Level::DEBUG)
    .with_target(true)
    .with_thread_ids(true)
    .with_file(true)
    .with_line_number(true)
    .init();
```

## 📚 Additional Resources

- [Tauri Documentation](https://tauri.app/)
- [Rust Language Documentation](https://doc.rust-lang.org/)
- [Serde Serialization](https://serde.rs/)
- [Tokio Async Runtime](https://tokio.rs/)
- [Tracing Logging](https://tracing.rs/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow Rust naming conventions
- Add comprehensive tests for new features
- Update documentation for API changes
- Use `cargo fmt` for code formatting
- Run `cargo clippy` for linting
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔖 Version Information

- **Version**: 0.1.0
- **Rust Edition**: 2021
- **Tauri Version**: 2.0
- **Minimum Rust Version**: 1.75+

---

For detailed API documentation, run `cargo doc --open` to generate and view the complete API reference.