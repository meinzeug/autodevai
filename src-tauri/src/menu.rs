use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Manager, Wry,
};
use tracing::{debug, info, warn};
use std::collections::HashMap;

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
    let menu = Menu::with_items(app, &[&file_menu, &edit_menu, &view_menu, &help_menu])?;

    info!("Application menu created successfully");
    Ok(menu)
}

/// Creates the File menu with comprehensive file operations
fn create_file_menu(app: &AppHandle) -> tauri::Result<Submenu<Wry>> {
    info!("Creating File menu");

    let new_file = MenuItem::with_id(app, "new_file", "New", true, Some("CmdOrCtrl+N"))?;
    let open_file = MenuItem::with_id(app, "open_file", "Open...", true, Some("CmdOrCtrl+O"))?;
    let save_file = MenuItem::with_id(app, "save_file", "Save", true, Some("CmdOrCtrl+S"))?;
    let save_as = MenuItem::with_id(app, "save_as", "Save As...", true, Some("CmdOrCtrl+Shift+S"))?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    
    let new_window = MenuItem::with_id(app, "new_window", "New Window", true, Some("CmdOrCtrl+Shift+N"))?;
    let close_window = MenuItem::with_id(
        app,
        "close_window",
        "Close Window",
        true,
        Some("CmdOrCtrl+W"),
    )?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    
    let settings = MenuItem::with_id(app, "settings", "Preferences...", true, Some("CmdOrCtrl+,"))?;
    let sep3 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, Some("CmdOrCtrl+Q"))?;

    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &new_file,
            &open_file,
            &sep1,
            &save_file,
            &save_as,
            &sep2,
            &new_window,
            &close_window,
            &sep3,
            &settings,
            &sep3,
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

/// Creates the View menu with comprehensive view and development options
fn create_view_menu(app: &AppHandle) -> tauri::Result<Submenu<Wry>> {
    info!("Creating View menu");

    let reload = MenuItem::with_id(app, "reload", "Reload", true, Some("CmdOrCtrl+R"))?;
    let force_reload = MenuItem::with_id(app, "force_reload", "Force Reload", true, Some("CmdOrCtrl+Shift+R"))?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    
    let zoom_in = MenuItem::with_id(app, "zoom_in", "Zoom In", true, Some("CmdOrCtrl+Plus"))?;
    let zoom_out = MenuItem::with_id(app, "zoom_out", "Zoom Out", true, Some("CmdOrCtrl+-"))?;
    let zoom_reset = MenuItem::with_id(app, "zoom_reset", "Actual Size", true, Some("CmdOrCtrl+0"))?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    
    let fullscreen = MenuItem::with_id(app, "fullscreen", "Enter Full Screen", true, Some("F11"))?;
    let minimize = MenuItem::with_id(app, "minimize", "Minimize", true, Some("CmdOrCtrl+M"))?;
    let sep3 = PredefinedMenuItem::separator(app)?;

    let mut menu_items = vec![
        &reload,
        &force_reload,
        &sep1,
        &zoom_in,
        &zoom_out,
        &zoom_reset,
        &sep2,
        &fullscreen,
        &minimize,
    ];

    // Add developer tools option in debug builds
    if cfg!(debug_assertions) {
        let devtools = MenuItem::with_id(app, "toggle_devtools", "Toggle Developer Tools", true, Some("F12"))?;
        let console = MenuItem::with_id(app, "console", "JavaScript Console", true, Some("CmdOrCtrl+Alt+I"))?;
        menu_items.extend_from_slice(&[&sep3, &devtools, &console]);
    }

    let view_menu = Submenu::with_items(app, "View", true, &menu_items)?;

    Ok(view_menu)
}

