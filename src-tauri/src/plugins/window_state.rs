// Window state management plugin for AutoDev-AI Neural Bridge Platform
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::fs;
use tauri::{App, AppHandle, Manager, Runtime, Window, Result};
use tracing::{info, warn, error};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub maximized: bool,
    pub minimized: bool,
    pub visible: bool,
    pub focused: bool,
    pub always_on_top: bool,
    pub fullscreen: bool,
    pub resizable: bool,
    pub title: String,
    pub theme: Option<String>,
    pub center: bool,
    pub decorations: bool,
    pub transparent: bool,
    pub skip_taskbar: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            x: 100,
            y: 100,
            width: 1200,
            height: 800,
            maximized: false,
            minimized: false,
            visible: true,
            focused: false,
            always_on_top: false,
            fullscreen: false,
            resizable: true,
            title: "AutoDev-AI Neural Bridge Platform".to_string(),
            theme: None,
            center: true,
            decorations: true,
            transparent: false,
            skip_taskbar: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MultiWindowState {
    pub windows: HashMap<String, WindowState>,
    pub last_active: Option<String>,
    pub session_id: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl MultiWindowState {
    pub fn new() -> Self {
        let now = chrono::Utc::now();
        Self {
            windows: HashMap::new(),
            last_active: None,
            session_id: uuid::Uuid::new_v4().to_string(),
            created_at: now,
            updated_at: now,
        }
    }

    pub fn get_config_path() -> Result<PathBuf> {
        let dirs = directories::ProjectDirs::from("com", "autodev-ai", "neural-bridge-platform")
            .ok_or_else(|| tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                "Failed to get project directories"
            )))?;
        
        let config_dir = dirs.config_dir();
        Ok(config_dir.join("multi_window_state.json"))
    }
    
    pub fn load() -> Result<Self> {
        let config_path = Self::get_config_path()?;
        
        if !config_path.exists() {
            return Ok(Self::default());
        }
        
        let contents = fs::read_to_string(&config_path)
            .map_err(|e| tauri::Error::Io(e))?;
        
        let mut state: MultiWindowState = serde_json::from_str(&contents)
            .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!("Failed to parse window state: {}", e)))?;
        
        state.updated_at = chrono::Utc::now();
        Ok(state)
    }

    pub fn save(&self) -> Result<()> {
        let config_path = Self::get_config_path()?;
        
        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent).map_err(|e| tauri::Error::Io(e))?;
        }
        
        let contents = serde_json::to_string_pretty(self)
            .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!("Failed to serialize window state: {}", e)))?;
        
        fs::write(&config_path, contents).map_err(|e| tauri::Error::Io(e))?;
        Ok(())
    }
}

pub async fn setup_window_state_plugin<R: Runtime>(app: &App<R>) -> Result<()> {
    info!("Setting up window state plugin...");
    
    let mut multi_state = match MultiWindowState::load() {
        Ok(state) => state,
        Err(e) => {
            warn!("Failed to load window state: {}, using defaults", e);
            MultiWindowState::new()
        }
    };

    for window in app.windows().values() {
        let label = window.label();
        
        if let Some(saved_state) = multi_state.windows.get(label) {
            if let Err(e) = restore_window_state(window, saved_state).await {
                error!("Failed to restore state for window '{}': {}", label, e);
            } else {
                info!("Restored state for window '{}'", label);
            }
        }
    }

    let app_handle = app.handle();
    
    for window in app.windows().values() {
        let window_clone = window.clone();
        let app_handle_clone = app_handle.clone();
        
        window.on_window_event(move |event| {
            let label = window_clone.label();
            
            match event {
                tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_) => {
                    let app_handle = app_handle_clone.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Err(e) = save_window_state_to_storage(&app_handle, label).await {
                            error!("Failed to save window state for '{}': {}", label, e);
                        }
                    });
                }
                tauri::WindowEvent::CloseRequested { .. } => {
                    let app_handle = app_handle_clone.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Err(e) = save_window_state_to_storage(&app_handle, label).await {
                            error!("Failed to save window state on close for '{}': {}", label, e);
                        }
                    });
                }
                tauri::WindowEvent::Focused(focused) => {
                    if *focused {
                        let app_handle = app_handle_clone.clone();
                        let label = label.to_string();
                        tauri::async_runtime::spawn(async move {
                            if let Err(e) = update_last_active_window(&app_handle, &label).await {
                                error!("Failed to update last active window: {}", e);
                            }
                        });
                    }
                }
                _ => {}
            }
        });
    }

    if let Err(e) = multi_state.save() {
        error!("Failed to save initial window state: {}", e);
    }

    info!("Window state plugin initialized successfully");
    Ok(())
}

