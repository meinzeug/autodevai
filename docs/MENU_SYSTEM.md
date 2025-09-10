# AutoDev-AI Menu System Implementation

## Overview
This document describes the comprehensive native menu system implemented for the AutoDev-AI Tauri application. The menu system provides full desktop application functionality with platform-specific keyboard shortcuts and comprehensive menu actions.

## Menu Structure

### File Menu
- **New** (Ctrl/Cmd+N) - Creates a new file
- **Open...** (Ctrl/Cmd+O) - Opens a file dialog
- **Save** (Ctrl/Cmd+S) - Saves the current file
- **Save As...** (Ctrl/Cmd+Shift+S) - Opens save dialog with new name
- **New Window** (Ctrl/Cmd+Shift+N) - Creates a new application window
- **Close Window** (Ctrl/Cmd+W) - Closes the current window
- **Preferences...** (Ctrl/Cmd+,) - Opens preferences dialog
- **Quit** (Ctrl/Cmd+Q) - Exits the application

### Edit Menu (Native Items)
- **Undo** (Ctrl/Cmd+Z) - Native undo functionality
- **Redo** (Ctrl/Cmd+Y / Cmd+Shift+Z) - Native redo functionality
- **Cut** (Ctrl/Cmd+X) - Native cut functionality
- **Copy** (Ctrl/Cmd+C) - Native copy functionality
- **Paste** (Ctrl/Cmd+V) - Native paste functionality
- **Select All** (Ctrl/Cmd+A) - Native select all functionality

### View Menu
- **Reload** (Ctrl/Cmd+R) - Reloads the current page
- **Force Reload** (Ctrl/Cmd+Shift+R) - Force reloads bypassing cache
- **Zoom In** (Ctrl/Cmd+Plus) - Increases zoom level
- **Zoom Out** (Ctrl/Cmd+Minus) - Decreases zoom level
- **Actual Size** (Ctrl/Cmd+0) - Resets zoom to 100%
- **Enter Full Screen** (F11) - Toggles fullscreen mode
- **Minimize** (Ctrl/Cmd+M) - Minimizes the window
- **Toggle Developer Tools** (F12) - Opens/closes DevTools (debug builds only)
- **JavaScript Console** (Ctrl/Cmd+Alt+I) - Opens DevTools console (debug builds only)

### Help Menu
- **User Guide** (F1) - Opens user documentation
- **API Documentation** - Opens API reference
- **Keyboard Shortcuts** (Ctrl/Cmd+/) - Shows keyboard shortcuts dialog
- **GitHub Repository** - Opens the project repository
- **Report Issue** - Opens issue tracker
- **Check for Updates...** - Checks for application updates
- **About AutoDev-AI** - Shows application information

## Implementation Details

### File: `/src-tauri/src/menu.rs`

#### Key Functions

1. **`create_app_menu()`** - Creates the complete menu structure
2. **`handle_menu_event()`** - Handles all menu actions
3. **`create_file_menu()`** - Creates the File menu with comprehensive options
4. **`create_edit_menu()`** - Creates the Edit menu with native items
5. **`create_view_menu()`** - Creates the View menu with zoom and window controls
6. **`create_help_menu()`** - Creates the Help menu with documentation links

#### Helper Functions

- **File Operations**: `handle_new_file()`, `handle_open_file()`, `handle_save_file()`, `handle_save_as()`
- **View Controls**: `handle_zoom_change()`, `handle_fullscreen_toggle()`, `handle_devtools_toggle()`
- **Dialog Functions**: `show_preferences_dialog()`, `show_keyboard_shortcuts_dialog()`, `show_about_dialog()`
- **System Integration**: `open_url()`, `check_for_updates()`

#### Tauri Commands

1. **`get_menu_info()`** - Returns comprehensive menu information
2. **`trigger_menu_action()`** - Programmatically triggers menu actions
3. **`get_zoom_level()`** - Gets current zoom level
4. **`set_zoom_level()`** - Sets zoom level with bounds checking
5. **`toggle_menu_visibility()`** - Toggles menu visibility

### File: `/src/utils/menu-integration.ts`

TypeScript utilities for frontend integration:

#### MenuIntegration Class

```typescript
// Get menu information
const menuInfo = await menuIntegration.getMenuInfo();

// Trigger menu actions programmatically
await menuIntegration.triggerAction(MENU_ACTIONS.NEW_FILE);

// Manage zoom level
await menuIntegration.setZoomLevel(1.5);
const currentZoom = await menuIntegration.getZoomLevel();

// Listen for menu events
menuIntegration.listenToMenuEvent(MENU_ACTIONS.SAVE_FILE, (payload) => {
    console.log('Save action triggered', payload);
});
```

