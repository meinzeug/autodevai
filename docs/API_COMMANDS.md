# AutoDev-AI Tauri API Commands Reference

## Overview

This document provides a comprehensive reference for all Tauri commands available in the AutoDev-AI Neural Bridge Platform. These commands enable frontend-to-backend communication via IPC (Inter-Process Communication).

## Command Categories

### System Commands
- `greet` - Welcome message with platform info
- `get_system_info` - System and application information
- `emergency_shutdown` - Graceful application shutdown

### Development Window Commands
- `dev_toggle_devtools` - Toggle developer tools (debug builds only)
- `dev_window_info` - Get development window information

### Menu System Commands
- `toggle_menu_visibility` - Show/hide application menu
- `get_menu_info` - Get current menu state

### System Tray Commands
- `show_from_tray` - Show window from system tray
- `hide_to_tray` - Hide window to system tray
- `toggle_tray_visibility` - Toggle tray visibility
- `get_tray_config` - Get tray configuration
- `update_tray_tooltip` - Update tray tooltip text

### Settings Management Commands
- `get_setting` - Retrieve specific setting
- `set_setting` - Update setting value
- `get_all_settings` - Get complete settings object
- `save_settings` - Persist settings to disk
- `reset_settings` - Reset to default settings

### Security Commands
- `create_security_session` - Create new security session
- `validate_ipc_command` - Validate IPC command
- `get_security_stats` - Get security statistics

### Application Setup Commands
- `get_setup_config` - Get setup configuration
- `update_setup_config` - Update setup configuration
- `save_window_state` - Save current window state
- `get_window_state` - Get saved window state

### Update System Commands
- `check_for_updates` - Check for application updates
- `install_update` - Install pending update
- `get_update_status` - Get update system status
- `get_update_config` - Get update configuration
- `update_update_config` - Update update configuration
- `clear_pending_update` - Clear pending update
- `restart_app` - Restart application

### Event System Commands
- `emit_event` - Emit application event
- `get_events` - Get event history
- `subscribe_to_events` - Subscribe to event types
- `unsubscribe_from_events` - Unsubscribe from events
- `get_event_stats` - Get event statistics
- `clear_events` - Clear event history

## Detailed Command Reference

### System Commands

#### `greet(name: string) -> string`
Returns a greeting message with the provided name.

**Parameters:**
- `name` (string) - Name to include in greeting

**Returns:** 
- Greeting message string

**Example:**
```javascript
const greeting = await invoke('greet', { name: 'Developer' });
// Returns: "Hello, Developer! AutoDev-AI Neural Bridge Platform is ready."
```

#### `get_system_info() -> SystemInfo`
Retrieves comprehensive system and application information.

**Returns:**
```typescript
{
  platform: string,        // Operating system
  arch: string,            // CPU architecture
  version: string,         // Application version
  tauri_version: string,   // Tauri framework version
  rust_version: string,    // Rust version used for build
  build_date: string       // Build timestamp
}
```

**Example:**
```javascript
const systemInfo = await invoke('get_system_info');
console.log(`Running on ${systemInfo.platform} ${systemInfo.arch}`);
```

#### `emergency_shutdown(app_handle: AppHandle) -> Result<(), string>`
Performs graceful application shutdown with cleanup.

**Parameters:**
- `app_handle` - Tauri application handle (automatically provided)

**Returns:**
- `Ok(())` on success, error message on failure

### Development Window Commands

#### `dev_toggle_devtools(window: Window) -> Result<bool, string>`
Toggles developer tools window. Only available in debug builds.

**Parameters:**
- `window` - Target window (automatically provided)

**Returns:**
- `true` if DevTools opened, `false` if closed

**Example:**
```javascript
const devToolsOpen = await invoke('dev_toggle_devtools');
console.log(`DevTools ${devToolsOpen ? 'opened' : 'closed'}`);
```

