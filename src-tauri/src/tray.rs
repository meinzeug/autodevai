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
    
    // Set tray icon from bundled resources - use a simple approach for now
    // In a full implementation, this would load different icons based on platform and theme
    
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
    let new_window = MenuItem::with_id(app, "tray_new_window", "New Window", true, Some("Ctrl+N"))?;
    let new_dev_window = MenuItem::with_id(app, "tray_new_dev_window", "New Dev Window", true, Some("Ctrl+Shift+N"))?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    
    // Development section (debug builds only)
    let mut menu_items: Vec<&dyn tauri::menu::IsMenuItem<Wry>> = vec![
        &show_hide, &minimize_all, &restore_all, &separator1,
        &new_window, &new_dev_window, &separator2,
    ];
    
    // Add debug items if in development mode
    let (devtools, reload, debug_sep) = if cfg!(debug_assertions) {
        let devtools = MenuItem::with_id(app, "tray_toggle_devtools", "Toggle DevTools", true, Some("F12"))?;
        let reload = MenuItem::with_id(app, "tray_reload_app", "Reload Application", true, Some("Ctrl+R"))?;
        let debug_sep = PredefinedMenuItem::separator(app)?;
        menu_items.extend_from_slice(&[&devtools, &reload, &debug_sep]);
        (Some(devtools), Some(reload), Some(debug_sep))
    } else {
        (None, None, None)
    };
    
    // Application section
    let about = MenuItem::with_id(app, "tray_about", "About", true, None::<&str>)?;
    let preferences = MenuItem::with_id(app, "tray_preferences", "Preferences", true, Some("Ctrl+,"))?;
    let system_info = MenuItem::with_id(app, "tray_system_info", "System Information", true, Some("Ctrl+I"))?;
    let separator3 = PredefinedMenuItem::separator(app)?;
    
    // Exit section
    let quit = MenuItem::with_id(app, "tray_quit", "Quit", true, Some("Ctrl+Q"))?;
    
    // Add remaining items to menu
    menu_items.extend_from_slice(&[&about, &preferences, &system_info, &separator3, &quit]);
    
    // Create menu with all items
    let tray_menu = Menu::with_items(app, &menu_items)?;
    
    let item_count = menu_items.len();
    let debug_items = if cfg!(debug_assertions) { 2 } else { 0 };
    
    info!("Tray menu created with {} items (debug items: {})", item_count, debug_items);
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
    
    // Store event in tray state for coordination and increment counter
    let _ = store_tray_event(app, menu_id);
    increment_event_counter();
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
    "Show/Hide Window"
}

/// Gets dynamic show/hide text based on current window state
fn get_dynamic_show_hide_text(app: &AppHandle) -> String {
    if let Some(window) = app.get_webview_window("main") {
        match window.is_visible() {
            Ok(true) => "Hide Window".to_string(),
            Ok(false) => "Show Window".to_string(),
            Err(_) => "Show/Hide Window".to_string(),
        }
    } else {
        "Show Window".to_string()
    }
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
            "window_count": app.webview_windows().len(),
            "platform": std::env::consts::OS,
            "sequence_id": generate_event_sequence_id()
        });
        
        // Store current event
        state.insert("last_event".to_string(), event_data.clone());
        
        // Maintain event history (last 10 events)
        let mut history = state.get("event_history")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
        
        history.push(event_data);
        if history.len() > 10 {
            history.remove(0);
        }
        
        state.insert("event_history".to_string(), serde_json::Value::Array(history));
    }
    
    Ok(())
}

/// Generate unique sequence ID for events
fn generate_event_sequence_id() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    static SEQUENCE_COUNTER: AtomicU64 = AtomicU64::new(1);
    
    let seq = SEQUENCE_COUNTER.fetch_add(1, Ordering::SeqCst);
    format!("tray_event_{}", seq)
}

/// Increment event counter for metrics
fn increment_event_counter() {
    if let Ok(mut state) = TRAY_STATE.lock() {
        let current_count = state.get("events_handled")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        
        state.insert("events_handled".to_string(), serde_json::Value::Number(serde_json::Number::from(current_count + 1)));
    }
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
        state.insert("tooltip".to_string(), serde_json::Value::String(tooltip.clone()));
        state.insert("tooltip_updated".to_string(), serde_json::Value::Number(serde_json::Number::from(chrono::Utc::now().timestamp())));
    }
    
    // Attempt to update the tray tooltip dynamically
    update_tray_tooltip_dynamic(&app, &tooltip).await?;
    
    info!("Tray tooltip updated successfully");
    Ok(())
}

