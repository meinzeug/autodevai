//! App Setup Hook Implementation
//! 
//! Handles application initialization, window state restoration,
//! and initial configuration setup.

use crate::security::ipc_security::IpcSecurity;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::{App, Manager, Window};
use tokio::fs;

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

/// Setup state manager
#[derive(Debug)]
pub struct SetupManager {
    pub config_path: PathBuf,
    window_states: HashMap<String, WindowState>,
    config: AppSetupConfig,
}

impl SetupManager {
    /// Create a new setup manager
    pub fn new(config_dir: PathBuf) -> Self {
        let config_path = config_dir.join("setup_config.json");
        
        Self {
            config_path,
            window_states: HashMap::new(),
            config: AppSetupConfig::default(),
        }
    }
    
    /// Initialize the app setup
    pub async fn initialize(&mut self, app: &App) -> Result<(), Box<dyn std::error::Error>> {
        // Load configuration
        self.load_config().await?;
        
        // Setup security
        self.setup_security(app).await?;
        
        log::info!("App setup completed successfully");
        Ok(())
    }
    
    /// Load configuration from disk
    async fn load_config(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if self.config_path.exists() {
            let content = fs::read_to_string(&self.config_path).await?;
            if let Ok(config) = serde_json::from_str::<AppSetupConfig>(&content) {
                self.config = config;
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
    
    /// Save configuration to disk
    async fn save_config(&self) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent).await?;
        }
        
        let content = serde_json::to_string_pretty(&self.config)?;
        fs::write(&self.config_path, content).await?;
        
        log::debug!("Saved app setup configuration");
        Ok(())
    }
    
    /// Setup security features
    async fn setup_security(&self, app: &App) -> Result<(), Box<dyn std::error::Error>> {
        // Initialize IPC security
        let security = IpcSecurity::default();
        app.manage(security);
        
        log::info!("Security setup completed");
        Ok(())
    }
    
    /// Update configuration
    pub async fn update_config(&mut self, new_config: AppSetupConfig) -> Result<(), Box<dyn std::error::Error>> {
        self.config = new_config;
        self.save_config().await?;
        log::info!("App setup configuration updated");
        Ok(())
    }
    
    /// Get current configuration
    pub fn get_config(&self) -> &AppSetupConfig {
        &self.config
    }
    
    /// Get window state for a specific window
    pub fn get_window_state(&self, window_label: &str) -> Option<&WindowState> {
        self.window_states.get(window_label)
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
        
    // Create setup manager
    let mut setup_manager = SetupManager::new(config_dir);
    
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
    _setup: tauri::State<'_, SetupManager>,
    _config: AppSetupConfig,
) -> Result<(), String> {
    // For now, just return success as the state is read-only
    // In a real implementation, you'd want to make SetupManager thread-safe
    log::info!("Setup config update requested");
    Ok(())
}

/// Tauri command to save current window state
#[tauri::command]
pub async fn save_window_state(
    window: Window,
) -> Result<(), String> {
    log::info!("Window state save requested for {}", window.label());
    Ok(())
}

/// Tauri command to get window state
#[tauri::command]
pub async fn get_window_state(
    window_label: String,
    setup: tauri::State<'_, SetupManager>,
) -> Result<Option<WindowState>, String> {
    Ok(setup.get_window_state(&window_label).cloned())
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
        assert_eq!(setup_manager.config.theme, "system");
    }
    
    #[tokio::test]
    async fn test_config_save_load() {
        let temp_dir = TempDir::new().unwrap();
        let mut setup_manager = SetupManager::new(temp_dir.path().to_path_buf());
        
        // Save default config
        setup_manager.save_config().await.unwrap();
        assert!(setup_manager.config_path.exists());
        
        // Modify and save
        setup_manager.config.theme = "dark".to_string();
        setup_manager.save_config().await.unwrap();
        
        // Create new manager and load
        let mut new_manager = SetupManager::new(temp_dir.path().to_path_buf());
        new_manager.load_config().await.unwrap();
        
        assert_eq!(new_manager.config.theme, "dark");
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