/// Creates the Help menu with comprehensive help options
fn create_help_menu(app: &AppHandle) -> tauri::Result<Submenu<Wry>> {
    info!("Creating Help menu");

    let documentation = MenuItem::with_id(app, "documentation", "User Guide", true, Some("F1"))?;
    let api_docs = MenuItem::with_id(app, "api_docs", "API Documentation", true, None::<&str>)?;
    let keyboard_shortcuts = MenuItem::with_id(app, "keyboard_shortcuts", "Keyboard Shortcuts", true, Some("CmdOrCtrl+/"))?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    
    let github = MenuItem::with_id(app, "github", "GitHub Repository", true, None::<&str>)?;
    let report_issue = MenuItem::with_id(app, "report_issue", "Report Issue", true, None::<&str>)?;
    let check_updates = MenuItem::with_id(app, "check_updates", "Check for Updates...", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    
    let about = MenuItem::with_id(app, "about", "About AutoDev-AI", true, None::<&str>)?;

    let help_menu = Submenu::with_items(
        app,
        "Help",
        true,
        &[
            &documentation,
            &api_docs,
            &keyboard_shortcuts,
            &sep1,
            &github,
            &report_issue,
            &check_updates,
            &sep2,
            &about,
        ],
    )?;

    Ok(help_menu)
}

/// Handles menu events with comprehensive actions
pub fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    let window = app.webview_windows().values().next().cloned();
    let menu_id = event.id().as_ref();
    
    debug!("Menu event triggered: {}", menu_id);

    match menu_id {
        // File menu actions
        "new_file" => {
            info!("New file menu item selected");
            handle_new_file(app, window.as_ref());
        }
        "open_file" => {
            info!("Open file menu item selected");
            handle_open_file(app, window.as_ref());
        }
        "save_file" => {
            info!("Save file menu item selected");
            handle_save_file(app, window.as_ref());
        }
        "save_as" => {
            info!("Save as menu item selected");
            handle_save_as(app, window.as_ref());
        }
        "new_window" => {
            info!("New window menu item selected");
            create_new_window(app);
        }
        "close_window" => {
            info!("Close window menu item selected");
            if let Some(ref window) = window {
                let _ = window.close();
            }
        }
        "settings" => {
            info!("Settings menu item selected");
            show_preferences_dialog(app);
        }
        "quit" => {
            info!("Quit menu item selected");
            app.exit(0);
        }
        
        // View menu actions
        "reload" => {
            info!("Reload menu item selected");
            if let Some(ref window) = window {
                let _ = window.eval("window.location.reload()");
            }
        }
        "force_reload" => {
            info!("Force reload menu item selected");
            if let Some(ref window) = window {
                let _ = window.eval("window.location.reload(true)");
            }
        }
        "zoom_in" => {
            info!("Zoom in menu item selected");
            handle_zoom_change(window.as_ref(), 1.1);
        }
        "zoom_out" => {
            info!("Zoom out menu item selected");
            handle_zoom_change(window.as_ref(), 0.9);
        }
        "zoom_reset" => {
            info!("Reset zoom menu item selected");
            if let Some(ref window) = window {
                let _ = window.eval("document.body.style.zoom = '1'; localStorage.setItem('zoom-level', '1');");
            }
        }
        "fullscreen" => {
            info!("Toggle fullscreen menu item selected");
            handle_fullscreen_toggle(window.as_ref());
        }
        "minimize" => {
            info!("Minimize menu item selected");
            if let Some(ref window) = window {
                let _ = window.minimize();
            }
        }
        "toggle_devtools" => {
            info!("Toggle DevTools menu item selected");
            handle_devtools_toggle(window.as_ref());
        }
        "console" => {
            info!("Console menu item selected");
            if cfg!(debug_assertions) {
                if let Some(ref window) = window {
                    window.open_devtools();
                    let _ = window.eval("console.log('Developer console opened via menu');");
                }
            }
        }
        
        // Help menu actions
        "documentation" => {
            info!("Documentation menu item selected");
            let _ = open_url("https://github.com/ruvnet/autodevai/blob/main/docs/USER_GUIDE.md");
        }
        "api_docs" => {
            info!("API documentation menu item selected");
            let _ = open_url("https://github.com/ruvnet/autodevai/blob/main/docs/API_COMMANDS.md");
        }
        "keyboard_shortcuts" => {
            info!("Keyboard shortcuts menu item selected");
            show_keyboard_shortcuts_dialog(app);
        }
        "github" => {
            info!("GitHub repository menu item selected");
            let _ = open_url("https://github.com/ruvnet/autodevai");
        }
        "report_issue" => {
            info!("Report issue menu item selected");
            let _ = open_url("https://github.com/ruvnet/autodevai/issues/new");
        }
        "check_updates" => {
            info!("Check for updates menu item selected");
            check_for_updates(app);
        }
        "about" => {
            info!("About menu item selected");
            show_about_dialog(app);
        }
        
        _ => {
            warn!("Unhandled menu event: {}", menu_id);
        }
    }
}

