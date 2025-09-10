# AutoDev-AI Update System Documentation

## Overview

The AutoDev-AI update system provides comprehensive automatic update functionality with advanced features including version checking, background downloads, rollback mechanisms, and user notifications. The system is built using Tauri v2's native updater plugin with custom enhancements.

## Architecture

The update system consists of several interconnected components:

### Backend Components (Rust/Tauri)

1. **UpdateManager** (`src-tauri/src/app/updater.rs`)
   - Core update logic and state management
   - Integration with native Tauri updater plugin
   - Background update checking scheduler
   - Download progress tracking
   - Rollback mechanism implementation

2. **Update Configuration** 
   - User preferences for update behavior
   - Auto-check intervals and notification settings
   - Backup and rollback preferences

3. **Rollback System**
   - Automatic backup creation before updates
   - Version restoration on update failures
   - Manual rollback capabilities

### Frontend Components (React/TypeScript)

1. **UpdateManager Component** (`src/components/UpdateManager.tsx`)
   - Comprehensive UI for update management
   - Real-time status display and progress tracking
   - Settings configuration interface
   - Update history and rollback controls

2. **Update Notification Service** (`src/services/update-notifications.ts`)
   - System and in-app notifications
   - Event handling and user feedback
   - Sound notifications for critical updates
   - React hook for easy integration

## Key Features

### ✅ Automatic Update Checking
- Check for updates on startup (after 30-second delay)
- Configurable background checks (default: every 24 hours)
- GitHub releases API integration
- Semantic version comparison

### ✅ Download & Installation
- Native Tauri updater integration
- Silent background downloads
- Progress tracking with real-time updates
- One-click installation with user confirmation
- Automatic restart handling

### ✅ Rollback Mechanism
- Automatic backup creation before updates
- Failed update detection and rollback
- Manual rollback capabilities
- Previous version restoration

### ✅ User Interface
- Comprehensive update manager UI
- Real-time status and progress display
- Update settings and preferences
- Update history tracking
- Keyboard shortcuts (Ctrl+U to open)

### ✅ Notifications System
- Native system notifications
- In-app toast messages
- Critical update alerts
- Sound notifications (configurable)
- Notification preferences

### ✅ Error Handling
- Comprehensive error recovery
- Network failure handling
- Installation failure detection
- User-friendly error messages

## Usage

### Backend Integration

The update system is automatically initialized in `main.rs`:

```rust
// Plugins
.plugin(tauri_plugin_updater::Builder::new().build())
.plugin(tauri_plugin_dialog::init())
.plugin(tauri_plugin_notification::init())

// Commands (14 total)
app::updater::check_for_updates,
app::updater::check_for_updates_with_notification,
app::updater::install_update,
app::updater::download_update,
app::updater::get_update_status,
app::updater::get_update_config,
app::updater::update_update_config,
app::updater::clear_pending_update,
app::updater::restart_app,
app::updater::rollback_update,
app::updater::get_rollback_info,
app::updater::create_backup,
app::updater::get_update_history,
app::updater::get_last_check_time,
```

### Frontend Integration

The UpdateManager component is integrated into the main App:

```tsx
import { UpdateManager } from './components/UpdateManager';

// In App component
{state.showUpdater && (
  <div className="w-96 border-r transition-all duration-300 overflow-y-auto">
    <div className="p-6">
      <UpdateManager onClose={() => setState(prev => ({ ...prev, showUpdater: false }))} />
    </div>
  </div>
)}
```

Access via keyboard shortcut: **Ctrl+U**

### Notification Service

```tsx
import { updateNotificationService, useUpdateNotifications } from './services/update-notifications';

// Using the hook in components
function MyComponent() {
  const { config, eventHistory, updateConfig, service } = useUpdateNotifications();
  
  // Update notification settings
  const handleConfigUpdate = (newSettings) => {
    updateConfig(newSettings);
  };
  
  // Manual update check
  const checkForUpdates = async () => {
    await service.checkForUpdates();
  };
}
```

## Configuration

### Update Settings

```typescript
interface UpdateConfig {
  auto_check: boolean;                    // Enable automatic update checking
  check_interval_hours: number;           // Hours between checks (default: 24)
  notify_user: boolean;                   // Show user notifications
  prompt_before_install: boolean;         // Ask before installing
  github_repo: string;                    // Repository for releases
  pre_release: boolean;                   // Include pre-release versions
  silent_install: boolean;                // Install without user interaction
  backup_before_update: boolean;          // Create backup before updates
  update_channel: string;                 // "stable", "beta", or "dev"
}
```

### Notification Settings

