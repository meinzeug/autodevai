//! Settings Manager
//! 
//! Provides persistent settings management with JSON storage

use serde_json::Value;
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tokio::fs;
use tokio::sync::RwLock;

/// Settings manager for persistent application configuration
pub struct Settings {
    config_path: PathBuf,
    data: RwLock<HashMap<String, Value>>,
}

impl Settings {
    /// Create a new settings manager
    pub fn new(config_dir: PathBuf) -> Self {
        let config_path = config_dir.join("settings.json");
        
        Self {
            config_path,
            data: RwLock::new(HashMap::new()),
        }
    }

    /// Load settings from disk
    pub async fn load(&self) -> Result<(), Box<dyn std::error::Error>> {
        if self.config_path.exists() {
            let content = fs::read_to_string(&self.config_path).await?;
            let settings: HashMap<String, Value> = serde_json::from_str(&content)?;
            
            let mut data = self.data.write().await;
            *data = settings;
            
            log::info!("Loaded settings from {:?}", self.config_path);
        } else {
            log::info!("Settings file not found, using defaults");
        }
        
        Ok(())
    }

    /// Save settings to disk
    pub async fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        let data = self.data.read().await;
        let content = serde_json::to_string_pretty(&*data)?;
        fs::write(&self.config_path, content).await?;
        
        log::debug!("Saved settings to {:?}", self.config_path);
        Ok(())
    }

    /// Get a setting value
    pub async fn get(&self, key: &str) -> Option<Value> {
        let data = self.data.read().await;
        data.get(key).cloned()
    }

    /// Set a setting value
    pub async fn set(&self, key: &str, value: Value) -> Result<(), Box<dyn std::error::Error>> {
        let mut data = self.data.write().await;
        data.insert(key.to_string(), value);
        Ok(())
    }

    /// Get all settings
    pub async fn get_all(&self) -> HashMap<String, Value> {
        let data = self.data.read().await;
        data.clone()
    }

    /// Reset all settings
    pub async fn reset(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut data = self.data.write().await;
        data.clear();
        self.save().await?;
        Ok(())
    }
}

/// Initialize settings manager
pub async fn setup_settings(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Get app config directory - using a basic approach for Tauri v2
    // Use a simple config directory for now - Tauri v2 path resolution needs different approach
    let config_dir = std::env::current_dir()
        .unwrap_or_default()
        .join(".config")
        .join("autodev-ai");

    let settings = Settings::new(config_dir);
    settings.load().await?;
    
    app_handle.manage(settings);
    
    log::info!("Settings manager initialized");
    Ok(())
}

/// Tauri command to get a setting
#[tauri::command]
pub async fn get_setting(
    settings: tauri::State<'_, Settings>,
    key: String,
) -> Result<Option<Value>, String> {
    Ok(settings.get(&key).await)
}

/// Tauri command to set a setting
#[tauri::command]
pub async fn set_setting(
    settings: tauri::State<'_, Settings>,
    key: String,
    value: Value,
) -> Result<(), String> {
    settings
        .set(&key, value)
        .await
        .map_err(|e| format!("Failed to set setting: {}", e))
}

/// Tauri command to get all settings
#[tauri::command]
pub async fn get_all_settings(
    settings: tauri::State<'_, Settings>,
) -> Result<HashMap<String, Value>, String> {
    Ok(settings.get_all().await)
}

/// Tauri command to save settings
#[tauri::command]
pub async fn save_settings(
    settings: tauri::State<'_, Settings>,
) -> Result<(), String> {
    settings
        .save()
        .await
        .map_err(|e| format!("Failed to save settings: {}", e))
}

/// Tauri command to reset settings
#[tauri::command]
pub async fn reset_settings(
    settings: tauri::State<'_, Settings>,
) -> Result<(), String> {
    settings
        .reset()
        .await
        .map_err(|e| format!("Failed to reset settings: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_settings_creation() {
        let temp_dir = TempDir::new().unwrap();
        let settings = Settings::new(temp_dir.path().to_path_buf());
        
        assert!(settings.config_path.ends_with("settings.json"));
    }

    #[tokio::test]
    async fn test_settings_set_get() {
        let temp_dir = TempDir::new().unwrap();
        let settings = Settings::new(temp_dir.path().to_path_buf());
        
        let value = Value::String("test_value".to_string());
        settings.set("test_key", value.clone()).await.unwrap();
        
        let retrieved = settings.get("test_key").await;
        assert_eq!(retrieved, Some(value));
    }

    #[tokio::test]
    async fn test_settings_save_load() {
        let temp_dir = TempDir::new().unwrap();
        let settings = Settings::new(temp_dir.path().to_path_buf());
        
        let value = Value::String("persistent_value".to_string());
        settings.set("persistent_key", value.clone()).await.unwrap();
        settings.save().await.unwrap();
        
        // Create new settings instance and load
        let new_settings = Settings::new(temp_dir.path().to_path_buf());
        new_settings.load().await.unwrap();
        
        let retrieved = new_settings.get("persistent_key").await;
        assert_eq!(retrieved, Some(value));
    }
}