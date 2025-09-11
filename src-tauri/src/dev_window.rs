use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tracing::{info, warn};

/// Configuration for development window with DevTools auto-open
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevWindowConfig {
    pub auto_open_devtools: bool,
    pub enable_inspector: bool,
    pub debug_enabled: bool,
    pub window_width: f64,
    pub window_height: f64,
    pub min_width: f64,
    pub min_height: f64,
    pub always_on_top: bool,
    pub resizable: bool,
    pub maximizable: bool,
    pub minimizable: bool,
    pub closable: bool,
    pub title: String,
    pub transparent: bool,
    pub decorations: bool,
    pub shadow: bool,
    pub center: bool,
    pub visible_on_all_workspaces: bool,
    pub skip_taskbar: bool,
    pub devtools_delay_ms: u64,
}

impl Default for DevWindowConfig {
    fn default() -> Self {
        Self {
            auto_open_devtools: cfg!(debug_assertions),
            enable_inspector: cfg!(debug_assertions),
            debug_enabled: cfg!(debug_assertions),
            window_width: 1200.0,
            window_height: 800.0,
            min_width: 800.0,
            min_height: 600.0,
            always_on_top: false,
            resizable: true,
            maximizable: true,
            minimizable: true,
            closable: true,
            title: "AutoDev-AI Neural Bridge Platform".to_string(),
            transparent: false,
            decorations: true,
            shadow: true,
            center: true,
            visible_on_all_workspaces: false,
            skip_taskbar: false,
            devtools_delay_ms: 1000,
        }
    }
}

lazy_static! {
    static ref WINDOW_CONFIGS: Arc<Mutex<HashMap<String, DevWindowConfig>>> =
        Arc::new(Mutex::new(HashMap::new()));
}

/// Creates and configures a development window with enhanced debugging features
pub fn create_dev_window(
    app: &AppHandle,
    label: &str,
    url: WebviewUrl,
) -> tauri::Result<WebviewWindow> {
    create_dev_window_with_config(app, label, url, DevWindowConfig::default())
}

/// Creates a development window with custom configuration
pub fn create_dev_window_with_config(
    app: &AppHandle,
    label: &str,
    url: WebviewUrl,
    config: DevWindowConfig,
) -> tauri::Result<WebviewWindow> {
    info!(
        "Creating development window '{}' with config: {:?}",
        label, config
    );

    // Store configuration for this window
    if let Ok(mut configs) = WINDOW_CONFIGS.lock() {
        configs.insert(label.to_string(), config.clone());
    }

    let window = WebviewWindowBuilder::new(app, label, url)
        .title(&config.title)
        .inner_size(config.window_width, config.window_height)
        .min_inner_size(config.min_width, config.min_height)
        .resizable(config.resizable)
        .maximizable(config.maximizable)
        .minimizable(config.minimizable)
        .closable(config.closable)
        .visible(true)
        .decorations(config.decorations)
        .transparent(config.transparent)
        .shadow(config.shadow)
        .always_on_top(config.always_on_top)
        .skip_taskbar(config.skip_taskbar)
        .visible_on_all_workspaces(config.visible_on_all_workspaces)
        .center()
        .build()?;

    // Auto-open DevTools with configurable delay
    if config.auto_open_devtools {
        info!(
            "Auto-opening DevTools for development window with {}ms delay",
            config.devtools_delay_ms
        );

        let window_clone = window.clone();
        let delay = config.devtools_delay_ms;
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;
            if window_clone.is_devtools_open() {
                info!(
                    "DevTools already open for window '{}'",
                    window_clone.label()
                );
            } else {
                window_clone.open_devtools();
                info!(
                    "DevTools opened for development window '{}'",
                    window_clone.label()
                );
            }
        });
    }

    // Set up development-specific window events
    setup_dev_window_events(&window, config)?;

    // Setup native GTK integration for Ubuntu
    setup_gtk_integration(&window)?;

    info!("Development window '{}' created successfully", label);
    Ok(window)
}