// Menu action helper functions

/// Handles new file creation
fn handle_new_file(_app: &AppHandle, window: Option<&tauri::WebviewWindow>) {
    if let Some(window) = window {
        let _ = window.emit("menu-new-file", ());
        let _ = window.eval("if (window.handleNewFile) { window.handleNewFile(); } else { console.log('New file action triggered'); }");
    }
}

/// Handles file opening
fn handle_open_file(_app: &AppHandle, window: Option<&tauri::WebviewWindow>) {
    if let Some(window) = window {
        let _ = window.emit("menu-open-file", ());
        let _ = window.eval("if (window.handleOpenFile) { window.handleOpenFile(); } else { console.log('Open file action triggered'); }");
    }
}

/// Handles file saving
fn handle_save_file(_app: &AppHandle, window: Option<&tauri::WebviewWindow>) {
    if let Some(window) = window {
        let _ = window.emit("menu-save-file", ());
        let _ = window.eval("if (window.handleSaveFile) { window.handleSaveFile(); } else { console.log('Save file action triggered'); }");
    }
}

/// Handles save as action
fn handle_save_as(_app: &AppHandle, window: Option<&tauri::WebviewWindow>) {
    if let Some(window) = window {
        let _ = window.emit("menu-save-as", ());
        let _ = window.eval("if (window.handleSaveAs) { window.handleSaveAs(); } else { console.log('Save as action triggered'); }");
    }
}

/// Handles zoom level changes
fn handle_zoom_change(window: Option<&tauri::WebviewWindow>, factor: f64) {
    if let Some(window) = window {
        let js_code = format!(
            "{{
                const currentZoom = parseFloat(localStorage.getItem('zoom-level') || '1');
                const newZoom = currentZoom * {};
                const clampedZoom = Math.max(0.25, Math.min(3.0, newZoom));
                document.body.style.zoom = clampedZoom.toString();
                localStorage.setItem('zoom-level', clampedZoom.toString());
                console.log('Zoom changed to:', clampedZoom);
            }}", factor
        );
        let _ = window.eval(&js_code);
    }
}

/// Handles fullscreen toggle
fn handle_fullscreen_toggle(window: Option<&tauri::WebviewWindow>) {
    if let Some(window) = window {
        match window.is_fullscreen() {
            Ok(is_fullscreen) => {
                let _ = window.set_fullscreen(!is_fullscreen);
                info!("Fullscreen toggled to: {}", !is_fullscreen);
            }
            Err(e) => warn!("Failed to check fullscreen state: {}", e),
        }
    }
}

/// Handles developer tools toggle
fn handle_devtools_toggle(window: Option<&tauri::WebviewWindow>) {
    if cfg!(debug_assertions) {
        if let Some(window) = window {
            if window.is_devtools_open() {
                window.close_devtools();
                info!("Developer tools closed");
            } else {
                window.open_devtools();
                info!("Developer tools opened");
            }
        }
    }
}

/// Shows preferences dialog
fn show_preferences_dialog(app: &AppHandle) {
    if let Some(window) = app.webview_windows().values().next() {
        let js_code = r#"
            if (window.showPreferences) {
                window.showPreferences();
            } else {
                alert('Preferences dialog would open here.\n\nThis feature will be implemented in a future version.');
            }
        "#;
        let _ = window.eval(js_code);
    }
}

/// Shows keyboard shortcuts dialog
fn show_keyboard_shortcuts_dialog(app: &AppHandle) {
    if let Some(window) = app.webview_windows().values().next() {
        let shortcuts_info = r#"
AutoDev-AI Keyboard Shortcuts:

File Menu:
• New File: Ctrl/Cmd + N
• Open File: Ctrl/Cmd + O
• Save File: Ctrl/Cmd + S
• Save As: Ctrl/Cmd + Shift + S
• New Window: Ctrl/Cmd + Shift + N
• Close Window: Ctrl/Cmd + W
• Preferences: Ctrl/Cmd + ,
• Quit: Ctrl/Cmd + Q

Edit Menu:
• Undo: Ctrl/Cmd + Z
• Redo: Ctrl/Cmd + Y (Windows) / Cmd + Shift + Z (Mac)
• Cut: Ctrl/Cmd + X
• Copy: Ctrl/Cmd + C
• Paste: Ctrl/Cmd + V
• Select All: Ctrl/Cmd + A

View Menu:
• Reload: Ctrl/Cmd + R
• Force Reload: Ctrl/Cmd + Shift + R
• Zoom In: Ctrl/Cmd + +
• Zoom Out: Ctrl/Cmd + -
• Actual Size: Ctrl/Cmd + 0
• Full Screen: F11
• Minimize: Ctrl/Cmd + M
• Developer Tools: F12 (Debug builds)
• Console: Ctrl/Cmd + Alt + I (Debug builds)

Help Menu:
• User Guide: F1
• Keyboard Shortcuts: Ctrl/Cmd + /
        "#;
        
        let js_code = format!(
            r#"alert("{}"); console.log("Keyboard shortcuts dialog shown");"#,
            shortcuts_info.replace('\n', "\\n")
        );
        let _ = window.eval(&js_code);
    }
}