#### Available Constants

```typescript
export const MENU_ACTIONS = {
    // File menu
    NEW_FILE: 'new_file',
    OPEN_FILE: 'open_file',
    SAVE_FILE: 'save_file',
    // ... all menu actions
};
```

## Features

### Platform Compatibility
- **Windows**: Uses Ctrl-based shortcuts
- **macOS**: Uses Cmd-based shortcuts  
- **Linux**: Uses Ctrl-based shortcuts

### Zoom Support
- Range: 25% to 300%
- Persistent across sessions
- Keyboard shortcuts: Ctrl/Cmd +, -, 0

### Developer Tools Integration
- Available in debug builds only
- F12 toggles DevTools
- Ctrl/Cmd+Alt+I opens console directly

### Window Management
- Multiple window support
- Fullscreen toggle
- Window minimize/close
- New window creation

### File Operations
- New file creation
- File opening dialogs
- Save and Save As functionality
- Recent files tracking

## Event System

### Native Menu Events
Menu events are automatically handled by the Rust backend and can trigger:
- File operations
- View changes
- Help dialogs
- System actions

### Frontend Integration
Frontend applications can:
- Listen for menu events via Tauri events
- Trigger menu actions programmatically
- Query menu state and capabilities
- Customize menu behavior

### Event Flow
```
Native Menu Click → Tauri Menu Event → Rust Handler → Frontend Event → Application Response
```

## Configuration

### Menu Visibility
```rust
#[tauri::command]
pub async fn toggle_menu_visibility(app: AppHandle, visible: bool) -> Result<(), String>
```

### Platform-Specific Behavior
- macOS: Menu bar always visible
- Windows/Linux: Menu bar integrated in window
- All platforms: Keyboard shortcuts work consistently

## Testing

### Menu System Tests
Located in `/tests/menu_test.rs`:

1. **Action Definition Tests** - Verifies all menu actions are defined
2. **Keyboard Shortcut Tests** - Validates shortcut assignments
3. **Menu Structure Tests** - Ensures proper menu hierarchy
4. **Platform Compatibility Tests** - Tests cross-platform behavior
5. **Zoom Level Tests** - Validates zoom functionality
6. **Feature Tests** - Verifies all menu features work

### Integration Tests
- Menu info structure validation
- Event handling verification
- Performance benchmarks

## Best Practices

### For Developers

1. **Event Handling**: Use the MenuIntegration class for consistent event handling
2. **Shortcuts**: Always test keyboard shortcuts on target platforms
3. **State Management**: Persist user preferences like zoom level
4. **Error Handling**: Gracefully handle menu action failures
5. **Accessibility**: Ensure menu items have proper labels and shortcuts

### For Users

1. **Keyboard Shortcuts**: Most common actions have keyboard shortcuts
2. **Context Sensitivity**: Some menu items are context-aware
3. **Platform Consistency**: Menu behavior follows platform conventions
4. **Developer Tools**: Available during development for debugging

## Future Enhancements

### Planned Features
1. **Context Menus** - Right-click context menus
2. **Menu Customization** - User-configurable menu items
3. **Recent Files** - Recent files in File menu
4. **Plugin Menu Items** - Dynamic menu items from plugins
5. **Menu Themes** - Customizable menu appearance

### Technical Improvements
1. **Menu State Persistence** - Save/restore menu preferences
2. **Advanced Shortcuts** - Custom keyboard shortcut assignment
3. **Menu Analytics** - Track menu usage for UX improvements
4. **Internationalization** - Multi-language menu support

## Troubleshooting

### Common Issues

1. **Menu Not Visible**: Check platform and Tauri configuration
2. **Shortcuts Not Working**: Verify platform-specific key combinations
3. **DevTools Missing**: Ensure debug build for development features
4. **Zoom Not Persisting**: Check localStorage permissions

### Debug Commands

```rust
// Get comprehensive menu information
let menu_info = invoke('get_menu_info').await;
console.log(menu_info);

// Test menu action triggering
await invoke('trigger_menu_action', { actionId: 'about' });

// Check zoom level
const zoom = await invoke('get_zoom_level');
console.log('Current zoom:', zoom);
```

## Conclusion

The AutoDev-AI menu system provides a comprehensive, platform-aware, and extensible foundation for desktop application functionality. It combines native OS integration with modern web technologies, ensuring a familiar and powerful user experience across all supported platforms.