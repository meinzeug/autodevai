use tauri::{AppHandle, WebviewWindow, WebviewWindowBuilder, WebviewUrl};
use tracing::{info, warn};

/// Configuration for development window with DevTools auto-open
pub struct DevWindowConfig {
    pub auto_open_devtools: bool,
    pub enable_inspector: bool,
    pub debug_enabled: bool,
}

impl Default for DevWindowConfig {
    fn default() -> Self {
        Self {
            auto_open_devtools: cfg!(debug_assertions),
            enable_inspector: cfg!(debug_assertions),
            debug_enabled: cfg!(debug_assertions),
        }
    }
}

/// Creates and configures a development window with enhanced debugging features
pub fn create_dev_window(app: &AppHandle, label: &str, url: WebviewUrl) -> tauri::Result<WebviewWindow> {
    let config = DevWindowConfig::default();
    
    info!("Creating development window '{}' with debug features: {}", label, config.debug_enabled);
    
    let window = WebviewWindowBuilder::new(app, label, url)
        .title("AutoDev-AI Neural Bridge - Development")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .resizable(true)
        .maximized(false)
        .visible(true)
        .decorations(true)
        .transparent(false)
        .always_on_top(false)
        .skip_taskbar(false)
        .build()?;
    
    // Auto-open DevTools in debug builds only
    if config.auto_open_devtools {
        info!("Auto-opening DevTools for development window");
        
        // Use a delay to ensure window is fully loaded
        let window_clone = window.clone();
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
            window_clone.open_devtools();
            info!("DevTools opened for development window");
        });
    }
    
    // Set up development-specific window events
    setup_dev_window_events(&window)?;
    
    Ok(window)
}

/// Sets up event handlers specific to development windows
fn setup_dev_window_events(window: &WebviewWindow) -> tauri::Result<()> {
    let window_label = window.label().to_string();
    
    window.on_window_event(move |event| {
        match event {
            tauri::WindowEvent::Focused(focused) => {
                if *focused {
                    info!("Development window '{}' gained focus", window_label);
                } else {
                    info!("Development window '{}' lost focus", window_label);
                }
            },
            tauri::WindowEvent::Resized(size) => {
                info!("Development window '{}' resized to {}x{}", window_label, size.width, size.height);
            },
            tauri::WindowEvent::Moved(position) => {
                info!("Development window '{}' moved to {}x{}", window_label, position.x, position.y);
            },
            tauri::WindowEvent::CloseRequested { .. } => {
                info!("Development window '{}' close requested", window_label);
                // Allow close in development mode
            },
            _ => {}
        }
    });
    
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
        "debug_build": cfg!(debug_assertions)
    }))
}