/// Sets up event handlers specific to development windows
fn setup_dev_window_events(window: &WebviewWindow, config: DevWindowConfig) -> tauri::Result<()> {
    let window_label = window.label().to_string();
    let app_handle = window.app_handle().clone();

    window.on_window_event(move |event| {
        match event {
            tauri::WindowEvent::Focused(focused) => {
                if *focused {
                    info!("Development window '{}' gained focus", window_label);
                    // Store focus event in memory for coordination
                    let _ = store_window_event(&app_handle, &window_label, "focus", "gained");
                } else {
                    info!("Development window '{}' lost focus", window_label);
                    let _ = store_window_event(&app_handle, &window_label, "focus", "lost");
                }
            }
            tauri::WindowEvent::Resized(size) => {
                info!(
                    "Development window '{}' resized to {}x{}",
                    window_label, size.width, size.height
                );
                let event_data = format!("{}x{}", size.width, size.height);
                let _ = store_window_event(&app_handle, &window_label, "resize", &event_data);
            }
            tauri::WindowEvent::Moved(position) => {
                info!(
                    "Development window '{}' moved to {}x{}",
                    window_label, position.x, position.y
                );
                let event_data = format!("{}x{}", position.x, position.y);
                let _ = store_window_event(&app_handle, &window_label, "move", &event_data);
            }
            tauri::WindowEvent::CloseRequested { .. } => {
                info!("Development window '{}' close requested", window_label);
                let _ = store_window_event(&app_handle, &window_label, "close", "requested");
            }
            tauri::WindowEvent::Destroyed => {
                info!("Development window '{}' destroyed", window_label);
                let _ = store_window_event(&app_handle, &window_label, "destroy", "completed");
                // Clean up configuration
                if let Ok(mut configs) = WINDOW_CONFIGS.lock() {
                    configs.remove(&window_label);
                }
            }
            _ => {}
        }
    });

    Ok(())
}

/// Sets up native GTK integration for Ubuntu 24.04
fn setup_gtk_integration(window: &WebviewWindow) -> tauri::Result<()> {
    #[cfg(target_os = "linux")]
    {
        info!("Setting up GTK integration for window '{}'", window.label());

        // Enable native window decorations and behaviors
        let _ = window.set_decorations(true);

        // Set proper window class for desktop integration
        if let Err(e) = window.set_title(&format!("AutoDev-AI Neural Bridge - {}", window.label()))
        {
            warn!("Failed to set window title for GTK integration: {}", e);
        }

        info!("GTK integration completed for window '{}'", window.label());
    }

    #[cfg(not(target_os = "linux"))]
    {
        info!("GTK integration skipped (not on Linux)");
    }

    Ok(())
}

/// Stores window events for coordination memory
fn store_window_event(
    _app: &AppHandle,
    window_label: &str,
    event_type: &str,
    event_data: &str,
) -> Result<(), String> {
    // This would integrate with the coordination memory system
    info!(
        "Storing window event: {} - {} - {}",
        window_label, event_type, event_data
    );
    Ok(())
}

/// Opens DevTools for an existing window (debug builds only)
pub fn open_devtools_for_window(window: &WebviewWindow) -> tauri::Result<()> {
    if cfg!(debug_assertions) {
        info!("Opening DevTools for window '{}'", window.label());
        window.open_devtools();
    } else {
        warn!("DevTools not available in release builds");
    }
    Ok(())
}

/// Closes DevTools for an existing window (debug builds only)
pub fn close_devtools_for_window(window: &WebviewWindow) -> tauri::Result<()> {
    if cfg!(debug_assertions) {
        info!("Closing DevTools for window '{}'", window.label());
        window.close_devtools();
    } else {
        warn!("DevTools not available in release builds");
    }
    Ok(())
}

/// Toggles DevTools for an existing window (debug builds only)
pub fn toggle_devtools_for_window(window: &WebviewWindow) -> tauri::Result<()> {
    if cfg!(debug_assertions) {
        info!("Toggling DevTools for window '{}'", window.label());
        if window.is_devtools_open() {
            window.close_devtools();
        } else {
            window.open_devtools();
        }
    } else {
        warn!("DevTools not available in release builds");
    }
    Ok(())
}

/// Checks if DevTools is available and open
pub fn is_devtools_available() -> bool {
    cfg!(debug_assertions)
}

