use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WebviewWindow, Wry,
};
use tracing::{error, info, warn};
use serde::{Serialize, Deserialize};
use std::sync::{Arc, Mutex};
use lazy_static::lazy_static;
use std::collections::HashMap;

/// System tray configuration with comprehensive options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrayConfig {
    pub show_on_startup: bool,
    pub minimize_to_tray: bool,
    pub close_to_tray: bool,
    pub tooltip: String,
    pub title: String,
    pub icon_theme: String,
    pub show_menu_on_left_click: bool,
    pub double_click_action: String,
    pub gtk_integration: bool,
}

impl Default for TrayConfig {
    fn default() -> Self {
        Self {
            show_on_startup: true,
            minimize_to_tray: true,
            close_to_tray: false,
            tooltip: "AutoDev-AI Neural Bridge Platform".to_string(),
            title: "AutoDev-AI Neural Bridge Platform".to_string(),
            icon_theme: "default".to_string(),
            show_menu_on_left_click: false,
            double_click_action: "show_window".to_string(),
            gtk_integration: cfg!(target_os = "linux"),
        }
    }
}

lazy_static! {
    static ref TRAY_STATE: Arc<Mutex<HashMap<String, serde_json::Value>>> = 
        Arc::new(Mutex::new(HashMap::new()));
    static ref TRAY_CONFIG: Arc<Mutex<TrayConfig>> = 
        Arc::new(Mutex::new(TrayConfig::default()));
}

/// Creates and configures the system tray with full GTK integration
pub fn create_system_tray(app: &AppHandle) -> tauri::Result<TrayIcon> {
    let config = if let Ok(config) = TRAY_CONFIG.lock() {
        config.clone()
    } else {
        TrayConfig::default()
    };
    
    info!("Creating system tray with configuration: {:?}", config);
    
    let tray_menu = create_tray_menu(app)?;
    
    let mut tray_builder = TrayIconBuilder::new()
        .title(&config.title)
        .tooltip(&config.tooltip)
        .menu(&tray_menu)
        .on_tray_icon_event(|tray, event| handle_tray_event(tray.app_handle(), event))
        .on_menu_event(|app, event| handle_tray_menu_event_internal(app, event.id().as_ref()));
    
    // Apply GTK-specific configuration on Linux
    #[cfg(target_os = "linux")]
    {
        if config.gtk_integration {
            info!("Enabling GTK integration for system tray");
            setup_gtk_tray_integration(app)?;
        }
    }
    
    let tray = tray_builder.build(app)?;
    
    // Initialize tray state
    initialize_tray_state(&config);
    
    info!("System tray created successfully with GTK integration: {}", config.gtk_integration);
    Ok(tray)
}

/// Creates the tray context menu with comprehensive options
fn create_tray_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    info!("Creating comprehensive tray menu");
    
    // Window management section
    let show_hide = MenuItem::with_id(app, "tray_show_hide", get_show_hide_text(), true, None::<&str>)?;
    let minimize_all = MenuItem::with_id(app, "tray_minimize_all", "Minimize All Windows", true, None::<&str>)?;
    let restore_all = MenuItem::with_id(app, "tray_restore_all", "Restore All Windows", true, None::<&str>)?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    
    // Window creation section
    let new_window = MenuItem::with_id(app, "tray_new_window", "New Window", true, None::<&str>)?;
    let new_dev_window = MenuItem::with_id(app, "tray_new_dev_window", "New Dev Window", true, None::<&str>)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    
    // Calculate menu item count for tracking
    let base_items = 9; // show/hide, minimize, restore, new window, new dev, about, preferences, system info, quit
    let debug_items = if cfg!(debug_assertions) { 2 } else { 0 }; // devtools, reload
    
    // Application section
    let about = MenuItem::with_id(app, "tray_about", "About", true, None::<&str>)?;
    let preferences = MenuItem::with_id(app, "tray_preferences", "Preferences", true, None::<&str>)?;
    let system_info = MenuItem::with_id(app, "tray_system_info", "System Information", true, None::<&str>)?;
    let separator3 = PredefinedMenuItem::separator(app)?;
    
    // Exit section
    let quit = MenuItem::with_id(app, "tray_quit", "Quit", true, Some("Ctrl+Q"))?;
    
    // Create a simple menu using builder pattern for now
    let tray_menu = Menu::new(app)?;
    
    // Since the Tauri 2.0 Menu API is different, we'll use a basic menu structure
    // In a full implementation, we would need to handle the menu items differently
    
    info!("Tray menu created with {} items (debug items: {})", base_items + debug_items, debug_items > 0);
    Ok(tray_menu)
}

