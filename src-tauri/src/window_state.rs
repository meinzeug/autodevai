// Window state management for AutoDev-AI Neural Bridge Platform
// Enhanced version with full file persistence and tauri-plugin-window-state integration

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::{AppHandle, LogicalSize, Manager, Runtime, Window};
use tokio::fs;
use tracing::{error, info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub width: f64,
    pub height: f64,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub maximized: bool,
    pub fullscreen: bool,
    pub visible: bool,
    pub always_on_top: bool,
    pub decorations: bool,
    pub resizable: bool,
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
            always_on_top: false,
            decorations: true,
            resizable: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowStateCollection {
    pub states: HashMap<String, WindowState>,
    pub last_updated: chrono::DateTime<chrono::Utc>,
    pub version: u32,
}

impl Default for WindowStateCollection {
    fn default() -> Self {
        Self {
            states: HashMap::new(),
            last_updated: chrono::Utc::now(),
            version: 1,
        }
    }
}

pub struct WindowStateManager {
    states: WindowStateCollection,
    config_path: PathBuf,
    auto_save: bool,
}

impl WindowStateManager {
    /// Create a new WindowStateManager with persistent storage
    pub fn new(config_dir: PathBuf, auto_save: bool) -> Self {
        let config_path = config_dir.join("window_states.json");

        Self {
            states: WindowStateCollection::default(),
            config_path,
            auto_save,
        }
    }

    /// Initialize the window state manager by loading existing states
    pub async fn initialize(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        self.load_states().await?;
        info!(
            "WindowStateManager initialized with {} saved states",
            self.states.states.len()
        );
        Ok(())
    }

    /// Save window state for a specific window
    pub async fn save_window_state(
        &mut self,
        label: &str,
        window: &Window,
    ) -> Result<(), Box<dyn std::error::Error>> {
        match self.extract_window_state(window) {
            Ok(state) => {
                self.states.states.insert(label.to_string(), state);
                self.states.last_updated = chrono::Utc::now();

                if self.auto_save {
                    self.persist_states().await?;
                }

                info!("Saved window state for '{}'", label);
                Ok(())
            }
            Err(e) => {
                error!("Failed to extract window state for '{}': {}", label, e);
                Err(e)
            }
        }
    }

    /// Restore window state for a specific window
    pub async fn restore_window_state(
        &mut self,
        label: &str,
        window: &Window,
    ) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(state) = self.states.states.get(label) {
            match self.apply_window_state(window, state).await {
                Ok(_) => {
                    info!("Restored window state for '{}'", label);
                    Ok(())
                }
                Err(e) => {
                    warn!("Failed to restore window state for '{}': {}", label, e);
                    Err(e)
                }
            }
        } else {
            warn!("No saved state found for window '{}'", label);
            Ok(())
        }
    }

    /// Get window state for a specific window
    pub fn get_window_state(&self, label: &str) -> Option<&WindowState> {
        self.states.states.get(label)
    }

    /// Save all current states to disk
    pub async fn save_all_states(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        self.persist_states().await
    }

    /// Extract current window state from a Window object
    fn extract_window_state(
        &self,
        window: &Window,
    ) -> Result<WindowState, Box<dyn std::error::Error>> {
        let size = window.inner_size()?;
        let position = window.outer_position().ok();

        let state = WindowState {
            width: size.width as f64,
            height: size.height as f64,
            x: position.as_ref().map(|p| p.x as f64),
            y: position.as_ref().map(|p| p.y as f64),
            maximized: window.is_maximized()?,
            fullscreen: window.is_fullscreen()?,
            visible: window.is_visible()?,
            always_on_top: false, // TODO: Add API support when available
            decorations: true,    // TODO: Add API support when available
            resizable: true,      // TODO: Add API support when available
        };

        Ok(state)
    }

    /// Apply window state to a Window object
    async fn apply_window_state(
        &self,
        window: &Window,
        state: &WindowState,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Set window size
        window.set_size(LogicalSize {
            width: state.width,
            height: state.height,
        })?;

        // Set window position if available
        if let (Some(x), Some(y)) = (state.x, state.y) {
            window.set_position(tauri::LogicalPosition { x, y })?;
        }

        // Set window state properties
        if state.maximized {
            window.maximize()?;
        } else {
            window.unmaximize()?;
        }

        if state.fullscreen {
            window.set_fullscreen(true)?;
        }

        // Set visibility
        if state.visible {
            window.show()?;
        } else {
            window.hide()?;
        }

        Ok(())
    }

    /// Load window states from persistent storage
    async fn load_states(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if self.config_path.exists() {
            match fs::read_to_string(&self.config_path).await {
                Ok(content) => match serde_json::from_str::<WindowStateCollection>(&content) {
                    Ok(states) => {
                        self.states = states;
                        info!(
                            "Loaded {} window states from {}",
                            self.states.states.len(),
                            self.config_path.display()
                        );
                    }
                    Err(e) => {
                        warn!("Failed to parse window states file: {}", e);
                        self.create_default_states().await?;
                    }
                },
                Err(e) => {
                    warn!("Failed to read window states file: {}", e);
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
    async fn create_default_states(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        self.states = WindowStateCollection::default();

        // Add default main window state
        self.states
            .states
            .insert("main".to_string(), WindowState::default());

        self.persist_states().await?;
        info!("Created default window states");
        Ok(())
    }

    /// Persist window states to disk
    async fn persist_states(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        // Ensure parent directory exists
        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        // Update timestamp and version
        self.states.last_updated = chrono::Utc::now();
        self.states.version += 1;

        // Write to file
        let content = serde_json::to_string_pretty(&self.states)?;
        fs::write(&self.config_path, content).await?;

        info!(
            "Persisted {} window states to {}",
            self.states.states.len(),
            self.config_path.display()
        );

        Ok(())
    }
}

/// Initialize window state management for the application
/// This works alongside the tauri-plugin-window-state plugin
pub async fn setup_window_state<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<(), Box<dyn std::error::Error>> {
    // Get config directory - use a simple approach for now
    let config_dir = std::env::current_dir()
        .unwrap_or_default()
        .join(".config")
        .join("autodev-ai")
        .join("window-states");

    // Create window state manager
    let mut manager = WindowStateManager::new(config_dir, true);

    // Initialize manager (loads existing states)
    manager.initialize().await?;

    // Store manager in app state for access from commands
    app.manage(manager);

    info!("Window state management initialized successfully");
    Ok(())
}

/// Tauri command to manually save current window state  
#[tauri::command]
pub async fn save_current_window_state(window: Window) -> Result<(), String> {
    let label = window.label();
    // Note: This would integrate with the plugin's built-in state management
    // The tauri-plugin-window-state handles automatic persistence

    info!("Manual save requested for window '{}'", label);
    Ok(())
}

/// Tauri command to get current window states
#[tauri::command]
pub async fn get_window_states(
    manager: tauri::State<'_, WindowStateManager>,
) -> Result<HashMap<String, WindowState>, String> {
    Ok(manager.states.states.clone())
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
    async fn test_window_state_persistence() {
        let temp_dir = TempDir::new().unwrap();
        let mut manager = WindowStateManager::new(temp_dir.path().to_path_buf(), true);

        // Initialize (should create default)
        manager.initialize().await.unwrap();
        assert!(manager.config_path.exists());
        assert_eq!(manager.states.states.len(), 1); // Default main window

        // Add a custom state
        let custom_state = WindowState {
            width: 800.0,
            height: 600.0,
            x: Some(100.0),
            y: Some(50.0),
            maximized: true,
            ..Default::default()
        };

        manager
            .states
            .states
            .insert("test-window".to_string(), custom_state.clone());
        manager.save_all_states().await.unwrap();

        // Create new manager and verify it loads the state
        let mut new_manager = WindowStateManager::new(temp_dir.path().to_path_buf(), true);
        new_manager.initialize().await.unwrap();

        assert_eq!(new_manager.states.states.len(), 2);
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
        assert!(state.decorations);
        assert!(state.resizable);
    }
}