/// Development-specific window commands
#[tauri::command]
pub async fn dev_toggle_devtools(window: WebviewWindow) -> Result<bool, String> {
    if cfg!(debug_assertions) {
        let is_open = window.is_devtools_open();
        if is_open {
            window.close_devtools();
        } else {
            window.open_devtools();
        }
        Ok(!is_open)
    } else {
        Err("DevTools not available in release builds".to_string())
    }
}

#[tauri::command]
pub async fn dev_window_info(window: WebviewWindow) -> Result<serde_json::Value, String> {
    let inner_size = window.inner_size().map_err(|e| e.to_string())?;
    let outer_size = window.outer_size().map_err(|e| e.to_string())?;
    let position = window.inner_position().map_err(|e| e.to_string())?;
    let scale_factor = window.scale_factor().map_err(|e| e.to_string())?;

    // Get stored configuration
    let config = if let Ok(configs) = WINDOW_CONFIGS.lock() {
        configs.get(window.label()).cloned().unwrap_or_default()
    } else {
        DevWindowConfig::default()
    };

    Ok(serde_json::json!({
        "label": window.label(),
        "title": window.title().map_err(|e| e.to_string())?,
        "inner_size": {
            "width": inner_size.width,
            "height": inner_size.height
        },
        "outer_size": {
            "width": outer_size.width,
            "height": outer_size.height
        },
        "position": {
            "x": position.x,
            "y": position.y
        },
        "scale_factor": scale_factor,
        "is_maximized": window.is_maximized().map_err(|e| e.to_string())?,
        "is_minimized": window.is_minimized().map_err(|e| e.to_string())?,
        "is_visible": window.is_visible().map_err(|e| e.to_string())?,
        "is_focused": window.is_focused().map_err(|e| e.to_string())?,
        "is_devtools_open": window.is_devtools_open(),
        "debug_build": cfg!(debug_assertions),
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "gtk_integration": cfg!(target_os = "linux"),
        "config": config
    }))
}

/// Get development window configuration
#[tauri::command]
pub async fn get_dev_window_config(window_label: String) -> Result<DevWindowConfig, String> {
    if let Ok(configs) = WINDOW_CONFIGS.lock() {
        Ok(configs.get(&window_label).cloned().unwrap_or_default())
    } else {
        Ok(DevWindowConfig::default())
    }
}

/// Update development window configuration
#[tauri::command]
pub async fn update_dev_window_config(
    window: WebviewWindow,
    config: DevWindowConfig,
) -> Result<(), String> {
    let label = window.label().to_string();
    info!("Updating configuration for window '{}'", label);

    // Store new configuration
    if let Ok(mut configs) = WINDOW_CONFIGS.lock() {
        configs.insert(label.clone(), config.clone());
    }

    // Apply configuration changes
    apply_window_config(&window, &config).await?;

    Ok(())
}

/// Apply configuration changes to existing window
async fn apply_window_config(
    window: &WebviewWindow,
    config: &DevWindowConfig,
) -> Result<(), String> {
    // Update window properties
    window.set_title(&config.title).map_err(|e| e.to_string())?;
    window
        .set_resizable(config.resizable)
        .map_err(|e| e.to_string())?;
    window
        .set_maximizable(config.maximizable)
        .map_err(|e| e.to_string())?;
    window
        .set_minimizable(config.minimizable)
        .map_err(|e| e.to_string())?;
    window
        .set_closable(config.closable)
        .map_err(|e| e.to_string())?;
    window
        .set_always_on_top(config.always_on_top)
        .map_err(|e| e.to_string())?;
    window
        .set_skip_taskbar(config.skip_taskbar)
        .map_err(|e| e.to_string())?;
    window
        .set_visible_on_all_workspaces(config.visible_on_all_workspaces)
        .map_err(|e| e.to_string())?;
    window
        .set_decorations(config.decorations)
        .map_err(|e| e.to_string())?;
    window
        .set_shadow(config.shadow)
        .map_err(|e| e.to_string())?;

    // Update size constraints
    window
        .set_min_size(Some(tauri::LogicalSize::new(
            config.min_width,
            config.min_height,
        )))
        .map_err(|e| e.to_string())?;

    info!("Configuration applied to window '{}'", window.label());
    Ok(())
}