/// Checks for application updates
fn check_for_updates(app: &AppHandle) {
    if let Some(window) = app.webview_windows().values().next() {
        let version = env!("CARGO_PKG_VERSION");
        let update_message = format!(
            "AutoDev-AI Update Check\\n\\nCurrent Version: {}\\n\\nChecking for updates...\\n\\nThis feature will be fully implemented in a future version.",
            version
        );
        
        let js_code = format!(
            r#"alert("{}"); console.log("Update check initiated");"#,
            update_message
        );
        let _ = window.eval(&js_code);
        
        info!("Update check requested for version {}", version);
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

/// Shows the enhanced about dialog
fn show_about_dialog(app: &AppHandle) {
    let version = env!("CARGO_PKG_VERSION");
    let build_date = option_env!("BUILD_DATE").unwrap_or("Unknown");
    let rust_version = option_env!("RUSTC_VERSION").unwrap_or("Unknown");
    
    let message = format!(
        "AutoDev-AI Neural Bridge Platform\\n\\n\
        Version: {}\\n\
        Platform: {}\\n\
        Architecture: {}\\n\
        Build Date: {}\\n\
        Rust Version: {}\\n\\n\
        A powerful orchestration platform for Claude-Flow and OpenAI Codex.\\n\\n\
        Features:\\n\
        • Native desktop application with Tauri\\n\
        • Advanced menu system with keyboard shortcuts\\n\
        • Cross-platform compatibility\\n\
        • Developer tools integration\\n\
        • Real-time application state management\\n\\n\
        © 2024 AutoDev-AI Project\\n\
        Licensed under MIT License",
        version,
        std::env::consts::OS,
        std::env::consts::ARCH,
        build_date,
        rust_version
    );

    info!("About dialog displayed for version {}", version);

    if let Some(window) = app.webview_windows().values().next() {
        let js_code = format!(
            r#"
            if (window.showCustomDialog) {{
                window.showCustomDialog('About AutoDev-AI', `{}`);
            }} else {{
                alert("{}");
            }}
            console.log("About dialog shown for AutoDev-AI v{}");
            "#,
            message,
            message,
            version
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
    let mut shortcuts = HashMap::new();
    
    // File menu shortcuts
    shortcuts.insert("new_file", "CmdOrCtrl+N");
    shortcuts.insert("open_file", "CmdOrCtrl+O");
    shortcuts.insert("save_file", "CmdOrCtrl+S");
    shortcuts.insert("save_as", "CmdOrCtrl+Shift+S");
    shortcuts.insert("new_window", "CmdOrCtrl+Shift+N");
    shortcuts.insert("close_window", "CmdOrCtrl+W");
    shortcuts.insert("settings", "CmdOrCtrl+,");
    shortcuts.insert("quit", "CmdOrCtrl+Q");
    
    // View menu shortcuts
    shortcuts.insert("reload", "CmdOrCtrl+R");
    shortcuts.insert("force_reload", "CmdOrCtrl+Shift+R");
    shortcuts.insert("zoom_in", "CmdOrCtrl+Plus");
    shortcuts.insert("zoom_out", "CmdOrCtrl+-");
    shortcuts.insert("zoom_reset", "CmdOrCtrl+0");
    shortcuts.insert("fullscreen", "F11");
    shortcuts.insert("minimize", "CmdOrCtrl+M");
    shortcuts.insert("toggle_devtools", "F12");
    shortcuts.insert("console", "CmdOrCtrl+Alt+I");
    
    // Help menu shortcuts
    shortcuts.insert("documentation", "F1");
    shortcuts.insert("keyboard_shortcuts", "CmdOrCtrl+/");

    Ok(serde_json::json!({
        "has_menu": true,
        "platform": std::env::consts::OS,
        "architecture": std::env::consts::ARCH,
        "version": env!("CARGO_PKG_VERSION"),
        "menu_structure": {
            "File": ["New", "Open...", "Save", "Save As...", "New Window", "Close Window", "Preferences...", "Quit"],
            "Edit": ["Undo", "Redo", "Cut", "Copy", "Paste", "Select All"],
            "View": ["Reload", "Force Reload", "Zoom In", "Zoom Out", "Actual Size", "Enter Full Screen", "Minimize", "Toggle Developer Tools", "JavaScript Console"],
            "Help": ["User Guide", "API Documentation", "Keyboard Shortcuts", "GitHub Repository", "Report Issue", "Check for Updates...", "About AutoDev-AI"]
        },
        "keyboard_shortcuts": shortcuts,
        "features": {
            "native_items_enabled": true,
            "devtools_available": cfg!(debug_assertions),
            "platform_specific_shortcuts": true,
            "zoom_support": true,
            "fullscreen_support": true,
            "window_management": true,
            "file_operations": true,
            "developer_tools": cfg!(debug_assertions)
        },
        "menu_count": 4
    }))
}

/// Command to trigger menu actions programmatically
#[tauri::command]
pub async fn trigger_menu_action(app: AppHandle, action_id: String) -> Result<(), String> {
    info!("Programmatically triggering menu action: {}", action_id);
    
    let window = app.webview_windows().values().next().cloned();
    
    // Handle the action directly without creating a mock event
    match action_id.as_str() {
        "new_file" => handle_new_file(&app, window.as_ref()),
        "open_file" => handle_open_file(&app, window.as_ref()),
        "save_file" => handle_save_file(&app, window.as_ref()),
        "save_as" => handle_save_as(&app, window.as_ref()),
        "new_window" => create_new_window(&app),
        "settings" => show_preferences_dialog(&app),
        "quit" => app.exit(0),
        "reload" => {
            if let Some(ref window) = window {
                let _ = window.eval("window.location.reload()");
            }
        }
        "zoom_in" => handle_zoom_change(window.as_ref(), 1.1),
        "zoom_out" => handle_zoom_change(window.as_ref(), 0.9),
        "zoom_reset" => {
            if let Some(ref window) = window {
                let _ = window.eval("document.body.style.zoom = '1'; localStorage.setItem('zoom-level', '1');");
            }
        }
        "fullscreen" => handle_fullscreen_toggle(window.as_ref()),
        "minimize" => {
            if let Some(ref window) = window {
                let _ = window.minimize();
            }
        }
        "toggle_devtools" => handle_devtools_toggle(window.as_ref()),
        "about" => show_about_dialog(&app),
        "keyboard_shortcuts" => show_keyboard_shortcuts_dialog(&app),
        _ => return Err(format!("Unknown action: {}", action_id)),
    }
    
    Ok(())
}

/// Command to get current zoom level from localStorage
#[tauri::command]
pub async fn get_zoom_level(app: AppHandle) -> Result<f64, String> {
    if let Some(window) = app.webview_windows().values().next() {
        // Try to get zoom level from localStorage
        let js_code = r#"
            (function() {
                return parseFloat(localStorage.getItem('zoom-level') || '1.0');
            })()
        "#;
        
        // In a real implementation, we would use evaluate_script to get the result
        // For now, return default
        Ok(1.0)
    } else {
        Err("No active window found".to_string())
    }
}

/// Command to set zoom level
#[tauri::command]
pub async fn set_zoom_level(app: AppHandle, level: f64) -> Result<(), String> {
    if let Some(window) = app.webview_windows().values().next() {
        let clamped_level = level.max(0.25).min(3.0);
        let js_code = format!(
            "document.body.style.zoom = '{}'; localStorage.setItem('zoom-level', '{}');",
            clamped_level, clamped_level
        );
        window.eval(&js_code).map_err(|e| e.to_string())?;
        info!("Zoom level set to: {}", clamped_level);
        Ok(())
    } else {
        Err("No active window found".to_string())
    }
}