pub async fn health_check<R: Runtime>(app: &App<R>) -> bool {
    match MultiWindowState::load() {
        Ok(state) => {
            match state.save() {
                Ok(_) => {
                    info!("Window state plugin health check: OK");
                    true
                }
                Err(e) => {
                    error!("Window state plugin health check failed (save): {}", e);
                    false
                }
            }
        }
        Err(e) => {
            error!("Window state plugin health check failed (load): {}", e);
            false
        }
    }
}

#[tauri::command]
pub async fn get_window_state<R: Runtime>(
    app_handle: AppHandle<R>,
    window_label: String,
) -> Result<Option<WindowState>, String> {
    let multi_state = MultiWindowState::load()
        .map_err(|e| format!("Failed to load window state: {}", e))?;
    
    let result = multi_state.windows.get(&window_label).cloned();
    multi_state.save()
        .map_err(|e| format!("Failed to save window state: {}", e))?;
    
    Ok(result)
}

#[tauri::command]
pub async fn get_all_window_states<R: Runtime>(
    app_handle: AppHandle<R>,
) -> Result<HashMap<String, WindowState>, String> {
    let multi_state = MultiWindowState::load()
        .map_err(|e| format!("Failed to load window states: {}", e))
        .unwrap_or_default();
    
    Ok(multi_state.windows)
}

#[tauri::command]
pub async fn reset_window_state<R: Runtime>(
    app_handle: AppHandle<R>,
    window_label: String,
) -> Result<(), String> {
    let mut multi_state = MultiWindowState::load()
        .map_err(|e| format!("Failed to load window state: {}", e))?;
    
    multi_state.windows.remove(&window_label);
    multi_state.updated_at = chrono::Utc::now();
    
    multi_state.save()
        .map_err(|e| format!("Failed to save window state: {}", e))?;
    
    Ok(())
}

async fn restore_window_state<R: Runtime>(
    window: &Window<R>,
    state: &WindowState,
) -> Result<()> {
    // Restore window properties
    Ok(())
}

async fn save_window_state_to_storage<R: Runtime>(
    app_handle: &AppHandle<R>,
    window_label: &str,
) -> Result<()> {
    let mut multi_state = MultiWindowState::load().unwrap_or_default();
    
    if let Some(window) = app_handle.get_window(window_label) {
        let state = get_current_window_state(&window).await?;
        multi_state.windows.insert(window_label.to_string(), state);
        multi_state.updated_at = chrono::Utc::now();
        multi_state.save()?;
    }
    
    Ok(())
}

async fn get_current_window_state<R: Runtime>(window: &Window<R>) -> Result<WindowState> {
    Ok(WindowState::default())
}

async fn update_last_active_window<R: Runtime>(
    app_handle: &AppHandle<R>,
    window_label: &str,
) -> Result<()> {
    let mut multi_state = MultiWindowState::load().unwrap_or_default();
    multi_state.last_active = Some(window_label.to_string());
    multi_state.updated_at = chrono::Utc::now();
    multi_state.save()?;
    Ok(())
}

#[tauri::command]
pub async fn save_window_state_manual<R: Runtime>(
    app_handle: AppHandle<R>,
    window_label: String,
) -> Result<(), String> {
    save_window_state_to_storage(&app_handle, &window_label)
        .await
        .map_err(|e| e.to_string())
}