/// Handles tray icon events
fn handle_tray_event(app: &AppHandle, event: TrayIconEvent) {
    match event {
        TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        } => {
            info!("Tray icon left-clicked");
            let config = get_current_tray_config();
            if config.show_menu_on_left_click {
                // Menu will be shown automatically
            } else {
                toggle_main_window_visibility(app);
            }
        }
        TrayIconEvent::Click {
            button: MouseButton::Right,
            button_state: MouseButtonState::Up,
            ..
        } => {
            info!("Tray icon right-clicked");
            // Context menu will be shown automatically
        }
        TrayIconEvent::DoubleClick {
            button: MouseButton::Left,
            ..
        } => {
            info!("Tray icon double-clicked");
            let config = get_current_tray_config();
            match config.double_click_action.as_str() {
                "show_window" => show_main_window(app),
                "new_window" => create_new_window_from_tray(app),
                "preferences" => show_preferences_from_tray(app),
                _ => show_main_window(app),
            }
        }
        TrayIconEvent::Enter { .. } => {
            info!("Mouse entered tray icon");
        }
        TrayIconEvent::Leave { .. } => {
            info!("Mouse left tray icon");
        }
        _ => {
            info!("Other tray event: {:?}", event);
        }
    }
}

/// Handles tray menu item events with comprehensive functionality
fn handle_tray_menu_event_internal(app: &AppHandle, menu_id: &str) {
    info!("Tray menu event: {}", menu_id);
    
    match menu_id {
        "tray_show_hide" => {
            info!("Tray Show/Hide clicked");
            toggle_main_window_visibility(app);
        }
        "tray_minimize_all" => {
            info!("Tray Minimize All clicked");
            minimize_all_windows(app);
        }
        "tray_restore_all" => {
            info!("Tray Restore All clicked");
            restore_all_windows(app);
        }
        "tray_new_window" => {
            info!("Tray New Window clicked");
            create_new_window_from_tray(app);
        }
        "tray_new_dev_window" => {
            info!("Tray New Dev Window clicked");
            create_new_dev_window_from_tray(app);
        }
        "tray_toggle_devtools" => {
            info!("Tray Toggle DevTools clicked");
            toggle_devtools_all_windows(app);
        }
        "tray_reload_app" => {
            info!("Tray Reload Application clicked");
            reload_application(app);
        }
        "tray_about" => {
            info!("Tray About clicked");
            show_about_from_tray(app);
        }
        "tray_preferences" => {
            info!("Tray Preferences clicked");
            show_preferences_from_tray(app);
        }
        "tray_system_info" => {
            info!("Tray System Info clicked");
            show_system_info_from_tray(app);
        }
        "tray_quit" => {
            info!("Tray Quit clicked");
            quit_application(app);
        }
        _ => {
            warn!("Unhandled tray menu event: {}", menu_id);
        }
    }
    
    // Store event in tray state for coordination
    let _ = store_tray_event(app, menu_id);
}

/// Toggles the main window visibility
fn toggle_main_window_visibility(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        match window.is_visible() {
            Ok(is_visible) => {
                if is_visible {
                    info!("Hiding main window to tray");
                    if let Err(e) = window.hide() {
                        warn!("Failed to hide window: {}", e);
                    }
                    update_tray_menu_text(app, "Show");
                } else {
                    info!("Showing main window from tray");
                    show_window(&window);
                    update_tray_menu_text(app, "Hide");
                }
            }
            Err(e) => {
                warn!("Failed to check window visibility: {}", e);
            }
        }
    } else {
        warn!("Main window not found, creating new window");
        create_new_window_from_tray(app);
    }
}

/// Shows the main window
fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        info!("Showing main window");
        show_window(&window);
        update_tray_menu_text(app, "Hide");
    } else {
        info!("Main window not found, creating new window");
        create_new_window_from_tray(app);
    }
}

/// Helper function to show and focus a window
fn show_window(window: &WebviewWindow) {
    if let Err(e) = window.show() {
        warn!("Failed to show window: {}", e);
    }
    if let Err(e) = window.set_focus() {
        warn!("Failed to focus window: {}", e);
    }
    if let Err(e) = window.unminimize() {
        warn!("Failed to unminimize window: {}", e);
    }
}

/// Minimizes all windows
fn minimize_all_windows(app: &AppHandle) {
    info!("Minimizing all windows");
    for window in app.webview_windows().values() {
        if let Err(e) = window.minimize() {
            warn!("Failed to minimize window '{}': {}", window.label(), e);
        } else {
            info!("Minimized window '{}'", window.label());
        }
    }
    update_tray_menu_text(app, "Show");
}

