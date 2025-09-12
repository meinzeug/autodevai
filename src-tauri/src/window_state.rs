// Window state management for AutoDev-AI Neural Bridge Platform
// Comprehensive window management with persistence, multi-monitor support, and focus handling

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use tauri::{AppHandle, LogicalSize, Manager, Monitor, Runtime, Window};
use tokio::fs;
use tracing::{debug, error, info, warn};
use uuid;

/// Error types for window state management
#[derive(Debug, thiserror::Error)]
pub enum WindowStateError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Tauri error: {0}")]
    Tauri(#[from] tauri::Error),
    #[error("Window not found: {0}")]
    WindowNotFound(String),
    #[error("Invalid window state: {0}")]
    InvalidState(String),
}

type Result<T> = std::result::Result<T, WindowStateError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub width: f64,
    pub height: f64,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub maximized: bool,
    pub fullscreen: bool,
    pub visible: bool,
    pub focused: bool,
    pub always_on_top: bool,
    pub decorations: bool,
    pub resizable: bool,
    pub skip_taskbar: bool,
    pub monitor_id: Option<String>,
    pub saved_at: DateTime<Utc>,
    pub restore_count: u32,
    pub last_restore_success: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            width: 1200.0,
            height: 800.0,
            x: None,
            y: None,
            maximized: false,
            fullscreen: false,
            visible: true,
            focused: false,
            always_on_top: false,
            decorations: true,
            resizable: true,
            skip_taskbar: false,
            monitor_id: None,
            saved_at: Utc::now(),
            restore_count: 0,
            last_restore_success: true,
        }
    }
}

impl WindowState {
    /// Validate window state for safety
    pub fn validate(&self) -> Result<()> {
        if self.width <= 0.0 || self.height <= 0.0 {
            return Err(WindowStateError::InvalidState(
                "Window dimensions must be positive".to_string(),
            ));
        }

        if self.width > 10000.0 || self.height > 10000.0 {
            return Err(WindowStateError::InvalidState(
                "Window dimensions too large".to_string(),
            ));
        }

        Ok(())
    }

    /// Check if position is within reasonable bounds
    pub fn is_position_valid(&self, monitors: &[Monitor]) -> bool {
        if let (Some(x), Some(y)) = (self.x, self.y) {
            // Check if window position is within any monitor bounds with some tolerance
            for monitor in monitors {
                let pos = monitor.position();
                let size = monitor.size();

                if x >= (pos.x as f64 - 100.0)
                    && x <= (pos.x as f64 + size.width as f64 + 100.0)
                    && y >= (pos.y as f64 - 100.0)
                    && y <= (pos.y as f64 + size.height as f64 + 100.0)
                {
                    return true;
                }
            }
            false
        } else {
            true // No position set, will use center
        }
    }

