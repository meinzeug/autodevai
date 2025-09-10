// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Import all modules
mod commands;
mod docker;
mod events;
mod ipc_security;
// mod menu;
mod orchestration;
mod setup;
mod state;
// mod tray;
mod updater;
mod window_state;
mod plugins;

use tauri::Manager;
use tracing::{error, info, warn};



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
    
    // Stop all neural services
    // Stop Docker containers
    // Save all state
    // Close application gracefully
    
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
        // Core plugins (only window state for now)
        .plugin(tauri_plugin_window_state::Builder::default().build())
        
        // Setup hook for initializing plugins and state
        .setup(|app| {
            info!("Setting up AutoDev-AI Neural Bridge Platform...");
            
            // Initialize all custom plugins
            // Initialize plugins
            info!("Plugins initialized successfully");
            
            // Set up system tray event handler
            let app_handle = app.handle();
            // System tray setup (commented for now)
            // app.set_system_tray_event_handler(move |event| {
            //     tray::system_tray::handle_system_tray_event(&app_handle, event);
            // });
            
            info!("AutoDev-AI Neural Bridge Platform setup complete");
            Ok(())
        })
        
        // Menu event handler
        // .on_menu_event(|event| {
        //     menu::handle_menu_event(event);
        // })
        
        // Window event handler
        .on_window_event(|_window, event| match event {
            tauri::WindowEvent::CloseRequested { .. } => {
                info!("Window close requested");
                // Perform cleanup before closing
            }
            tauri::WindowEvent::Destroyed => {
                info!("Window destroyed");
            }
            _ => {}
        })
        
        // Command handlers
        .invoke_handler(tauri::generate_handler![
            // Core commands
            commands::greet,
            get_system_info,
            emergency_shutdown,
            commands::get_app_version,
            commands::check_system_status
        ])
        
        .run(tauri::generate_context!())
        .expect("error while running AutoDev-AI Neural Bridge Platform");
}