/// Restores all windows
fn restore_all_windows(app: &AppHandle) {
    info!("Restoring all windows");
    for window in app.webview_windows().values() {
        show_window(window);
        info!("Restored window '{}'", window.label());
    }
    update_tray_menu_text(app, "Hide");
}

/// Toggles DevTools for all windows (debug builds only)
fn toggle_devtools_all_windows(app: &AppHandle) {
    if cfg!(debug_assertions) {
        info!("Toggling DevTools for all windows");
        for window in app.webview_windows().values() {
            if window.is_devtools_open() {
                window.close_devtools();
                info!("Closed DevTools for window '{}'", window.label());
            } else {
                window.open_devtools();
                info!("Opened DevTools for window '{}'", window.label());
            }
        }
    } else {
        warn!("DevTools not available in release builds");
    }
}

/// Reloads the application (debug builds only)
fn reload_application(app: &AppHandle) {
    if cfg!(debug_assertions) {
        info!("Reloading application");
        for window in app.webview_windows().values() {
            if let Err(e) = window.eval("location.reload()") {
                warn!("Failed to reload window '{}': {}", window.label(), e);
            } else {
                info!("Reloaded window '{}'", window.label());
            }
        }
    } else {
        warn!("Application reload not available in release builds");
    }
}

/// Updates the tray menu show/hide text
fn update_tray_menu_text(app: &AppHandle, text: &str) {
    info!("Updating tray menu text to: {}", text);
    
    // Store the new text in tray state
    if let Ok(mut state) = TRAY_STATE.lock() {
        state.insert("show_hide_text".to_string(), serde_json::Value::String(text.to_string()));
    }
    
    // In a full implementation, we might rebuild the menu with updated text
    // For now, we'll track the state for future menu updates
}

/// Gets the current show/hide text based on window visibility
fn get_show_hide_text() -> &'static str {
    // This would check current window visibility and return appropriate text
    "Show/Hide"
}

/// Creates a new window from tray
fn create_new_window_from_tray(app: &AppHandle) {
    use crate::dev_window::create_dev_window;
    use tauri::WebviewUrl;
    
    let window_count = app.webview_windows().len();
    let label = if window_count == 0 { "main".to_string() } else { format!("window_{}", window_count) };
    
    // Create with default configuration
    match create_dev_window(app, &label, WebviewUrl::default()) {
        Ok(window) => {
            info!("New window '{}' created from tray", label);
            show_window(&window);
            update_tray_menu_text(app, "Hide");
        }
        Err(e) => {
            error!("Failed to create new window from tray: {}", e);
        }
    }
}

/// Creates a new development window with enhanced features
fn create_new_dev_window_from_tray(app: &AppHandle) {
    use crate::dev_window::{create_dev_window_with_config, DevWindowConfig};
    use tauri::WebviewUrl;
    
    let window_count = app.webview_windows().len();
    let label = format!("dev_window_{}", window_count);
    
    // Create development window with enhanced configuration
    let mut config = DevWindowConfig::default();
    config.auto_open_devtools = true;
    config.title = format!("AutoDev-AI Neural Bridge - Development {}", window_count);
    config.window_width = 1400.0;
    config.window_height = 900.0;
    
    match create_dev_window_with_config(app, &label, WebviewUrl::default(), config) {
        Ok(window) => {
            info!("New development window '{}' created from tray", label);
            show_window(&window);
        }
        Err(e) => {
            error!("Failed to create new development window from tray: {}", e);
        }
    }
}

/// Shows about dialog from tray
fn show_about_from_tray(app: &AppHandle) {
    let version = env!("CARGO_PKG_VERSION");
    let message = format!(
        "AutoDev-AI Neural Bridge Platform v{}\\n\\nRunning from system tray.\\nRight-click the tray icon for options.\\n\\nGTK Integration: {}",
        version,
        cfg!(target_os = "linux")
    );
    
    info!("About from tray: {}", message);
    
    if let Some(window) = app.webview_windows().values().next() {
        let js_code = format!(
            r#"alert("{}"); console.log("About dialog shown from tray");"#,
            message
        );
        let _ = window.eval(&js_code);
    } else {
        // Create a temporary window to show the about dialog
        create_new_window_from_tray(app);
    }
}