    /// Create safe fallback state
    pub fn create_safe_fallback() -> Self {
        Self {
            width: 1200.0,
            height: 800.0,
            x: None, // Will be centered
            y: None,
            maximized: false,
            fullscreen: false,
            visible: true,
            focused: false,
            always_on_top: false,
            decorations: true,
            resizable: true,
            skip_taskbar: false,
            monitor_id: None,
            saved_at: Utc::now(),
            restore_count: 0,
            last_restore_success: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowStateCollection {
    pub states: HashMap<String, WindowState>,
    pub last_updated: DateTime<Utc>,
    pub version: u32,
    pub session_id: String,
    pub app_version: String,
    pub last_active_window: Option<String>,
    pub monitors: Vec<MonitorInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorInfo {
    pub name: Option<String>,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
    pub is_primary: bool,
}

impl Default for WindowStateCollection {
    fn default() -> Self {
        Self {
            states: HashMap::new(),
            last_updated: Utc::now(),
            version: 1,
            session_id: uuid::Uuid::new_v4().to_string(),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            last_active_window: None,
            monitors: Vec::new(),
        }
    }
}

pub struct WindowStateManager {
    states: Arc<RwLock<WindowStateCollection>>,
    config_path: PathBuf,
    auto_save: bool,
    monitors: Arc<RwLock<Vec<Monitor>>>,
    focus_tracker: Arc<RwLock<HashMap<String, DateTime<Utc>>>>,
}

impl WindowStateManager {
    /// Create a new WindowStateManager with persistent storage
    pub fn new(config_dir: PathBuf, auto_save: bool) -> Self {
        let config_path = config_dir.join("window_states.json");

        Self {
            states: Arc::new(RwLock::new(WindowStateCollection::default())),
            config_path,
            auto_save,
            monitors: Arc::new(RwLock::new(Vec::new())),
            focus_tracker: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Update monitor information
    pub async fn update_monitors<R: Runtime>(&self, app: &AppHandle<R>) -> Result<()> {
        let available_monitors = app.available_monitors().map_err(WindowStateError::Tauri)?;

        {
            let mut monitors = self.monitors.write().unwrap();
            *monitors = available_monitors;
        }

        // Update monitor info in collection
        {
            let monitors = self.monitors.read().unwrap();
            let mut states = self.states.write().unwrap();

            states.monitors = monitors
                .iter()
                .map(|m| MonitorInfo {
                    name: m.name().map(|n| n.clone()),
                    x: m.position().x,
                    y: m.position().y,
                    width: m.size().width,
                    height: m.size().height,
                    scale_factor: m.scale_factor(),
                    is_primary: false, // Tauri doesn't provide primary monitor info directly
                })
                .collect();
        }

        debug!(
            "Updated monitor information: {} monitors",
            self.monitors.read().unwrap().len()
        );
        Ok(())
    }

    /// Initialize the window state manager by loading existing states
    pub async fn initialize<R: Runtime>(&self, app: &AppHandle<R>) -> Result<()> {
        self.load_states().await?;
        self.update_monitors(app).await?;

        let state_count = {
            let states = self.states.read().unwrap();
            states.states.len()
        };

        info!(
            "WindowStateManager initialized with {} saved states",
            state_count
        );
        Ok(())
    }

    /// Save window state for a specific window with validation
    pub async fn save_window_state<R: Runtime>(
        &self,
        label: &str,
        window: &Window<R>,
    ) -> Result<()> {
        let mut state = self.extract_window_state(window).await?;

        // Validate state before saving
        state.validate()?;

        // Check if position is valid across available monitors
        let monitors = self.monitors.read().unwrap();
        if !state.is_position_valid(&monitors) {
            warn!(
                "Window '{}' position is invalid, will center on restore",
                label
            );
            state.x = None;
            state.y = None;
        }

        // Update state metadata
        state.saved_at = Utc::now();

        // Save to collection
        {
            let mut states = self.states.write().unwrap();
            states.states.insert(label.to_string(), state);
            states.last_updated = Utc::now();
            states.last_active_window = Some(label.to_string());
        }

        // Update focus tracker
        {
            let mut focus_tracker = self.focus_tracker.write().unwrap();
            focus_tracker.insert(label.to_string(), Utc::now());
        }

        if self.auto_save {
            self.persist_states().await?;
        }

        debug!("Saved window state for '{}'", label);
        Ok(())
    }

    /// Restore window state for a specific window with error handling and fallbacks
    pub async fn restore_window_state<R: Runtime>(
        &self,
        label: &str,
        window: &Window<R>,
    ) -> Result<()> {
        let state_opt = {
            let states = self.states.read().unwrap();
            states.states.get(label).cloned()
        };

        if let Some(mut state) = state_opt {
            // Validate state before applying
            if let Err(e) = state.validate() {
                warn!("Invalid saved state for '{}': {}, using fallback", label, e);
                state = WindowState::create_safe_fallback();
            }

            // Check monitor validity
            let monitors = self.monitors.read().unwrap();
            if !state.is_position_valid(&monitors) {
                warn!(
                    "Window '{}' saved position is invalid, centering window",
                    label
                );
                state.x = None;
                state.y = None;
            }

            match self.apply_window_state(window, &state).await {
                Ok(_) => {
                    // Update restore success status
                    {
                        let mut states = self.states.write().unwrap();
                        if let Some(stored_state) = states.states.get_mut(label) {
                            stored_state.restore_count += 1;
                            stored_state.last_restore_success = true;
                        }
                    }

                    info!("Restored window state for '{}'", label);
                    Ok(())
                }
                Err(e) => {
                    warn!(
                        "Failed to restore window state for '{}': {}, using fallback",
                        label, e
                    );

                    // Mark restore failure and try fallback
                    {
                        let mut states = self.states.write().unwrap();
                        if let Some(stored_state) = states.states.get_mut(label) {
                            stored_state.last_restore_success = false;
                        }
                    }

                    // Try with safe fallback
                    let fallback_state = WindowState::create_safe_fallback();
                    self.apply_window_state(window, &fallback_state).await?;

                    info!("Applied fallback state for window '{}'", label);
                    Ok(())
                }
            }
        } else {
            debug!(
                "No saved state found for window '{}', using defaults",
                label
            );
            Ok(())
        }
    }

    /// Get window state for a specific window
    pub fn get_window_state(&self, label: &str) -> Option<WindowState> {
        let states = self.states.read().unwrap();
        states.states.get(label).cloned()
    }

    /// Get all window states
    pub fn get_all_window_states(&self) -> HashMap<String, WindowState> {
        let states = self.states.read().unwrap();
        states.states.clone()
    }

    /// Track window focus
    pub fn track_focus(&self, label: &str) {
        let mut focus_tracker = self.focus_tracker.write().unwrap();
        focus_tracker.insert(label.to_string(), Utc::now());

        // Update last active window
        {
            let mut states = self.states.write().unwrap();
            states.last_active_window = Some(label.to_string());
        }

        debug!("Tracked focus for window '{}'", label);
    }

    /// Get last focused window
    pub fn get_last_focused_window(&self) -> Option<String> {
        let states = self.states.read().unwrap();
        states.last_active_window.clone()
    }

    /// Clean up old focus entries
    pub fn cleanup_focus_tracker(&self) {
        let cutoff = Utc::now() - chrono::Duration::hours(24);
        let mut focus_tracker = self.focus_tracker.write().unwrap();
        focus_tracker.retain(|_, &mut timestamp| timestamp > cutoff);
    }

    /// Save all current states to disk
    pub async fn save_all_states(&self) -> Result<()> {
        self.persist_states().await
    }

    /// Get manager statistics
    pub fn get_stats(&self) -> WindowStateStats {
        let states = self.states.read().unwrap();
        let focus_tracker = self.focus_tracker.read().unwrap();
        let monitors = self.monitors.read().unwrap();

        WindowStateStats {
            total_windows: states.states.len(),
            successful_restores: states
                .states
                .values()
                .filter(|s| s.last_restore_success)
                .count(),
            failed_restores: states
                .states
                .values()
                .filter(|s| !s.last_restore_success)
                .count(),
            active_focus_entries: focus_tracker.len(),
            monitor_count: monitors.len(),
            last_updated: states.last_updated,
            session_id: states.session_id.clone(),
        }
    }

    /// Extract current window state from a Window object with comprehensive data
    async fn extract_window_state<R: Runtime>(&self, window: &Window<R>) -> Result<WindowState> {
        let size = window.inner_size().map_err(WindowStateError::Tauri)?;
        let position = window.outer_position().ok();

        // Try to get current monitor
        let current_monitor = window.current_monitor().map_err(WindowStateError::Tauri)?;
        let monitor_id = current_monitor.and_then(|m| m.name().map(|name| name.to_string()));

        let state = WindowState {
            width: size.width as f64,
            height: size.height as f64,
            x: position.as_ref().map(|p| p.x as f64),
            y: position.as_ref().map(|p| p.y as f64),
            maximized: window.is_maximized().unwrap_or(false),
            fullscreen: window.is_fullscreen().unwrap_or(false),
            visible: window.is_visible().unwrap_or(true),
            focused: window.is_focused().unwrap_or(false),
            always_on_top: false, // TODO: Add API support when available
            decorations: true,    // TODO: Add API support when available
            resizable: true,      // TODO: Add API support when available
            skip_taskbar: false,  // TODO: Add API support when available
            monitor_id,
            saved_at: Utc::now(),
            restore_count: 0,
            last_restore_success: true,
        };

        Ok(state)
    }

    /// Apply window state to a Window object with comprehensive restoration
    async fn apply_window_state<R: Runtime>(
        &self,
        window: &Window<R>,
        state: &WindowState,
    ) -> Result<()> {
        // First, ensure window is visible for operations
        if state.visible {
            window.show().map_err(WindowStateError::Tauri)?;
        }

        // Set window size with bounds checking
        let logical_size = LogicalSize {
            width: state.width.max(200.0).min(8000.0), // Reasonable bounds
            height: state.height.max(150.0).min(6000.0),
        };
        window
            .set_size(logical_size)
            .map_err(WindowStateError::Tauri)?;

        // Set window position if available and valid
        if let (Some(x), Some(y)) = (state.x, state.y) {
            let position = tauri::LogicalPosition { x, y };
            if let Err(e) = window.set_position(position) {
                warn!("Failed to set window position, centering: {}", e);
                if let Err(center_err) = window.center() {
                    warn!("Failed to center window: {}", center_err);
                }
            }
        } else {
            // No saved position, center the window
            window.center().map_err(WindowStateError::Tauri)?;
        }

        // Apply window state flags with error handling
        if state.maximized {
            if let Err(e) = window.maximize() {
                warn!("Failed to maximize window: {}", e);
            }
        } else {
            if let Err(e) = window.unmaximize() {
                debug!("Failed to unmaximize window (may not be maximized): {}", e);
            }
        }

        if state.fullscreen {
            if let Err(e) = window.set_fullscreen(true) {
                warn!("Failed to set fullscreen: {}", e);
            }
        }

        // Handle focus if requested
        if state.focused {
            if let Err(e) = window.set_focus() {
                debug!("Failed to set focus (window may not be ready): {}", e);
            }
        }

        // Set final visibility
        if !state.visible {
            window.hide().map_err(WindowStateError::Tauri)?;
        }

        debug!(
            "Applied window state for '{}': {}x{} at ({:?}, {:?})",
            window.label(),
            state.width,
            state.height,
            state.x,
            state.y
        );

        Ok(())
    }

    /// Load window states from persistent storage with validation
    async fn load_states(&self) -> Result<()> {
        if self.config_path.exists() {
            match fs::read_to_string(&self.config_path).await {
                Ok(content) => {
                    match serde_json::from_str::<WindowStateCollection>(&content) {
                        Ok(mut collection) => {
                            // Validate loaded states
                            let mut invalid_states = Vec::new();
                            for (label, state) in &collection.states {
                                if let Err(e) = state.validate() {
                                    warn!("Invalid state for '{}': {}, will be removed", label, e);
                                    invalid_states.push(label.clone());
                                }
                            }

                            // Remove invalid states
                            for label in invalid_states {
                                collection.states.remove(&label);
                            }

                            // Update session info
                            collection.session_id = uuid::Uuid::new_v4().to_string();

                            {
                                let mut states = self.states.write().unwrap();
                                *states = collection;
                            }

                            let state_count = {
                                let states = self.states.read().unwrap();
                                states.states.len()
                            };

                            info!(
                                "Loaded {} window states from {}",
                                state_count,
                                self.config_path.display()
                            );
                        }
                        Err(e) => {
                            warn!("Failed to parse window states file: {}, creating new", e);
                            self.create_default_states().await?;
                        }
                    }
                }
                Err(e) => {
                    warn!("Failed to read window states file: {}, creating new", e);
                    self.create_default_states().await?;
                }
            }
        } else {
            info!("Window states file not found, creating default");
            self.create_default_states().await?;
        }

        Ok(())
    }

    /// Create default window states file
    async fn create_default_states(&self) -> Result<()> {
        {
            let mut states = self.states.write().unwrap();
            *states = WindowStateCollection::default();

            // Add default main window state
            states
                .states
                .insert("main".to_string(), WindowState::default());
        }

        self.persist_states().await?;
        info!("Created default window states");
        Ok(())
    }

    /// Persist window states to disk with atomic write
    async fn persist_states(&self) -> Result<()> {
        // Ensure parent directory exists
        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent)
                .await
                .map_err(WindowStateError::Io)?;
        }

        // Create content to write
        let content = {
            let mut states = self.states.write().unwrap();
            // Update timestamp and version
            states.last_updated = Utc::now();
            states.version += 1;

            serde_json::to_string_pretty(&*states).map_err(WindowStateError::Serialization)?
        };

        // Atomic write using temporary file
        let temp_path = self.config_path.with_extension("tmp");
        fs::write(&temp_path, &content)
            .await
            .map_err(WindowStateError::Io)?;
        fs::rename(&temp_path, &self.config_path)
            .await
            .map_err(WindowStateError::Io)?;

        let state_count = {
            let states = self.states.read().unwrap();
            states.states.len()
        };

        debug!(
            "Persisted {} window states to {}",
            state_count,
            self.config_path.display()
        );

        Ok(())
    }
}

#[derive(Debug, Serialize)]
pub struct WindowStateStats {
    pub total_windows: usize,
    pub successful_restores: usize,
    pub failed_restores: usize,
    pub active_focus_entries: usize,
    pub monitor_count: usize,
    pub last_updated: DateTime<Utc>,
    pub session_id: String,
}

/// Initialize comprehensive window state management for the application
/// This works alongside the tauri-plugin-window-state plugin with enhanced features
pub async fn setup_window_state<R: Runtime>(app: &AppHandle<R>) -> Result<()> {
    // Get config directory using proper Tauri approach
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(WindowStateError::Tauri)?
        .join("window-states");

    // Create window state manager with auto-save enabled
    let manager = WindowStateManager::new(config_dir, true);

    // Initialize manager (loads existing states and updates monitors)
    manager.initialize(app).await?;

    // Setup window event listeners for automatic state tracking
    setup_window_event_listeners(app, &manager).await?;

    // Store manager in app state for access from commands
    app.manage(manager);

    info!("Comprehensive window state management initialized successfully");
    Ok(())
}

/// Setup window event listeners for automatic state management
async fn setup_window_event_listeners<R: Runtime>(
    app: &AppHandle<R>,
    _manager: &WindowStateManager,
) -> Result<()> {
    // Note: Window event listeners are set up in the main application
    // This function is a placeholder for additional setup if needed
    debug!("Window event listeners setup completed");
    Ok(())
}

/// Handle window events for state management
pub async fn handle_window_event<R: Runtime>(
    app: &AppHandle<R>,
    event: &tauri::WindowEvent,
    window_label: &str,
) -> Result<()> {
    if let Some(manager) = app.try_state::<WindowStateManager>() {
        match event {
            tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_) => {
                // Save state on move/resize with debouncing
                if let Some(webview_window) = app.get_webview_window(window_label) {
                    if let Err(e) = manager.save_window_state(window_label, &webview_window.as_ref().window()).await {
                        error!("Failed to save window state for '{}': {}", window_label, e);
                    }
                }
            }
            tauri::WindowEvent::Focused(focused) => {
                if *focused {
                    manager.track_focus(window_label);
                }
            }
            tauri::WindowEvent::CloseRequested { .. } => {
                // Save state before closing
                if let Some(webview_window) = app.get_webview_window(window_label) {
                    if let Err(e) = manager.save_window_state(window_label, &webview_window.as_ref().window()).await {
                        error!(
                            "Failed to save window state on close for '{}': {}",
                            window_label, e
                        );
                    }
                }
            }
            _ => {}
        }
    }
    Ok(())
}

/// Tauri command to manually save current window state  
#[tauri::command]
pub async fn save_current_window_state<R: Runtime>(
    window: tauri::Window<R>,
    manager: tauri::State<'_, WindowStateManager>,
) -> std::result::Result<(), String> {
    let label = window.label();

    manager
        .save_window_state(label, &window)
        .await
        .map_err(|e| format!("Failed to save window state: {}", e))?;

    info!("Manual save completed for window '{}'", label);
    Ok(())
}

/// Tauri command to get current window states
#[tauri::command]
pub async fn get_window_states(
    manager: tauri::State<'_, WindowStateManager>,
) -> std::result::Result<HashMap<String, WindowState>, String> {
    Ok(manager.get_all_window_states())
}

/// Tauri command to get window state statistics
#[tauri::command]
pub async fn get_window_state_stats(
    manager: tauri::State<'_, WindowStateManager>,
) -> std::result::Result<WindowStateStats, String> {
    Ok(manager.get_stats())
}

/// Tauri command to restore a specific window state
#[tauri::command]
pub async fn restore_window_state_command<R: Runtime>(
    window: tauri::Window<R>,
    manager: tauri::State<'_, WindowStateManager>,
) -> std::result::Result<(), String> {
    let label = window.label();

    manager
        .restore_window_state(label, &window)
        .await
        .map_err(|e| format!("Failed to restore window state: {}", e))?;

    Ok(())
}

/// Tauri command to get last focused window
#[tauri::command]
pub async fn get_last_focused_window(
    manager: tauri::State<'_, WindowStateManager>,
) -> std::result::Result<Option<String>, String> {
    Ok(manager.get_last_focused_window())
}

/// Tauri command to cleanup old focus tracking data
#[tauri::command]
pub async fn cleanup_window_focus_tracker(
    manager: tauri::State<'_, WindowStateManager>,
) -> std::result::Result<(), String> {
    manager.cleanup_focus_tracker();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_window_state_manager_creation() {
        let temp_dir = TempDir::new().unwrap();
        let manager = WindowStateManager::new(temp_dir.path().to_path_buf(), true);

        assert!(manager.config_path.ends_with("window_states.json"));
        assert!(manager.auto_save);
    }

    #[tokio::test]
    async fn test_window_state_validation() {
        // Test valid state
        let valid_state = WindowState::default();
        assert!(valid_state.validate().is_ok());

        // Test invalid dimensions
        let invalid_state = WindowState {
            width: -100.0,
            height: 600.0,
            ..Default::default()
        };
        assert!(invalid_state.validate().is_err());

        // Test oversized dimensions
        let oversized_state = WindowState {
            width: 15000.0,
            height: 600.0,
            ..Default::default()
        };
        assert!(oversized_state.validate().is_err());
    }

    #[tokio::test]
    async fn test_window_state_persistence() {
        let temp_dir = TempDir::new().unwrap();
        let manager = WindowStateManager::new(temp_dir.path().to_path_buf(), true);

        // Initialize (should create default)
        manager.create_default_states().await.unwrap();
        assert!(manager.config_path.exists());

        let state_count = {
            let states = manager.states.read().unwrap();
            states.states.len()
        };
        assert_eq!(state_count, 1); // Default main window

        // Add a custom state
        let custom_state = WindowState {
            width: 800.0,
            height: 600.0,
            x: Some(100.0),
            y: Some(50.0),
            maximized: true,
            ..Default::default()
        };

        {
            let mut states = manager.states.write().unwrap();
            states
                .states
                .insert("test-window".to_string(), custom_state.clone());
        }
        manager.save_all_states().await.unwrap();

        // Create new manager and verify it loads the state
        let new_manager = WindowStateManager::new(temp_dir.path().to_path_buf(), true);
        new_manager.load_states().await.unwrap();

        let loaded_states = new_manager.get_all_window_states();
        assert_eq!(loaded_states.len(), 2);
        let loaded_state = new_manager.get_window_state("test-window").unwrap();
        assert_eq!(loaded_state.width, 800.0);
        assert_eq!(loaded_state.height, 600.0);
        assert_eq!(loaded_state.maximized, true);
    }

    #[test]
    fn test_window_state_defaults() {
        let state = WindowState::default();
        assert_eq!(state.width, 1200.0);
        assert_eq!(state.height, 800.0);
        assert!(!state.maximized);
        assert!(!state.fullscreen);
        assert!(state.visible);
        assert!(!state.focused);
        assert!(state.decorations);
        assert!(state.resizable);
        assert!(!state.skip_taskbar);
    }

    #[test]
    fn test_safe_fallback_state() {
        let fallback = WindowState::create_safe_fallback();
        assert!(fallback.validate().is_ok());
        assert_eq!(fallback.width, 1200.0);
        assert_eq!(fallback.height, 800.0);
        assert!(fallback.x.is_none()); // Will be centered
        assert!(fallback.y.is_none());
        assert!(!fallback.maximized);
        assert!(fallback.visible);
    }

    #[test]
    fn test_focus_tracking() {
        let temp_dir = TempDir::new().unwrap();
        let manager = WindowStateManager::new(temp_dir.path().to_path_buf(), true);

        // Test focus tracking
        manager.track_focus("window1");
        manager.track_focus("window2");

        assert_eq!(
            manager.get_last_focused_window(),
            Some("window2".to_string())
        );

        // Test cleanup (should not remove recent entries)
        manager.cleanup_focus_tracker();
        let focus_tracker = manager.focus_tracker.read().unwrap();
        assert_eq!(focus_tracker.len(), 2);
    }

    #[test]
    fn test_manager_stats() {
        let temp_dir = TempDir::new().unwrap();
        let manager = WindowStateManager::new(temp_dir.path().to_path_buf(), true);

        let stats = manager.get_stats();
        assert_eq!(stats.total_windows, 0);
        assert_eq!(stats.active_focus_entries, 0);
        assert!(!stats.session_id.is_empty());
    }
}
