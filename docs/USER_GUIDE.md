# AutoDev-AI User Guide

## Getting Started

Welcome to AutoDev-AI Neural Bridge Platform! This guide covers the complete Tauri desktop
application with all Phase 3.3 features.

## Installation & Setup

### System Requirements

- **Windows**: Windows 10 1903+ (build 18362+)
- **macOS**: macOS 10.15 (Catalina) or later
- **Linux**: GTK 3.24+ distributions
- **Memory**: 512MB minimum, 2GB recommended
- **Storage**: 100MB application, 500MB workspace

### Key Features

- **Native Desktop App**: Built with Tauri for optimal performance
- **Window State Persistence**: Position/size saved between sessions
- **System Tray Integration**: Minimize to tray, quick access
- **Security Framework**: Command validation, rate limiting, input sanitization
- **Multi-Window Support**: Independent windows with saved state

## Interface Overview

### Main Application Window

- **Menu Bar**: File, Edit, View, Help with keyboard shortcuts
- **System Tray**: Show/hide, context menu, status indication
- **Window Management**: Persistent state, multi-window support
- **Development Mode**: Auto-open DevTools in debug builds

### Keyboard Shortcuts

- `Ctrl/Cmd+N`: New Window
- `Ctrl/Cmd+W`: Close Window
- `Ctrl/Cmd+Q`: Quit Application
- `F12`: Toggle DevTools (debug builds)
- `F11`: Toggle Fullscreen

## Core Functionality

### AI Integration

- **Claude-Flow**: Multi-agent swarms, SPARC methodology
- **OpenAI Codex**: Code generation, analysis, refactoring
- **Task Orchestration**: Real-time progress, event system
- **Security**: Command validation, session management

### Configuration Management

Access via `Edit → Preferences`:

- **General Settings**: Theme, startup, updates
- **AI Configuration**: API keys, models, limits
- **Interface**: Layout, shortcuts, appearance
- **Security**: Privacy, audit logging

## Using the Application

### First Launch

1. Workspace directory selection
2. API key configuration
3. Preference setup
4. Tool selection

### Task Execution

1. Select AI tool and mode
2. Provide task description
3. Monitor real-time progress
4. Review results and logs

## Troubleshooting

### Common Issues

- **Startup Problems**: Check logs in `~/.autodev-ai/logs/`
- **API Issues**: Validate keys, check connectivity
- **Performance**: Monitor resources, clear cache

### Error Recovery

- Automatic session restoration
- State persistence across crashes
- Background cleanup processes
- Memory management optimization

## Advanced Features

### Security Framework

- Command whitelist validation
- Rate limiting (10 req/sec default)
- Input sanitization and XSS protection
- Session-based authentication
- Complete audit logging

### Performance Optimization

- Native desktop performance
- Efficient memory management
- Background task processing
- Resource monitoring and cleanup

This guide covers the essential features of the complete AutoDev-AI Tauri implementation. All Phase
3.3 components (Steps 166-185) are fully integrated and production-ready.