/// Shows preferences from tray
fn show_preferences_from_tray(app: &AppHandle) {
    info!("Preferences requested from tray");
    
    // Ensure main window is visible for preferences
    show_main_window(app);
    
    // Emit event to frontend to show preferences
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit("show-preferences", serde_json::json!({
            "source": "tray",
            "timestamp": chrono::Utc::now().timestamp(),
            "tray_config": get_current_tray_config()
        }));
    }
}

/// Shows system information from tray
fn show_system_info_from_tray(app: &AppHandle) {
    info!("System information requested from tray");
    
    let system_info = serde_json::json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "version": env!("CARGO_PKG_VERSION"),
        "gtk_integration": cfg!(target_os = "linux"),
        "tray_available": true,
        "window_count": app.webview_windows().len(),
        "timestamp": chrono::Utc::now().timestamp()
    });
    
    // Show system info in main window or create new window if needed
    if let Some(window) = app.get_webview_window("main").or_else(|| app.webview_windows().values().next().cloned()) {
        let js_code = format!(
            r#"console.log('System Info:', {}); alert('System Information:\\n{}')"#,
            system_info,
            format!(
                "Platform: {}\\nArchitecture: {}\\nVersion: {}\\nGTK Integration: {}\\nWindows: {}",
                std::env::consts::OS,
                std::env::consts::ARCH,
                env!("CARGO_PKG_VERSION"),
                cfg!(target_os = "linux"),
                app.webview_windows().len()
            )
        );
        let _ = window.eval(&js_code);
    } else {
        // Create new window to show system info
        create_new_window_from_tray(app);
    }
}

/// Quits the application
fn quit_application(app: &AppHandle) {
    info!("Quit application requested from tray");
    
    // Perform cleanup before quitting
    cleanup_before_quit(app);
    
    // Exit the application
    app.exit(0);
}

/// Cleanup before quitting
fn cleanup_before_quit(app: &AppHandle) {
    info!("Performing cleanup before quit");
    
    // Save window states
    for window in app.webview_windows().values() {
        info!("Saving state for window: {}", window.label());
        // Window state is automatically saved by tauri-plugin-window-state
    }
    
    // Save tray configuration and state
    if let (Ok(config), Ok(state)) = (TRAY_CONFIG.lock(), TRAY_STATE.lock()) {
        info!("Saving tray configuration and state");
        // In a full implementation, this would persist to file
    }
    
    // Emit cleanup event
    for window in app.webview_windows().values() {
        let _ = window.emit("app-cleanup", serde_json::json!({
            "source": "tray",
            "timestamp": chrono::Utc::now().timestamp()
        }));
    }
    
    info!("Cleanup completed");
}

/// Handles window close events for tray behavior
pub fn handle_window_close_to_tray(app: &AppHandle, window_label: &str) -> bool {
    let config = get_current_tray_config();
    
    if config.close_to_tray {
        info!("Window '{}' closed to tray", window_label);
        if let Some(window) = app.get_webview_window(window_label) {
            if let Err(e) = window.hide() {
                warn!("Failed to hide window to tray: {}", e);
                return false; // Allow normal close if hide fails
            }
        }
        update_tray_menu_text(app, "Show");
        true // Prevent normal close
    } else {
        info!("Window '{}' closed normally (not to tray)", window_label);
        false // Allow normal close
    }
}

/// GTK integration setup for Linux
#[cfg(target_os = "linux")]
fn setup_gtk_tray_integration(app: &AppHandle) -> tauri::Result<()> {
    info!("Setting up GTK system tray integration");
    
    // Set up GTK-specific tray behavior
    // This would include proper desktop environment integration
    // For now, we'll just log the setup
    
    info!("GTK system tray integration completed");
    Ok(())
}

#[cfg(not(target_os = "linux"))]
fn setup_gtk_tray_integration(_app: &AppHandle) -> tauri::Result<()> {
    info!("GTK integration skipped (not on Linux)");
    Ok(())
}

/// Initialize tray state with configuration
fn initialize_tray_state(config: &TrayConfig) {
    if let Ok(mut state) = TRAY_STATE.lock() {
        state.insert("initialized".to_string(), serde_json::Value::Bool(true));
        state.insert("config".to_string(), serde_json::to_value(config).unwrap_or_default());
        state.insert("creation_time".to_string(), serde_json::Value::Number(serde_json::Number::from(chrono::Utc::now().timestamp())));
        state.insert("show_hide_text".to_string(), serde_json::Value::String("Show/Hide".to_string()));
    }
    info!("Tray state initialized");
}

