use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressEvent {
    pub task_id: String,
    pub progress: f32, // 0.0 - 1.0
    pub message: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusEvent {
    pub component: String,
    pub status: String,
    pub details: Option<String>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorEvent {
    pub error_type: String,
    pub message: String,
    pub source: Option<String>,
    pub timestamp: u64,
}

pub fn emit_progress_event<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    task_id: String,
    progress: f32,
    message: String,
) {
    let event = ProgressEvent {
        task_id,
        progress,
        message,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };

    let _ = app.emit_all("progress", event);
}

pub fn emit_status_event<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    component: String,
    status: String,
    details: Option<String>,
) {
    let event = StatusEvent {
        component,
        status,
        details,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };

    let _ = app.emit_all("status", event);
}

pub fn emit_error_event<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    error_type: String,
    message: String,
    source: Option<String>,
) {
    let event = ErrorEvent {
        error_type,
        message,
        source,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };

    let _ = app.emit_all("error", event);
}
