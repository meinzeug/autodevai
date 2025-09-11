//! App Setup Hook Implementation
//!
//! Handles application initialization, window state restoration,
//! and initial configuration setup.

use crate::security::{enhanced_ipc_security::EnhancedIpcSecurity, ipc_security::IpcSecurity};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use tauri::{App, Manager, Position, Size, Window, WindowEvent};
use tokio::fs;
use tokio::time::{interval, Duration};

/// Window state configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub maximized: bool,
    pub minimized: bool,
    pub fullscreen: bool,
    pub focused: bool,
    pub visible: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            x: 100,
            y: 100,
            width: 1200,
            height: 800,
            maximized: false,
            minimized: false,
            fullscreen: false,
            focused: true,
            visible: true,
        }
    }
}

/// Application setup configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSetupConfig {
    pub enable_dev_tools: bool,
    pub window_decorations: bool,
    pub always_on_top: bool,
    pub resizable: bool,
    pub transparent: bool,
    pub skip_taskbar: bool,
    pub theme: String,
    pub auto_save_interval: u64, // seconds
}

impl Default for AppSetupConfig {
    fn default() -> Self {
        Self {
            enable_dev_tools: cfg!(debug_assertions),
            window_decorations: true,
            always_on_top: false,
            resizable: true,
            transparent: false,
            skip_taskbar: false,
            theme: "system".to_string(),
            auto_save_interval: 300, // 5 minutes
        }
    }
}

/// Thread-safe setup state manager
#[derive(Debug)]
pub struct SetupManager {
    pub config_path: PathBuf,
    pub window_states_path: PathBuf,
    window_states: Arc<RwLock<HashMap<String, WindowState>>>,
    config: Arc<RwLock<AppSetupConfig>>,
    auto_save_enabled: Arc<RwLock<bool>>,
}

impl SetupManager {
    /// Create a new thread-safe setup manager
    pub fn new(config_dir: PathBuf) -> Self {
        let config_path = config_dir.join("setup_config.json");
        let window_states_path = config_dir.join("window_states.json");

        Self {
            config_path,
            window_states_path,
            window_states: Arc::new(RwLock::new(HashMap::new())),
            config: Arc::new(RwLock::new(AppSetupConfig::default())),
            auto_save_enabled: Arc::new(RwLock::new(true)),
        }
    }

    /// Initialize the app setup with window state restoration
    pub async fn initialize(&self, app: &App) -> Result<(), Box<dyn std::error::Error>> {
        // Load configuration and window states
        self.load_config().await?;
        self.load_window_states().await?;

        // Setup security
        self.setup_security(app).await?;

        // Setup window state restoration
        self.setup_window_restoration(app).await?;

        // Setup auto-save functionality
        self.setup_auto_save(app.handle().clone()).await;

        log::info!("App setup completed successfully");
        Ok(())
    }

    /// Load configuration from disk (thread-safe)
    async fn load_config(&self) -> Result<(), Box<dyn std::error::Error>> {
        if self.config_path.exists() {
            let content = fs::read_to_string(&self.config_path).await?;
            if let Ok(config) = serde_json::from_str::<AppSetupConfig>(&content) {
                {
                    let mut config_guard = self.config.write().unwrap();
                    *config_guard = config;
                }
                log::info!("Loaded app setup configuration");
            } else {
                log::warn!("Failed to parse setup config, using defaults");
            }
        } else {
            // Create default config
            self.save_config().await?;
            log::info!("Created default app setup configuration");
        }

        Ok(())
    }

    /// Save configuration to disk (thread-safe)
    async fn save_config(&self) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        let config = {
            let config_guard = self.config.read().unwrap();
            config_guard.clone()
        };

        let content = serde_json::to_string_pretty(&config)?;
        fs::write(&self.config_path, content).await?;