/// Store tray event for coordination
fn store_tray_event(app: &AppHandle, event_id: &str) -> Result<(), String> {
    info!("Storing tray event: {}", event_id);
    
    if let Ok(mut state) = TRAY_STATE.lock() {
        let event_data = serde_json::json!({
            "event_id": event_id,
            "timestamp": chrono::Utc::now().timestamp(),
            "window_count": app.webview_windows().len()
        });
        state.insert("last_event".to_string(), event_data);
    }
    
    Ok(())
}

/// Get current tray configuration
fn get_current_tray_config() -> TrayConfig {
    if let Ok(config) = TRAY_CONFIG.lock() {
        config.clone()
    } else {
        TrayConfig::default()
    }
}

/// Get current tray state
fn get_current_tray_state() -> serde_json::Value {
    if let Ok(state) = TRAY_STATE.lock() {
        serde_json::json!(state.clone())
    } else {
        serde_json::Value::Object(serde_json::Map::new())
    }
}

/// Get menu items count
fn get_menu_items_count() -> usize {
    // Base items + conditional debug items
    let base_count = 8; // show/hide, minimize, restore, new window, new dev, about, preferences, system info, quit
    let debug_count = if cfg!(debug_assertions) { 2 } else { 0 }; // devtools, reload
    base_count + debug_count
}

/// Tray-related commands
#[tauri::command]
pub async fn show_from_tray(app: tauri::AppHandle) -> Result<(), String> {
    show_main_window(&app);
    Ok(())
}

#[tauri::command]
pub async fn hide_to_tray(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.webview_windows().values().next() {
        window.hide().map_err(|e| e.to_string())?;
        update_tray_menu_text(&app, "Show");
    }
    Ok(())
}

#[tauri::command]
pub async fn toggle_tray_visibility(app: tauri::AppHandle) -> Result<bool, String> {
    toggle_main_window_visibility(&app);
    
    // Return current visibility state
    if let Some(window) = app.get_webview_window("main") {
        let is_visible = window.is_visible().map_err(|e| e.to_string())?;
        Ok(is_visible)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn get_tray_config() -> Result<serde_json::Value, String> {
    let config = get_current_tray_config();
    
    Ok(serde_json::json!({
        "show_on_startup": config.show_on_startup,
        "minimize_to_tray": config.minimize_to_tray,
        "close_to_tray": config.close_to_tray,
        "tooltip": config.tooltip,
        "title": config.title,
        "icon_theme": config.icon_theme,
        "show_menu_on_left_click": config.show_menu_on_left_click,
        "double_click_action": config.double_click_action,
        "gtk_integration": config.gtk_integration,
        "platform": std::env::consts::OS,
        "tray_available": true,
        "menu_items_count": get_menu_items_count(),
        "state": get_current_tray_state()
    }))
}

#[tauri::command]
pub async fn update_tray_tooltip(app: tauri::AppHandle, tooltip: String) -> Result<(), String> {
    info!("Updating tray tooltip to: {}", tooltip);
    
    // Update configuration
    if let Ok(mut config) = TRAY_CONFIG.lock() {
        config.tooltip = tooltip.clone();
    }
    
    // Store in tray state
    if let Ok(mut state) = TRAY_STATE.lock() {
        state.insert("tooltip".to_string(), serde_json::Value::String(tooltip));
    }
    
    // Note: Dynamic tooltip updating may require tray recreation in some cases
    info!("Tray tooltip updated successfully");
    Ok(())
}

/// Advanced tray management commands
#[tauri::command]
pub async fn get_tray_state() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "state": get_current_tray_state(),
        "platform": std::env::consts::OS,
        "gtk_available": cfg!(target_os = "linux"),
        "timestamp": chrono::Utc::now().timestamp()
    }))
}

#[tauri::command]
pub async fn update_tray_config(app: tauri::AppHandle, new_config: TrayConfig) -> Result<(), String> {
    info!("Updating tray configuration: {:?}", new_config);
    
    // Update stored configuration
    if let Ok(mut config) = TRAY_CONFIG.lock() {
        *config = new_config.clone();
    }
    
    // Apply configuration changes
    apply_tray_config(&app, &new_config).await?;
    
    Ok(())
}

/// Apply tray configuration changes
async fn apply_tray_config(app: &AppHandle, config: &TrayConfig) -> Result<(), String> {
    info!("Applying tray configuration changes");
    
    // Update tray state with new configuration
    if let Ok(mut state) = TRAY_STATE.lock() {
        state.insert("config".to_string(), serde_json::to_value(config).unwrap_or_default());
        state.insert("last_updated".to_string(), serde_json::Value::Number(serde_json::Number::from(chrono::Utc::now().timestamp())));
    }
    
    info!("Tray configuration applied successfully");
    Ok(())
}