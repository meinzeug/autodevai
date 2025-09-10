// Minimal Tauri main.rs for AutoDev-AI Neural Bridge Platform
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tracing::{info};

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
        .setup(|_app| {
            info!("Setting up AutoDev-AI Neural Bridge Platform...");
            info!("AutoDev-AI Neural Bridge Platform setup complete");
            Ok(())
        })
        
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
            greet,
            get_system_info,
            emergency_shutdown
        ])
        
        .run(tauri::generate_context!())
        .expect("error while running AutoDev-AI Neural Bridge Platform");
}