#### `dev_window_info(window: Window) -> Result<WindowInfo, string>`
Gets information about the development window.

**Returns:**
```typescript
{
  label: string,
  is_devtools_open: boolean,
  is_debug_build: boolean
}
```

### Menu System Commands

#### `toggle_menu_visibility(app: AppHandle) -> Result<bool, string>`
Toggles application menu visibility.

**Returns:**
- Current menu visibility state

#### `get_menu_info(app: AppHandle) -> Result<MenuInfo, string>`
Gets current menu configuration and state.

**Returns:**
```typescript
{
  visible: boolean,
  items: MenuItemInfo[],
  shortcuts: Record<string, string>
}
```

### System Tray Commands

#### `show_from_tray(app: AppHandle) -> Result<(), string>`
Shows the main window from system tray.

#### `hide_to_tray(app: AppHandle) -> Result<(), string>`
Hides the main window to system tray.

#### `toggle_tray_visibility(app: AppHandle) -> Result<bool, string>`
Toggles system tray icon visibility.

#### `get_tray_config(state: State<TrayConfig>) -> Result<TrayConfig, string>`
Gets current system tray configuration.

**Returns:**
```typescript
{
  show_on_startup: boolean,
  minimize_to_tray: boolean,
  close_to_tray: boolean
}
```

#### `update_tray_tooltip(app: AppHandle, tooltip: string) -> Result<(), string>`
Updates system tray tooltip text.

**Parameters:**
- `tooltip` (string) - New tooltip text

### Settings Management Commands

#### `get_setting(key: string, state: State<SettingsManager>) -> Result<Value, string>`
Retrieves a specific setting value.

**Parameters:**
- `key` (string) - Setting key path (e.g., "ui.theme")

**Returns:**
- Setting value as JSON

#### `set_setting(key: string, value: Value, state: State<SettingsManager>) -> Result<(), string>`
Updates a setting value.

**Parameters:**
- `key` (string) - Setting key path
- `value` (JSON) - New setting value

#### `get_all_settings(state: State<SettingsManager>) -> Result<Settings, string>`
Gets complete settings object.

**Returns:**
- Complete settings configuration

#### `save_settings(state: State<SettingsManager>) -> Result<(), string>`
Persists current settings to disk.

#### `reset_settings(state: State<SettingsManager>) -> Result<(), string>`
Resets all settings to default values.

### Security Commands

#### `create_security_session(state: State<SecurityManager>) -> Result<SessionInfo, string>`
Creates a new security session with UUID.

**Returns:**
```typescript
{
  session_id: string,
  created_at: string,
  expires_at: string
}
```

#### `validate_ipc_command(command: string, args: Value, session: State<SecurityManager>) -> Result<ValidationResult, string>`
Validates an IPC command for security.

**Parameters:**
- `command` (string) - Command name to validate
- `args` (JSON) - Command arguments

**Returns:**
```typescript
{
  valid: boolean,
  sanitized_args: Value,
  session_id: string
}
```

#### `get_security_stats(state: State<SecurityManager>) -> Result<SecurityStats, string>`
Gets security framework statistics.

**Returns:**
```typescript
{
  active_sessions: number,
  commands_validated: number,
  blocked_commands: number,
  rate_limit_hits: number
}
```

### Application Setup Commands

#### `get_setup_config(state: State<SetupManager>) -> Result<SetupConfig, string>`
Gets current application setup configuration.

#### `update_setup_config(config: SetupConfig, state: State<SetupManager>) -> Result<(), string>`
Updates setup configuration.

#### `save_window_state(window: Window, state: State<WindowStateManager>) -> Result<(), string>`
Saves current window state (position, size, etc.).

#### `get_window_state(label: string, state: State<WindowStateManager>) -> Result<WindowState, string>`
Gets saved window state by label.

**Parameters:**
- `label` (string) - Window label/identifier