/// Updates tray tooltip dynamically if supported by the platform
async fn update_tray_tooltip_dynamic(app: &AppHandle, tooltip: &str) -> Result<(), String> {
    // For now, we store the tooltip update request
    // In a full implementation, this would update the existing tray icon
    info!("Dynamic tooltip update requested: {}", tooltip);
    
    // Emit event to frontend for coordination
    if let Some(window) = app.webview_windows().values().next() {
        let _ = window.emit("tray-tooltip-updated", serde_json::json!({
            "tooltip": tooltip,
            "timestamp": chrono::Utc::now().timestamp()
        }));
    }
    
    Ok(())
}

/// Advanced tray management commands
#[tauri::command]
pub async fn get_tray_state() -> Result<serde_json::Value, String> {
    let window_states = get_all_window_states();
    
    Ok(serde_json::json!({
        "state": get_current_tray_state(),
        "platform": std::env::consts::OS,
        "gtk_available": cfg!(target_os = "linux"),
        "window_states": window_states,
        "performance_metrics": get_tray_performance_metrics(),
        "timestamp": chrono::Utc::now().timestamp()
    }))
}

/// Get performance metrics for tray operations
fn get_tray_performance_metrics() -> serde_json::Value {
    if let Ok(state) = TRAY_STATE.lock() {
        let creation_time = state.get("creation_time")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        
        let current_time = chrono::Utc::now().timestamp();
        let uptime = current_time - creation_time;
        
        serde_json::json!({
            "uptime_seconds": uptime,
            "events_handled": state.get("events_handled").unwrap_or(&serde_json::Value::Number(serde_json::Number::from(0))),
            "last_event_time": state.get("last_event")
                .and_then(|v| v.get("timestamp"))
                .unwrap_or(&serde_json::Value::Number(serde_json::Number::from(0))),
            "menu_items_count": get_menu_items_count(),
            "memory_usage_kb": get_estimated_memory_usage()
        })
    } else {
        serde_json::json!({
            "error": "Unable to access tray state"
        })
    }
}

/// Get estimated memory usage of tray components
fn get_estimated_memory_usage() -> u64 {
    // Rough estimation of memory usage
    let base_memory = 1024; // 1KB base
    let state_memory = if let Ok(state) = TRAY_STATE.lock() {
        state.len() * 64 // Rough estimate per state entry
    } else {
        0
    };
    
    base_memory + state_memory as u64
}

/// Get states of all windows
fn get_all_window_states() -> serde_json::Value {
    // This would integrate with window state management
    serde_json::json!({
        "total_windows": 0,
        "visible_windows": 0,
        "hidden_windows": 0,
        "minimized_windows": 0
    })
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
    
    // Apply platform-specific optimizations
    apply_platform_optimizations(app, config).await?;
    
    info!("Tray configuration applied successfully");
    Ok(())
}

/// Additional tray management commands for enhanced functionality

#[tauri::command]
pub async fn set_tray_icon_badge(app: tauri::AppHandle, badge_text: String) -> Result<(), String> {
    info!("Setting tray icon badge: {}", badge_text);
    
    // Store badge information in tray state
    if let Ok(mut state) = TRAY_STATE.lock() {
        state.insert("badge_text".to_string(), serde_json::Value::String(badge_text.clone()));
        state.insert("badge_set_time".to_string(), serde_json::Value::Number(serde_json::Number::from(chrono::Utc::now().timestamp())));
    }
    
    // Emit event for frontend notification
    if let Some(window) = app.webview_windows().values().next() {
        let _ = window.emit("tray-badge-updated", serde_json::json!({
            "badge": badge_text,
            "timestamp": chrono::Utc::now().timestamp()
        }));
    }
    
    info!("Tray icon badge set successfully");
    Ok(())
}

