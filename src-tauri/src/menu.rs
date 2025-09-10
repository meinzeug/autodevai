use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Manager, Wry
};
use tracing::{info, warn};

/// Creates the application menu with File menu and native items
pub fn create_app_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    info!("Creating application menu");
    
    // File menu
    let file_menu = create_file_menu(app)?;
    
    // Edit menu with native items
    let edit_menu = create_edit_menu(app)?;
    
    // View menu for development
    let view_menu = create_view_menu(app)?;
    
    // Help menu
    let help_menu = create_help_menu(app)?;
    
    // Main menu
    let menu = Menu::with_items(app, &[
        &file_menu,
        &edit_menu,
        &view_menu,
        &help_menu,
    ])?;
    
    info!("Application menu created successfully");
    Ok(menu)
}

/// Creates the File menu with Quit and Close options
fn create_file_menu(app: &AppHandle) -> tauri::Result<Submenu<Wry>> {
    info!("Creating File menu");
    
    let new_window = MenuItem::with_id(app, "new_window", "New Window", true, Some("CmdOrCtrl+N"))?;
    let close_window = MenuItem::with_id(app, "close_window", "Close Window", true, Some("CmdOrCtrl+W"))?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, Some("CmdOrCtrl+Q"))?;
    
    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &new_window,
            &separator,
            &close_window,
            &separator,
            &quit,
        ],
    )?;
    
    Ok(file_menu)
}

/// Creates the Edit menu with native copy/paste/select items
fn create_edit_menu(app: &AppHandle) -> tauri::Result<Submenu<Wry>> {
    info!("Creating Edit menu with native items");
    
    let copy = PredefinedMenuItem::copy(app, Some("Copy"))?;
    let paste = PredefinedMenuItem::paste(app, Some("Paste"))?;
    let cut = PredefinedMenuItem::cut(app, Some("Cut"))?;
    let select_all = PredefinedMenuItem::select_all(app, Some("Select All"))?;
    let separator = PredefinedMenuItem::separator(app)?;
    let undo = PredefinedMenuItem::undo(app, Some("Undo"))?;
    let redo = PredefinedMenuItem::redo(app, Some("Redo"))?;
    
    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &undo,
            &redo,
            &separator,
            &cut,
            &copy,
            &paste,
            &separator,
            &select_all,
        ],
    )?;
    
    Ok(edit_menu)
}

/// Creates the View menu with development options
fn create_view_menu(app: &AppHandle) -> tauri::Result<Submenu<Wry>> {
    info!("Creating View menu");
    
    let zoom_in = MenuItem::with_id(app, "zoom_in", "Zoom In", true, Some("CmdOrCtrl+Plus"))?;
    let zoom_out = MenuItem::with_id(app, "zoom_out", "Zoom Out", true, Some("CmdOrCtrl+-"))?;
    let zoom_reset = MenuItem::with_id(app, "zoom_reset", "Reset Zoom", true, Some("CmdOrCtrl+0"))?;
    let _separator = PredefinedMenuItem::separator(app)?;
    let fullscreen = MenuItem::with_id(app, "fullscreen", "Toggle Fullscreen", true, Some("F11"))?;
    
    // Create submenu without problematic separator for now
    let view_submenu = Submenu::with_items(
        app,
        "View",
        true,
        &[
            &zoom_in,
            &zoom_out, 
            &zoom_reset,
            &fullscreen,
        ],
    )?;
    
    // Add developer tools option in debug builds  
    let view_menu = if cfg!(debug_assertions) {
        let devtools = MenuItem::with_id(app, "toggle_devtools", "Developer Tools", true, Some("F12"))?;
        // Create an extended view menu with dev tools
        Submenu::with_items(
            app,
            "View",
            true,
            &[
                &zoom_in,
                &zoom_out, 
                &zoom_reset,
                &fullscreen,
                &devtools,
            ],
        )?
    } else {
        view_submenu
    };
    
    Ok(view_menu)
}

