# AutoDev-AI Tauri Backend
## Structure
- `src/main.rs` - Application entry point
- `src/commands/` - Tauri command handlers
- `src/state.rs` - Application state management
- `src/services/` - Business logic services
## Development
```bash
cargo build
cargo run
cargo test
cargo clippy
```
## Build
```bash
cargo build --release
```
## Commands
The backend exposes these commands to the frontend:
- `execute_claude_flow` - Run Claude-Flow commands
- `execute_openai_codex` - Run Codex operations
- `orchestrate_dual_mode` - Coordinate both tools
- `create_sandbox` - Create Docker sandbox
- `check_prerequisites` - Verify tool availability
- `get_system_info` - System information
- `save_settings` - Persist settings
- `load_settings` - Load settings