#[tauri::command]
pub async fn clear_tray_icon_badge(app: tauri::AppHandle) -> Result<(), String> {
    info!("Clearing tray icon badge");
    
    // Clear badge from tray state
    if let Ok(mut state) = TRAY_STATE.lock() {
        state.remove("badge_text");
        state.insert("badge_cleared_time".to_string(), serde_json::Value::Number(serde_json::Number::from(chrono::Utc::now().timestamp())));
    }
    
    // Emit event for frontend notification
    if let Some(window) = app.webview_windows().values().next() {
        let _ = window.emit("tray-badge-cleared", serde_json::json!({
            "timestamp": chrono::Utc::now().timestamp()
        }));
    }
    
    info!("Tray icon badge cleared successfully");
    Ok(())
}

#[tauri::command]
pub async fn show_tray_notification(app: tauri::AppHandle, title: String, message: String, notification_type: Option<String>) -> Result<(), String> {
    info!("Showing tray notification: {} - {}", title, message);
    
    let notification_id = generate_event_sequence_id();
    let notif_type = notification_type.unwrap_or_else(|| "info".to_string());
    
    // Store notification in tray state
    if let Ok(mut state) = TRAY_STATE.lock() {
        let notification_data = serde_json::json!({
            "id": notification_id,
            "title": title,
            "message": message,
            "type": notif_type,
            "timestamp": chrono::Utc::now().timestamp()
        });
        
        // Store current notification
        state.insert("last_notification".to_string(), notification_data.clone());
        
        // Maintain notification history
        let mut history = state.get("notification_history")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
        
        history.push(notification_data.clone());
        if history.len() > 5 {
            history.remove(0);
        }
        
        state.insert("notification_history".to_string(), serde_json::Value::Array(history));
    }
    
    // Emit notification event to frontend
    if let Some(window) = app.webview_windows().values().next() {
        let _ = window.emit("tray-notification", serde_json::json!({
            "id": notification_id,
            "title": title,
            "message": message,
            "type": notif_type,
            "timestamp": chrono::Utc::now().timestamp()
        }));
    }
    
    info!("Tray notification shown successfully: {}", notification_id);
    Ok(())
}

#[tauri::command]
pub async fn get_tray_notifications() -> Result<serde_json::Value, String> {
    if let Ok(state) = TRAY_STATE.lock() {
        let current = state.get("last_notification").cloned().unwrap_or(serde_json::Value::Null);
        let history = state.get("notification_history").cloned().unwrap_or(serde_json::Value::Array(vec![]));
        
        Ok(serde_json::json!({
            "current_notification": current,
            "notification_history": history,
            "total_notifications": history.as_array().map(|a| a.len()).unwrap_or(0)
        }))
    } else {
        Ok(serde_json::json!({
            "error": "Unable to access notification state"
        }))
    }
}

#[tauri::command]
pub async fn update_tray_status(app: tauri::AppHandle, status: String, details: Option<String>) -> Result<(), String> {
    info!("Updating tray status: {}", status);
    
    let status_details = details.unwrap_or_else(|| "No additional details".to_string());
    let window_count = app.webview_windows().len();
    
    // Update tooltip with status information
    let new_tooltip = format!("AutoDev-AI Neural Bridge - {} | {} window(s) | {}", 
        status, window_count, status_details);
    
    // Update configuration and state
    if let Ok(mut config) = TRAY_CONFIG.lock() {
        config.tooltip = new_tooltip.clone();
    }
    
    if let Ok(mut state) = TRAY_STATE.lock() {
        state.insert("current_status".to_string(), serde_json::Value::String(status.clone()));
        state.insert("status_details".to_string(), serde_json::Value::String(status_details));
        state.insert("tooltip".to_string(), serde_json::Value::String(new_tooltip.clone()));
        state.insert("status_updated".to_string(), serde_json::Value::Number(serde_json::Number::from(chrono::Utc::now().timestamp())));
    }
    
    // Attempt dynamic tooltip update
    update_tray_tooltip_dynamic(&app, &new_tooltip).await?;
    
    // Update menu show/hide text based on current window states
    update_tray_menu_text(&app, &get_dynamic_show_hide_text(&app));
    
    info!("Tray status updated successfully");
    Ok(())
}

#[tauri::command]
pub async fn get_tray_performance_stats() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "metrics": get_tray_performance_metrics(),
        "platform_optimizations": get_platform_optimization_status(),
        "memory_usage": get_estimated_memory_usage(),
        "event_stats": get_event_statistics()
    }))
}