        log::debug!("Saved app setup configuration");
        Ok(())
    }

    /// Setup security features with enhanced protection
    async fn setup_security(&self, app: &App) -> Result<(), Box<dyn std::error::Error>> {
        // Initialize basic IPC security for backward compatibility
        let basic_security = IpcSecurity::default();
        app.manage(basic_security);

        // Initialize enhanced IPC security for advanced features
        let enhanced_security = EnhancedIpcSecurity::new().await;
        app.manage(enhanced_security);

        log::info!("Enhanced security setup completed");
        Ok(())
    }

    /// Load window states from disk
    async fn load_window_states(&self) -> Result<(), Box<dyn std::error::Error>> {
        if self.window_states_path.exists() {
            let content = fs::read_to_string(&self.window_states_path).await?;
            if let Ok(states) = serde_json::from_str::<HashMap<String, WindowState>>(&content) {
                {
                    let mut states_guard = self.window_states.write().unwrap();
                    *states_guard = states;
                }
                log::info!(
                    "Loaded {} window states",
                    self.window_states.read().unwrap().len()
                );
            } else {
                log::warn!("Failed to parse window states, starting with empty states");
            }
        } else {
            log::info!("No window states file found, starting with empty states");
        }

        Ok(())
    }

    /// Save window states to disk
    async fn save_window_states(&self) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(parent) = self.window_states_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        let states = {
            let states_guard = self.window_states.read().unwrap();
            states_guard.clone()
        };

        let content = serde_json::to_string_pretty(&states)?;
        fs::write(&self.window_states_path, content).await?;

        log::debug!("Saved {} window states", states.len());
        Ok(())
    }

    /// Setup window state restoration
    async fn setup_window_restoration(&self, app: &App) -> Result<(), Box<dyn std::error::Error>> {
        // Get all current windows
        let windows: Vec<Window> = app.webview_windows().values().cloned().collect();

        for window in windows {
            self.restore_window_state(&window).await;
        }

        log::info!("Window state restoration completed");
        Ok(())
    }

    /// Restore individual window state
    pub async fn restore_window_state(&self, window: &Window) {
        let window_label = window.label();

        if let Some(state) = self.get_window_state(window_label) {
            log::info!("Restoring state for window '{}'", window_label);

            // Restore position and size
            let _ = window.set_position(Position::Physical(tauri::PhysicalPosition {
                x: state.x,
                y: state.y,
            }));

            let _ = window.set_size(Size::Physical(tauri::PhysicalSize {
                width: state.width,
                height: state.height,
            }));

            // Restore window state flags
            if state.maximized {
                let _ = window.maximize();
            } else if state.minimized {
                let _ = window.minimize();
            }

            if state.fullscreen {
                let _ = window.set_fullscreen(true);
            }

            if !state.visible {
                let _ = window.hide();
            } else {
                let _ = window.show();
            }

            if state.focused {
                let _ = window.set_focus();
            }
        } else {
            log::debug!(
                "No saved state found for window '{}', using defaults",
                window_label
            );
        }
    }

    /// Save current window state
    pub async fn save_current_window_state(
        &self,
        window: &Window,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let window_label = window.label().to_string();

        // Get current window properties
        let position = window
            .outer_position()
            .unwrap_or(tauri::PhysicalPosition { x: 100, y: 100 });
        let size = window.outer_size().unwrap_or(tauri::PhysicalSize {
            width: 1200,
            height: 800,
        });

        let state = WindowState {
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height,
            maximized: window.is_maximized().unwrap_or(false),
            minimized: window.is_minimized().unwrap_or(false),
            fullscreen: window.is_fullscreen().unwrap_or(false),
            focused: window.is_focused().unwrap_or(false),
            visible: window.is_visible().unwrap_or(true),
        };

        // Save to memory
        {
            let mut states_guard = self.window_states.write().unwrap();
            states_guard.insert(window_label.clone(), state);
        }

        // Save to disk if auto-save is enabled
        if *self.auto_save_enabled.read().unwrap() {
            self.save_window_states().await?;
        }

        log::debug!("Saved state for window '{}'", window_label);
        Ok(())
    }

    /// Setup automatic state saving
    async fn setup_auto_save(&self, app_handle: tauri::AppHandle) {
        let config = self.config.clone();
        let window_states = self.window_states.clone();
        let window_states_path = self.window_states_path.clone();
        let config_path = self.config_path.clone();
        let auto_save_enabled = self.auto_save_enabled.clone();

        tokio::spawn(async move {
            let auto_save_interval = {
                let config_guard = config.read().unwrap();
                Duration::from_secs(config_guard.auto_save_interval)
            };

            let mut interval_timer = interval(auto_save_interval);

            loop {
                interval_timer.tick().await;

                if !*auto_save_enabled.read().unwrap() {
                    continue;
                }

                // Save all current window states
                let windows: Vec<Window> = app_handle.webview_windows().values().cloned().collect();

                for window in &windows {
                    let window_label = window.label().to_string();

                    // Get current window properties
                    if let (Ok(position), Ok(size)) = (window.outer_position(), window.outer_size())
                    {
                        let state = WindowState {
                            x: position.x,
                            y: position.y,
                            width: size.width,
                            height: size.height,
                            maximized: window.is_maximized().unwrap_or(false),
                            minimized: window.is_minimized().unwrap_or(false),
                            fullscreen: window.is_fullscreen().unwrap_or(false),
                            focused: window.is_focused().unwrap_or(false),
                            visible: window.is_visible().unwrap_or(true),
                        };

                        // Save to memory
                        {
                            let mut states_guard = window_states.write().unwrap();
                            states_guard.insert(window_label, state);
                        }
                    }
                }

                // Save window states to disk
                {
                    let states = {
                        let states_guard = window_states.read().unwrap();
                        states_guard.clone()
                    };

                    if let Some(parent) = window_states_path.parent() {
                        let _ = fs::create_dir_all(parent).await;
                    }

                    let content = serde_json::to_string_pretty(&states).unwrap_or_default();
                    if let Err(e) = fs::write(&window_states_path, content).await {
                        log::error!("Failed to save window states: {}", e);
                    }
                }

                // Save configuration
                {
                    let config_clone = {
                        let config_guard = config.read().unwrap();
                        config_guard.clone()
                    };

                    if let Some(parent) = config_path.parent() {
                        let _ = fs::create_dir_all(parent).await;
                    }

                    let content = serde_json::to_string_pretty(&config_clone).unwrap_or_default();
                    if let Err(e) = fs::write(&config_path, content).await {
                        log::error!("Failed to save configuration: {}", e);
                    }
                }

                log::debug!("Auto-save completed for {} windows", windows.len());
            }
        });

        log::info!(
            "Auto-save system started with interval: {} seconds",
            config.read().unwrap().auto_save_interval
        );
    }

    /// Update configuration (thread-safe)
    pub async fn update_config(
        &self,
        new_config: AppSetupConfig,
    ) -> Result<(), Box<dyn std::error::Error>> {
        {
            let mut config_guard = self.config.write().unwrap();
            *config_guard = new_config;
        }
        self.save_config().await?;
        log::info!("App setup configuration updated");
        Ok(())
    }

    /// Get current configuration (thread-safe)
    pub fn get_config(&self) -> AppSetupConfig {
        let config_guard = self.config.read().unwrap();
        config_guard.clone()
    }

    /// Get window state for a specific window (thread-safe)
    pub fn get_window_state(&self, window_label: &str) -> Option<WindowState> {
        let states_guard = self.window_states.read().unwrap();
        states_guard.get(window_label).cloned()
    }

    /// Enable or disable auto-save
    pub fn set_auto_save_enabled(&self, enabled: bool) {
        let mut auto_save_guard = self.auto_save_enabled.write().unwrap();
        *auto_save_guard = enabled;
        log::info!("Auto-save {}", if enabled { "enabled" } else { "disabled" });
    }
}