**Returns:**
```typescript
{
  x: number,
  y: number,
  width: number,
  height: number,
  maximized: boolean,
  minimized: boolean,
  fullscreen: boolean
}
```

### Update System Commands

#### `check_for_updates(app: AppHandle) -> Result<UpdateInfo, string>`
Checks for available application updates.

**Returns:**
```typescript
{
  available: boolean,
  version?: string,
  download_url?: string,
  release_notes?: string
}
```

#### `install_update(app: AppHandle) -> Result<(), string>`
Installs pending application update.

#### `get_update_status(state: State<UpdateManager>) -> Result<UpdateStatus, string>`
Gets current update system status.

**Returns:**
```typescript
{
  checking: boolean,
  available: boolean,
  downloading: boolean,
  ready: boolean,
  error?: string
}
```

#### `restart_app(app: AppHandle) -> Result<(), string>`
Restarts the application (typically after update).

### Event System Commands

#### `emit_event(event_type: string, payload: Value, app: AppHandle) -> Result<(), string>`
Emits an application event.

**Parameters:**
- `event_type` (string) - Type of event
- `payload` (JSON) - Event data

#### `get_events(limit: Option<usize>, state: State<EventManager>) -> Result<Vec<AppEvent>, string>`
Gets event history.

**Parameters:**
- `limit` (optional number) - Maximum events to return

**Returns:**
- Array of application events

#### `subscribe_to_events(event_types: Vec<string>, state: State<EventManager>) -> Result<String, string>`
Subscribes to specific event types.

**Parameters:**
- `event_types` (string[]) - Array of event types to subscribe to

**Returns:**
- Subscription ID

#### `get_event_stats(state: State<EventManager>) -> Result<EventStats, string>`
Gets event system statistics.

**Returns:**
```typescript
{
  total_events: number,
  events_by_type: Record<string, number>,
  subscribers_count: number
}
```

## Error Handling

All commands return `Result<T, String>` types, where:
- `Ok(value)` indicates success
- `Err(message)` indicates failure with error message

### Common Error Types

- `"Command not allowed"` - Security validation failed
- `"Invalid parameters"` - Malformed input data
- `"Rate limit exceeded"` - Too many requests
- `"Session expired"` - Security session timeout
- `"Internal error"` - System/runtime error

### Error Examples

```javascript
try {
  const result = await invoke('get_setting', { key: 'invalid.key' });
} catch (error) {
  console.error('Setting retrieval failed:', error);
}
```

## Security Considerations

### Command Validation
- All commands validated against whitelist
- Input sanitization prevents injection attacks
- Rate limiting prevents DoS attacks

### Session Management
- UUID-based security sessions
- Automatic session expiration
- Session validation for sensitive operations

### Input Sanitization
- XSS pattern detection
- Size limits on string inputs
- Type validation for all parameters

## Usage Examples

### Complete Application Lifecycle
```javascript
// Initialize application
const systemInfo = await invoke('get_system_info');
console.log('Application started:', systemInfo);

// Create security session
const session = await invoke('create_security_session');

// Load settings
const settings = await invoke('get_all_settings');

// Setup event listener
await invoke('subscribe_to_events', { 
  event_types: ['task_progress', 'system_notification'] 
});

// Save window state on close
window.addEventListener('beforeunload', async () => {
  await invoke('save_window_state');
});
```

### Development Mode Features
```javascript
// Check if in development mode
const windowInfo = await invoke('dev_window_info');
if (windowInfo.is_debug_build) {
  // Enable development features
  await invoke('dev_toggle_devtools');
}
```

### Settings Management
```javascript
// Update theme setting
await invoke('set_setting', { 
  key: 'ui.theme', 
  value: 'dark' 
});

// Get all UI settings
const uiSettings = await invoke('get_setting', { 
  key: 'ui' 
});

// Save changes
await invoke('save_settings');
```

This API provides comprehensive access to all Tauri application features while maintaining security and performance through validation, rate limiting, and efficient state management.