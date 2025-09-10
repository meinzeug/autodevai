// AutoDev-AI Neural Bridge Platform - Complete Tauri Implementation
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tracing::{info, warn};
use tauri::Manager;

// Module declarations
mod app;
mod dev_window;
mod events;
mod menu;
mod security;
mod settings;
mod tray;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! AutoDev-AI Neural Bridge Platform is ready.", name)
}

#[tauri::command]
async fn get_system_info() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "version": env!("CARGO_PKG_VERSION"),
        "tauri_version": "2.0",
        "rust_version": env!("CARGO_PKG_RUST_VERSION"),
        "build_date": env!("BUILD_TIMESTAMP"),
    }))
}

#[tauri::command]
async fn emergency_shutdown(app_handle: tauri::AppHandle) -> Result<(), String> {
    info!("Emergency shutdown requested");
    
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    app_handle.exit(0);
    Ok(())
}

fn main() {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(true)
        .with_thread_ids(true)
        .init();
    
    info!("Starting AutoDev-AI Neural Bridge Platform v{}", env!("CARGO_PKG_VERSION"));
    
    tauri::Builder::default()
        // Core plugins
        .plugin(tauri_plugin_window_state::Builder::default().build())
        
        // Setup hook for initializing plugins and state
        .setup(|app| {
            info!("Setting up AutoDev-AI Neural Bridge Platform...");
            
            // Get app handle for async operations
            let app_handle = app.handle().clone();
            
            // Initialize async components in a blocking context
            tauri::async_runtime::block_on(async {
                // Initialize settings manager
                if let Err(e) = settings::setup_settings(&app_handle).await {
                    warn!("Failed to setup settings: {}", e);
                }
                
                // Initialize event system
                if let Err(e) = events::setup_event_system(app_handle.clone()).await {
                    warn!("Failed to setup event system: {}", e);
                }
                
                // Initialize app setup (window state, security, updater)
                if let Err(e) = app::setup::setup_hook(app).await {
                    warn!("Failed to setup app components: {}", e);
                }
                
                // Initialize updater
                if let Err(e) = app::updater::setup_updater(app_handle.clone()).await {
                    warn!("Failed to setup updater: {}", e);
                }
            });
            
            // Create application menu
            let menu = menu::create_app_menu(&app_handle)?;
            app.set_menu(menu)?;
            
            // Create system tray
            let _tray = tray::create_system_tray(&app_handle)?;
            
            info!("AutoDev-AI Neural Bridge Platform setup complete");
            Ok(())
        })
        
        // Menu event handler
        .on_menu_event(|app, event| {
            menu::handle_menu_event(app, event);
        })
        
        // Window event handler
        .on_window_event(|window, event| {
            let app = window.app_handle();
            let window_label = window.label();
            
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    info!("Window '{}' close requested", window_label);
                    
                    // Handle close to tray behavior
                    if tray::handle_window_close_to_tray(&app, window_label) {
                        api.prevent_close();
                    }
                }
                tauri::WindowEvent::Destroyed => {
                    info!("Window '{}' destroyed", window_label);
                }
                tauri::WindowEvent::Focused(focused) => {
                    if *focused {
                        info!("Window '{}' gained focus", window_label);
                    }
                }
                _ => {}
            }
        })
        
        // Command handlers
        .invoke_handler(tauri::generate_handler![
            greet,
            get_system_info,
            emergency_shutdown,
            // Dev window commands
            dev_window::dev_toggle_devtools,
            dev_window::dev_window_info,
            // Menu commands
            menu::toggle_menu_visibility,
            menu::get_menu_info,
            // Tray commands
            tray::show_from_tray,
            tray::hide_to_tray,
            tray::toggle_tray_visibility,
            tray::get_tray_config,
            tray::update_tray_tooltip,
            // Settings commands
            settings::manager::get_setting,
            settings::manager::set_setting,
            settings::manager::get_all_settings,
            settings::manager::save_settings,
            settings::manager::reset_settings,
            // Security commands
            security::ipc_security::create_security_session,
            security::ipc_security::validate_ipc_command,
            security::ipc_security::get_security_stats,
            // App setup commands
            app::setup::get_setup_config,
            app::setup::update_setup_config,
            app::setup::save_window_state,
            app::setup::get_window_state,
            // Updater commands
            app::updater::check_for_updates,
            app::updater::install_update,
            app::updater::get_update_status,
            app::updater::get_update_config,
            app::updater::update_update_config,
            app::updater::clear_pending_update,
            app::updater::restart_app,
            // Event system commands
            events::emit_event,
            events::get_events,
            events::subscribe_to_events,
            events::unsubscribe_from_events,
            events::get_event_stats,
            events::clear_events
        ])
        
        .run(tauri::generate_context!())
        .expect("error while running AutoDev-AI Neural Bridge Platform");
}