/// Setup hook function called during app initialization
pub async fn setup_hook(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    // Get app data directory
    let _app_handle = app.handle();
    // Use a simple config directory for now - Tauri v2 path resolution needs different approach
    let config_dir = std::env::current_dir()
        .unwrap_or_default()
        .join(".config")
        .join("autodev-ai");

    // Create thread-safe setup manager
    let setup_manager = SetupManager::new(config_dir);

    // Initialize setup
    setup_manager.initialize(app).await?;

    // Store setup manager in app state
    app.manage(setup_manager);

    log::info!("App setup hook completed successfully");
    Ok(())
}

/// Tauri command to get app setup configuration
#[tauri::command]
pub async fn get_setup_config(
    setup: tauri::State<'_, SetupManager>,
) -> Result<AppSetupConfig, String> {
    Ok(setup.get_config().clone())
}

/// Tauri command to update app setup configuration
#[tauri::command]
pub async fn update_setup_config(
    setup: tauri::State<'_, SetupManager>,
    config: AppSetupConfig,
) -> Result<(), String> {
    setup
        .update_config(config)
        .await
        .map_err(|e| format!("Failed to update setup config: {}", e))?;
    Ok(())
}

/// Tauri command to save current window state
#[tauri::command]
pub async fn save_window_state(
    window: Window,
    setup: tauri::State<'_, SetupManager>,
) -> Result<(), String> {
    setup
        .save_current_window_state(&window)
        .await
        .map_err(|e| format!("Failed to save window state: {}", e))?;
    log::info!("Window state saved for {}", window.label());
    Ok(())
}

/// Tauri command to get window state
#[tauri::command]
pub async fn get_window_state(
    window_label: String,
    setup: tauri::State<'_, SetupManager>,
) -> Result<Option<WindowState>, String> {
    Ok(setup.get_window_state(&window_label))
}

/// Tauri command to restore window state
#[tauri::command]
pub async fn restore_window_state(
    window: Window,
    setup: tauri::State<'_, SetupManager>,
) -> Result<(), String> {
    setup.restore_window_state(&window).await;
    Ok(())
}

/// Tauri command to enable/disable auto-save
#[tauri::command]
pub async fn set_auto_save_enabled(
    enabled: bool,
    setup: tauri::State<'_, SetupManager>,
) -> Result<(), String> {
    setup.set_auto_save_enabled(enabled);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_setup_manager_creation() {
        let temp_dir = TempDir::new().unwrap();
        let setup_manager = SetupManager::new(temp_dir.path().to_path_buf());

        assert!(setup_manager.config_path.ends_with("setup_config.json"));
        assert_eq!(setup_manager.config.read().unwrap().theme, "system");
    }

    #[tokio::test]
    async fn test_config_save_load() {
        let temp_dir = TempDir::new().unwrap();
        let setup_manager = SetupManager::new(temp_dir.path().to_path_buf());

        // Save default config
        setup_manager.save_config().await.unwrap();
        assert!(setup_manager.config_path.exists());

        // Modify and save
        {
            let mut config_guard = setup_manager.config.write().unwrap();
            config_guard.theme = "dark".to_string();
        }
        setup_manager.save_config().await.unwrap();

        // Create new manager and load
        let new_manager = SetupManager::new(temp_dir.path().to_path_buf());
        new_manager.load_config().await.unwrap();

        assert_eq!(new_manager.config.read().unwrap().theme, "dark");
    }

    #[test]
    fn test_window_state_default() {
        let state = WindowState::default();
        assert_eq!(state.width, 1200);
        assert_eq!(state.height, 800);
        assert!(!state.maximized);
        assert!(state.visible);
    }
}
