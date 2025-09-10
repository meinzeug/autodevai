// Plugin system for AutoDev-AI Neural Bridge Platform
// Provides modular functionality for window management, system integration, and neural orchestration

pub mod window_state;
pub mod system_tray;
pub mod menu;
pub mod dev_tools;
pub mod updater;
pub mod notifications;
pub mod global_shortcuts;
pub mod file_system;
pub mod logging;

use tauri::{App, Result};

/// Initialize all plugins for the application
pub async fn initialize_all_plugins(app: &mut App) -> Result<()> {
    tracing::info!("Initializing AutoDev-AI plugin system...");
    
    // Core window management
    window_state::setup_window_state_plugin(app).await?;
    tracing::info!("✓ Window state plugin initialized");
    
    // System integration
    system_tray::setup_system_tray_plugin(app).await?;
    tracing::info!("✓ System tray plugin initialized");
    
    // Menu system
    menu::setup_menu_plugin(app).await?;
    tracing::info!("✓ Menu plugin initialized");
    
    // Development tools
    dev_tools::setup_dev_tools_plugin(app).await?;
    tracing::info!("✓ Development tools plugin initialized");
    
    // Auto-updater
    updater::setup_updater_plugin(app).await?;
    tracing::info!("✓ Updater plugin initialized");
    
    // Notifications
    notifications::setup_notifications_plugin(app).await?;
    tracing::info!("✓ Notifications plugin initialized");
    
    // Global shortcuts
    global_shortcuts::setup_shortcuts_plugin(app).await?;
    tracing::info!("✓ Global shortcuts plugin initialized");
    
    // File system access
    file_system::setup_filesystem_plugin(app).await?;
    tracing::info!("✓ File system plugin initialized");
    
    // Logging system
    logging::setup_logging_plugin(app).await?;
    tracing::info!("✓ Logging plugin initialized");
    
    tracing::info!("🚀 All plugins initialized successfully");
    Ok(())
}

/// Plugin health check - verify all plugins are working correctly
pub async fn health_check(app: &App) -> Result<PluginHealthStatus> {
    let mut status = PluginHealthStatus::default();
    
    status.window_state = window_state::health_check(app).await;
    status.system_tray = system_tray::health_check(app).await;
    status.menu = menu::health_check(app).await;
    status.dev_tools = dev_tools::health_check(app).await;
    status.updater = updater::health_check(app).await;
    status.notifications = notifications::health_check(app).await;
    status.global_shortcuts = global_shortcuts::health_check(app).await;
    status.file_system = file_system::health_check(app).await;
    status.logging = logging::health_check(app).await;
    
    Ok(status)
}

#[derive(Debug, Default, Clone, serde::Serialize, serde::Deserialize)]
pub struct PluginHealthStatus {
    pub window_state: bool,
    pub system_tray: bool,
    pub menu: bool,
    pub dev_tools: bool,
    pub updater: bool,
    pub notifications: bool,
    pub global_shortcuts: bool,
    pub file_system: bool,
    pub logging: bool,
}

impl PluginHealthStatus {
    pub fn all_healthy(&self) -> bool {
        self.window_state
            && self.system_tray
            && self.menu
            && self.dev_tools
            && self.updater
            && self.notifications
            && self.global_shortcuts
            && self.file_system
            && self.logging
    }
}