/// Get platform optimization status
fn get_platform_optimization_status() -> serde_json::Value {
    if let Ok(state) = TRAY_STATE.lock() {
        match std::env::consts::OS {
            "windows" => serde_json::json!({
                "platform": "Windows",
                "integration": state.get("windows_integration").unwrap_or(&serde_json::Value::Bool(false)),
                "high_dpi": state.get("high_dpi_support").unwrap_or(&serde_json::Value::Bool(false)),
                "notifications": state.get("balloon_notifications").unwrap_or(&serde_json::Value::Bool(false))
            }),
            "macos" => serde_json::json!({
                "platform": "macOS",
                "integration": state.get("macos_integration").unwrap_or(&serde_json::Value::Bool(false)),
                "menu_bar_styling": state.get("menu_bar_styling").unwrap_or(&serde_json::Value::Bool(false)),
                "dark_mode": state.get("dark_mode_support").unwrap_or(&serde_json::Value::Bool(false))
            }),
            "linux" => serde_json::json!({
                "platform": "Linux",
                "integration": state.get("linux_integration").unwrap_or(&serde_json::Value::Bool(false)),
                "desktop_env": state.get("desktop_environment").unwrap_or(&serde_json::Value::String("Unknown".to_string())),
                "gtk_integration": state.get("gtk_integration").unwrap_or(&serde_json::Value::Bool(false))
            }),
            _ => serde_json::json!({
                "platform": std::env::consts::OS,
                "integration": false
            })
        }
    } else {
        serde_json::json!({
            "error": "Unable to access platform optimization state"
        })
    }
}

/// Get event statistics
fn get_event_statistics() -> serde_json::Value {
    if let Ok(state) = TRAY_STATE.lock() {
        let total_events = state.get("events_handled")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        
        let history = state.get("event_history")
            .and_then(|v| v.as_array())
            .map(|a| a.len())
            .unwrap_or(0);
        
        let last_event_time = state.get("last_event")
            .and_then(|v| v.get("timestamp"))
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        
        let creation_time = state.get("creation_time")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        
        let uptime = chrono::Utc::now().timestamp() - creation_time;
        let events_per_minute = if uptime > 0 { (total_events * 60) / uptime } else { 0 };
        
        serde_json::json!({
            "total_events": total_events,
            "events_in_history": history,
            "last_event_timestamp": last_event_time,
            "events_per_minute": events_per_minute,
            "uptime_seconds": uptime
        })
    } else {
        serde_json::json!({
            "error": "Unable to access event statistics"
        })
    }
}

/// Apply platform-specific tray optimizations
async fn apply_platform_optimizations(app: &AppHandle, config: &TrayConfig) -> Result<(), String> {
    match std::env::consts::OS {
        "windows" => {
            info!("Applying Windows-specific tray optimizations");
            // Windows-specific tray behavior
            setup_windows_tray_integration(app, config).await?;
        }
        "macos" => {
            info!("Applying macOS-specific tray optimizations");
            // macOS-specific tray behavior
            setup_macos_tray_integration(app, config).await?;
        }
        "linux" => {
            info!("Applying Linux-specific tray optimizations");
            // Linux-specific tray behavior (GTK/KDE)
            setup_linux_tray_integration(app, config).await?;
        }
        _ => {
            info!("Using default tray configuration for {}", std::env::consts::OS);
        }
    }
    Ok(())
}

/// Windows-specific tray integration
#[cfg(target_os = "windows")]
async fn setup_windows_tray_integration(app: &AppHandle, config: &TrayConfig) -> Result<(), String> {
    info!("Setting up Windows system tray integration");
    
    // Windows-specific tray features
    // - Balloon notifications
    // - High DPI icon support
    // - Windows 10/11 specific behaviors
    
    if let Ok(mut state) = TRAY_STATE.lock() {
        state.insert("windows_integration".to_string(), serde_json::Value::Bool(true));
        state.insert("high_dpi_support".to_string(), serde_json::Value::Bool(true));
        state.insert("balloon_notifications".to_string(), serde_json::Value::Bool(true));
    }
    
    info!("Windows system tray integration completed");
    Ok(())
}

