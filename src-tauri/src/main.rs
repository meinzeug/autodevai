// AutoDev-AI Neural Bridge Platform - Complete Tauri Implementation
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tracing::{info, warn, debug};

// Module declarations
mod app;
mod dev_window;
mod events;
mod logging;
mod menu;
mod security;
mod settings;
mod tray;
mod window_state;

#[tauri::command]
fn greet(name: &str) -> String {
    format!(
        "Hello, {}! AutoDev-AI Neural Bridge Platform is ready.",
        name
    )
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

    info!(
        "Starting AutoDev-AI Neural Bridge Platform v{}",
        env!("CARGO_PKG_VERSION")
    );

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
                // Initialize window state management first (needed by other components)
                if let Err(e) = window_state::setup_window_state(&app_handle).await {
                    warn!("Failed to setup window state management: {}", e);
                } else {
                    // Restore window states for existing windows
                    for window in app.webview_windows().values() {
                        let label = window.label();
                        if let Some(manager) = app_handle.try_state::<window_state::WindowStateManager>() {
                            if let Err(e) = manager.restore_window_state(label, window).await {
                                warn!("Failed to restore state for window '{}': {}", label, e);
                            } else {
                                info!("Successfully restored state for window '{}'", label);
                            }
                        }
                    }
                }

                // Initialize settings manager
                if let Err(e) = settings::setup_settings(&app_handle).await {
                    warn!("Failed to setup settings: {}", e);
                }

                // Initialize event system
                if let Err(e) = events::setup_event_system(app_handle.clone()).await {
                    warn!("Failed to setup event system: {}", e);
                }

                // Initialize app setup (security, updater)
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
        // Window event handler with comprehensive state management
        .on_window_event(|window, event| {
            let app = window.app_handle();
            let window_label = window.label();

            // Handle window state management events
            if let Err(e) = tauri::async_runtime::block_on(
                window_state::handle_window_event(&app, event, window_label)
            ) {
                warn!("Failed to handle window state event: {}", e);
            }

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
                tauri::WindowEvent::Moved(_) => {
                    debug!("Window '{}' moved", window_label);
                }
                tauri::WindowEvent::Resized(_) => {
                    debug!("Window '{}' resized", window_label);
                }
                _ => {}
            }
        })
        // Essential command handlers for window state management
        .invoke_handler(tauri::generate_handler![
            // Core application commands
            greet,
            get_system_info,
            emergency_shutdown,
            
            // Development window commands
            dev_window::dev_toggle_devtools,
            dev_window::dev_window_info,
            dev_window::get_dev_window_config,
            dev_window::update_dev_window_config,
            
            // Menu management commands
            menu::toggle_menu_visibility,
            menu::get_menu_info,
            
            // System tray commands
            tray::show_from_tray,
            tray::hide_to_tray,
            tray::toggle_tray_visibility,
            tray::get_tray_config,
            tray::update_tray_tooltip,
            tray::get_tray_state,
            tray::update_tray_config,
            
            // Settings management commands
            settings::manager::get_setting,
            settings::manager::set_setting,
            settings::manager::get_all_settings,
            settings::manager::save_settings,
            settings::manager::reset_settings,
            
            // Enhanced security commands
            security::ipc_security::create_security_session,
            security::ipc_security::validate_ipc_command,
            security::ipc_security::get_security_stats,
            
            // App setup and window state commands
            app::setup::get_setup_config,
            app::setup::update_setup_config,
            app::setup::save_window_state,
            app::setup::get_window_state,
            app::setup::restore_window_state,
            app::setup::set_auto_save_enabled,
            
            // Enhanced updater commands
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
            events::clear_events,
            
            // Enhanced window state management commands
            window_state::save_current_window_state,
            window_state::get_window_states,
            window_state::get_window_state_stats,
            window_state::restore_window_state_command,
            window_state::get_last_focused_window,
            window_state::cleanup_window_focus_tracker
        ])
        .run(tauri::generate_context!())
        .expect("error while running AutoDev-AI Neural Bridge Platform");
}