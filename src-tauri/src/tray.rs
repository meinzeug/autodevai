use tauri::{
    tray::{TrayIcon, TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState},
    menu::{Menu, MenuItem, PredefinedMenuItem},
    AppHandle, Manager, WebviewWindow, Wry, Emitter
};
use tracing::{info, warn, error};

/// System tray configuration
pub struct TrayConfig {
    pub show_on_startup: bool,
    pub minimize_to_tray: bool,
    pub close_to_tray: bool,
}

impl Default for TrayConfig {
    fn default() -> Self {
        Self {
            show_on_startup: true,
            minimize_to_tray: true,
            close_to_tray: false,
        }
    }
}

/// Creates and configures the system tray
pub fn create_system_tray(app: &AppHandle) -> tauri::Result<TrayIcon> {
    info!("Creating system tray");
    
    let tray_menu = create_tray_menu(app)?;
    
    let tray = TrayIconBuilder::new()
        .title("AutoDev-AI Neural Bridge Platform")
        .tooltip("AutoDev-AI Neural Bridge Platform")
        .menu(&tray_menu)
        .on_tray_icon_event(|tray, event| handle_tray_event(tray.app_handle(), event))
        .build(app)?;
    
    info!("System tray created successfully");
    Ok(tray)
}

/// Creates the tray context menu
fn create_tray_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    info!("Creating tray menu");
    
    let show_hide = MenuItem::with_id(app, "tray_show_hide", "Show", true, None::<&str>)?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let new_window = MenuItem::with_id(app, "tray_new_window", "New Window", true, None::<&str>)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let about = MenuItem::with_id(app, "tray_about", "About", true, None::<&str>)?;
    let preferences = MenuItem::with_id(app, "tray_preferences", "Preferences", true, None::<&str>)?;
    let separator3 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "tray_quit", "Quit", true, None::<&str>)?;
    
    let tray_menu = Menu::with_items(app, &[
        &show_hide,
        &separator1,
        &new_window,
        &separator2,
        &about,
        &preferences,
        &separator3,
        &quit,
    ])?;
    
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
            toggle_main_window_visibility(app);
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
            show_main_window(app);
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

/// Handles tray menu item events (placeholder - would need menu integration)
fn handle_tray_menu_event(app: &AppHandle, menu_id: &str) {
    match menu_id {
        "tray_show_hide" => {
            info!("Tray Show/Hide clicked");
            toggle_main_window_visibility(app);
        }
        "tray_new_window" => {
            info!("Tray New Window clicked");
            create_new_window_from_tray(app);
        }
        "tray_about" => {
            info!("Tray About clicked");
            show_about_from_tray(app);
        }
        "tray_preferences" => {
            info!("Tray Preferences clicked");
            show_preferences_from_tray(app);
        }
        "tray_quit" => {
            info!("Tray Quit clicked");
            quit_application(app);
        }
        _ => {
            info!("Unhandled tray menu event: {}", menu_id);
        }
    }
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

/// Updates the tray menu show/hide text
fn update_tray_menu_text(app: &AppHandle, text: &str) {
    info!("Tray menu text should be updated to: {}", text);
    // Note: Dynamic menu text updating may require rebuilding the menu
    // This is a placeholder for potential future implementation
}

/// Creates a new window from tray
fn create_new_window_from_tray(app: &AppHandle) {
    use crate::dev_window::create_dev_window;
    use tauri::WebviewUrl;
    
    let window_count = app.webview_windows().len();
    let label = if window_count == 0 { "main".to_string() } else { format!("window_{}", window_count) };
    
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

/// Shows about dialog from tray
fn show_about_from_tray(app: &AppHandle) {
    let version = env!("CARGO_PKG_VERSION");
    let message = format!(
        "AutoDev-AI Neural Bridge Platform v{}\\n\\nRunning from system tray.\\nRight-click the tray icon for options.",
        version
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
        let _ = window.emit("show-preferences", serde_json::json!({"source": "tray"}));
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
}

/// Handles window close events for tray behavior
pub fn handle_window_close_to_tray(app: &AppHandle, window_label: &str) -> bool {
    let config = TrayConfig::default();
    
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
    let config = TrayConfig::default();
    
    Ok(serde_json::json!({
        "show_on_startup": config.show_on_startup,
        "minimize_to_tray": config.minimize_to_tray,
        "close_to_tray": config.close_to_tray,
        "platform": std::env::consts::OS,
        "tray_available": true
    }))
}

#[tauri::command]
pub async fn update_tray_tooltip(_app: tauri::AppHandle, tooltip: String) -> Result<(), String> {
    info!("Updating tray tooltip to: {}", tooltip);
    // Note: Dynamic tooltip updating may require tray recreation
    // This is a placeholder for potential future implementation
    Ok(())
}