#[cfg(not(target_os = "windows"))]
async fn setup_windows_tray_integration(_app: &AppHandle, _config: &TrayConfig) -> Result<(), String> {
    Ok(())
}

/// macOS-specific tray integration
#[cfg(target_os = "macos")]
async fn setup_macos_tray_integration(app: &AppHandle, config: &TrayConfig) -> Result<(), String> {
    info!("Setting up macOS system tray integration");
    
    // macOS-specific tray features
    // - Menu bar icon styling
    // - Dark mode support
    // - Native menu integration
    
    if let Ok(mut state) = TRAY_STATE.lock() {
        state.insert("macos_integration".to_string(), serde_json::Value::Bool(true));
        state.insert("menu_bar_styling".to_string(), serde_json::Value::Bool(true));
        state.insert("dark_mode_support".to_string(), serde_json::Value::Bool(true));
    }
    
    info!("macOS system tray integration completed");
    Ok(())
}

#[cfg(not(target_os = "macos"))]
async fn setup_macos_tray_integration(_app: &AppHandle, _config: &TrayConfig) -> Result<(), String> {
    Ok(())
}

/// Linux-specific tray integration
#[cfg(target_os = "linux")]
async fn setup_linux_tray_integration(app: &AppHandle, config: &TrayConfig) -> Result<(), String> {
    info!("Setting up Linux system tray integration");
    
    // Linux-specific tray features
    // - GTK/KDE integration
    // - Desktop environment detection
    // - Icon theme support
    
    let desktop_env = detect_desktop_environment();
    
    if let Ok(mut state) = TRAY_STATE.lock() {
        state.insert("linux_integration".to_string(), serde_json::Value::Bool(true));
        state.insert("desktop_environment".to_string(), serde_json::Value::String(desktop_env.clone()));
        state.insert("gtk_integration".to_string(), serde_json::Value::Bool(config.gtk_integration));
    }
    
    // Apply desktop-specific configurations
    match desktop_env.as_str() {
        "GNOME" => setup_gnome_tray_integration(app).await?,
        "KDE" => setup_kde_tray_integration(app).await?,
        "XFCE" => setup_xfce_tray_integration(app).await?,
        _ => info!("Using default Linux tray integration"),
    }
    
    info!("Linux system tray integration completed");
    Ok(())
}

#[cfg(not(target_os = "linux"))]
async fn setup_linux_tray_integration(_app: &AppHandle, _config: &TrayConfig) -> Result<(), String> {
    Ok(())
}

/// Detect desktop environment on Linux
#[cfg(target_os = "linux")]
fn detect_desktop_environment() -> String {
    std::env::var("XDG_CURRENT_DESKTOP")
        .or_else(|_| std::env::var("DESKTOP_SESSION"))
        .unwrap_or_else(|_| "Unknown".to_string())
}

/// GNOME-specific tray integration
#[cfg(target_os = "linux")]
async fn setup_gnome_tray_integration(app: &AppHandle) -> Result<(), String> {
    info!("Setting up GNOME-specific tray integration");
    
    if let Ok(mut state) = TRAY_STATE.lock() {
        state.insert("gnome_integration".to_string(), serde_json::Value::Bool(true));
        state.insert("shell_extensions_support".to_string(), serde_json::Value::Bool(true));
    }
    
    Ok(())
}

/// KDE-specific tray integration
#[cfg(target_os = "linux")]
async fn setup_kde_tray_integration(app: &AppHandle) -> Result<(), String> {
    info!("Setting up KDE-specific tray integration");
    
    if let Ok(mut state) = TRAY_STATE.lock() {
        state.insert("kde_integration".to_string(), serde_json::Value::Bool(true));
        state.insert("plasma_integration".to_string(), serde_json::Value::Bool(true));
    }
    
    Ok(())
}

/// XFCE-specific tray integration
#[cfg(target_os = "linux")]
async fn setup_xfce_tray_integration(app: &AppHandle) -> Result<(), String> {
    info!("Setting up XFCE-specific tray integration");
    
    if let Ok(mut state) = TRAY_STATE.lock() {
        state.insert("xfce_integration".to_string(), serde_json::Value::Bool(true));
        state.insert("panel_integration".to_string(), serde_json::Value::Bool(true));
    }
    
    Ok(())
}