/// Creates the Help menu
fn create_help_menu(app: &AppHandle) -> tauri::Result<Submenu<Wry>> {
    info!("Creating Help menu");
    
    let about = MenuItem::with_id(app, "about", "About", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let documentation = MenuItem::with_id(app, "documentation", "Documentation", true, None::<&str>)?;
    let github = MenuItem::with_id(app, "github", "GitHub Repository", true, None::<&str>)?;
    
    let help_menu = Submenu::with_items(
        app,
        "Help",
        true,
        &[
            &about,
            &separator,
            &documentation,
            &github,
        ],
    )?;
    
    Ok(help_menu)
}

/// Handles menu events
pub fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    let window = app.webview_windows().values().next().cloned();
    
    match event.id().as_ref() {
        "quit" => {
            info!("Quit menu item selected");
            app.exit(0);
        }
        "close_window" => {
            info!("Close window menu item selected");
            if let Some(ref window) = window {
                let _ = window.close();
            }
        }
        "new_window" => {
            info!("New window menu item selected");
            create_new_window(app);
        }
        "zoom_in" => {
            info!("Zoom in menu item selected");
            if let Some(ref window) = window {
                let _ = window.eval("document.body.style.zoom = (parseFloat(document.body.style.zoom || 1) * 1.1).toString()");
            }
        }
        "zoom_out" => {
            info!("Zoom out menu item selected");
            if let Some(ref window) = window {
                let _ = window.eval("document.body.style.zoom = (parseFloat(document.body.style.zoom || 1) / 1.1).toString()");
            }
        }
        "zoom_reset" => {
            info!("Reset zoom menu item selected");
            if let Some(ref window) = window {
                let _ = window.eval("document.body.style.zoom = '1'");
            }
        }
        "fullscreen" => {
            info!("Toggle fullscreen menu item selected");
            if let Some(ref window) = window {
                match window.is_fullscreen() {
                    Ok(is_fullscreen) => {
                        let _ = window.set_fullscreen(!is_fullscreen);
                    }
                    Err(e) => warn!("Failed to check fullscreen state: {}", e),
                }
            }
        }
        "toggle_devtools" => {
            info!("Toggle DevTools menu item selected");
            if cfg!(debug_assertions) {
                if let Some(ref window) = window {
                    if window.is_devtools_open() {
                        window.close_devtools();
                    } else {
                        window.open_devtools();
                    }
                }
            }
        }
        "about" => {
            info!("About menu item selected");
            show_about_dialog(app);
        }
        "documentation" => {
            info!("Documentation menu item selected");
            let _ = open_url("https://github.com/ruvnet/autodevai");
        }
        "github" => {
            info!("GitHub repository menu item selected");
            let _ = open_url("https://github.com/ruvnet/autodevai");
        }
        _ => {
            info!("Unhandled menu event: {:?}", event.id());
        }
    }
}

/// Creates a new application window
fn create_new_window(app: &AppHandle) {
    use crate::dev_window::create_dev_window;
    use tauri::WebviewUrl;
    
    let window_count = app.webview_windows().len();
    let label = format!("main_{}", window_count + 1);
    
    match create_dev_window(app, &label, WebviewUrl::default()) {
        Ok(_) => info!("New window '{}' created successfully", label),
        Err(e) => warn!("Failed to create new window: {}", e),
    }
}

/// Shows the about dialog
fn show_about_dialog(app: &AppHandle) {
    let version = env!("CARGO_PKG_VERSION");
    let message = format!(
        "AutoDev-AI Neural Bridge Platform\\n\\nVersion: {}\\nPlatform: {}\\nArchitecture: {}\\n\\nA powerful orchestration platform for Claude-Flow and OpenAI Codex.",
        version,
        std::env::consts::OS,
        std::env::consts::ARCH
    );
    
    info!("About dialog: {}", message);
    
    if let Some(window) = app.webview_windows().values().next() {
        let js_code = format!(
            r#"alert("{}"); console.log("About dialog shown");"#,
            message
        );
        let _ = window.eval(&js_code);
    }
}

/// Opens a URL in the default browser
fn open_url(url: &str) -> Result<(), String> {
    info!("Opening URL: {}", url);
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", url])
            .output()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(url)
            .output()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(url)
            .output()
            .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

/// Menu-related commands
#[tauri::command]
pub async fn toggle_menu_visibility(_app: AppHandle, _visible: bool) -> Result<(), String> {
    info!("Menu visibility toggle requested");
    Ok(())
}

#[tauri::command]
pub async fn get_menu_info(_app: AppHandle) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "has_menu": true,
        "platform": std::env::consts::OS,
        "menu_items": [
            "File", "Edit", "View", "Help"
        ],
        "native_items_enabled": true,
        "devtools_available": cfg!(debug_assertions)
    }))
}