```typescript
interface UpdateNotificationConfig {
  showSystemNotifications: boolean;       // Native OS notifications
  showToastMessages: boolean;             // In-app toast messages
  criticalUpdateAlert: boolean;           // Special alerts for critical updates
  soundEnabled: boolean;                  // Audio notifications
  autoDownloadNotifications: boolean;     // Notify about background downloads
}
```

## API Reference

### Backend Commands

| Command | Description | Parameters | Returns |
|---------|-------------|------------|---------|
| `check_for_updates` | Check for available updates | None | `bool` |
| `check_for_updates_with_notification` | Check with user notification | None | `bool` |
| `install_update` | Install pending update | None | `()` |
| `download_update` | Start background download | None | `()` |
| `get_update_status` | Get current update status | None | `UpdateStatus` |
| `get_update_config` | Get update configuration | None | `UpdateConfig` |
| `update_update_config` | Update configuration | `config: UpdateConfig` | `()` |
| `clear_pending_update` | Clear pending update | None | `()` |
| `restart_app` | Restart application | None | `()` |
| `rollback_update` | Perform update rollback | `reason?: string` | `()` |
| `get_rollback_info` | Get rollback information | None | `Option<RollbackInfo>` |
| `create_backup` | Create manual backup | None | `()` |
| `get_update_history` | Get update history | None | `Vec<UpdateInfo>` |
| `get_last_check_time` | Get last check timestamp | None | `Option<SystemTime>` |

### Events

The system emits various events that can be listened to:

- `update-checking` - Update check started
- `update-available` - New update found
- `update-not-available` - No updates found
- `update-downloading` - Download started
- `update-download-progress` - Download progress
- `update-download-complete` - Download finished
- `update-download-error` - Download failed
- `update-installing` - Installation started
- `update-progress` - Installation progress
- `update-ready` - Ready for restart
- `update-rolling-back` - Rollback in progress
- `update-rollback-complete` - Rollback finished
- `update-error` - General update error
- `update-cleared` - Pending update cleared

## Testing

Comprehensive test suite available in `src-tauri/src/tests/updater_tests.rs`:

```bash
# Run update system tests
cargo test updater_tests --features test-mode

# Run specific test
cargo test test_update_manager_creation --features test-mode

# Run all tests with output
cargo test -- --nocapture
```

### Test Coverage

- ✅ Configuration management
- ✅ Status serialization/deserialization
- ✅ Version comparison logic
- ✅ Backup and rollback mechanisms
- ✅ Error handling scenarios
- ✅ Concurrent operations safety
- ✅ Complete workflow integration
- ✅ Performance and cleanup

## Security Considerations

1. **GitHub API Integration**
   - Uses official GitHub releases API
   - Validates release signatures where available
   - Checksum verification support

2. **Download Security**
   - HTTPS-only downloads
   - File integrity checks
   - Temporary file cleanup

3. **Installation Safety**
   - Backup creation before updates
   - Rollback on installation failure
   - User confirmation for critical updates

4. **Permission Handling**
   - Notification permission requests
   - Secure file system access
   - Proper error handling

## Troubleshooting

### Common Issues

1. **Update Check Fails**
   - Check internet connection
   - Verify GitHub repository configuration
   - Check GitHub API rate limits

2. **Download Problems**
   - Ensure sufficient disk space
   - Check firewall/antivirus settings
   - Verify download URL accessibility

3. **Installation Failures**
   - Check file permissions
   - Ensure application isn't running multiple instances
   - Verify backup space availability

4. **Rollback Issues**
   - Check backup file integrity
   - Ensure sufficient permissions
   - Verify backup directory access

### Debug Mode

Enable debug logging in the updater:

```bash
RUST_LOG=debug cargo run
```

### Manual Recovery

If automatic rollback fails:

1. Locate backup directory: `{app_data}/update_backups/`
2. Find latest backup: `backup_v{version}/`
3. Manually restore files if needed
4. Contact support with log files

## Performance

The update system is designed for minimal performance impact:

- **Startup delay**: 30 seconds before first check
- **Background checks**: Configurable interval (default 24h)
- **Memory usage**: ~2-5MB for update manager
- **Network usage**: Minimal API calls to GitHub
- **Disk usage**: Temporary files cleaned automatically

## Future Enhancements

Potential improvements for future versions:

- [ ] Delta updates for smaller downloads
- [ ] Peer-to-peer update distribution
- [ ] Staged rollout capabilities
- [ ] Advanced scheduling options
- [ ] Integration with CI/CD pipelines
- [ ] Multi-platform update optimization
- [ ] Enhanced telemetry and analytics

## Support

For update system issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Review the [test suite](#testing) for validation
3. Examine log files in `{app_data}/logs/`
4. Create an issue with system information and logs

---

**Note**: This update system is production-ready with comprehensive error handling, rollback capabilities, and extensive testing. It follows Tauri v2 best practices and provides a seamless user experience.