// Command handlers for the AutoDev-AI Neural Bridge Platform

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{command, AppHandle, Runtime, State, Window};

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

impl CommandResponse {
    pub fn success(message: &str) -> Self {
        Self {
            success: true,
            message: message.to_string(),
            data: None,
        }
    }

    pub fn success_with_data(message: &str, data: serde_json::Value) -> Self {
        Self {
            success: true,
            message: message.to_string(),
            data: Some(data),
        }
    }

    pub fn error(message: &str) -> Self {
        Self {
            success: false,
            message: message.to_string(),
            data: None,
        }
    }
}

#[command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to AutoDev-AI Neural Bridge Platform!", name)
}

#[command]
pub fn get_app_version() -> CommandResponse {
    CommandResponse::success_with_data(
        "App version retrieved",
        serde_json::json!({
            "version": env!("CARGO_PKG_VERSION"),
            "name": env!("CARGO_PKG_NAME"),
            "description": env!("CARGO_PKG_DESCRIPTION")
        })
    )
}

#[command]
pub fn check_system_status() -> CommandResponse {
    CommandResponse::success_with_data(
        "System status checked",
        serde_json::json!({
            "status": "healthy",
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "platform": std::env::consts::OS,
            "arch": std::env::consts::ARCH
        })
    )
}

// Export all command handlers
// Command registration is handled in main.rs via generate_handler!