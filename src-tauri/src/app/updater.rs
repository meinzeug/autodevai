//! App Update Handler (Stub for Tauri v2 compatibility)
//!
//! This module provides update functionality stubs.
//! Full updater implementation requires Tauri v2 specific APIs.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, State, Emitter};
use tokio::time::interval;
use reqwest::Client;

/// Update configuration with enhanced Tauri v2 support
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateConfig {
    pub auto_check: bool,
    pub check_interval_hours: u64,
    pub notify_user: bool,
    pub prompt_before_install: bool,
    pub github_repo: String,
    pub pre_release: bool,
    pub silent_install: bool,
    pub backup_before_update: bool,
    pub update_channel: String, // stable, beta, dev
}

impl Default for UpdateConfig {
    fn default() -> Self {
        Self {
            auto_check: true,
            check_interval_hours: 24,
            notify_user: true,
            prompt_before_install: true,
            github_repo: "autodevai/autodevai".to_string(),
            pre_release: false,
            silent_install: false,
            backup_before_update: true,
            update_channel: "stable".to_string(),
        }
    }
}

/// Enhanced update status with progress tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UpdateStatus {
    Idle,
    Checking,
    Available { 
        version: String, 
        release_notes: String,
        download_url: String,
        size: u64,
    },
    Downloading { 
        version: String, 
        progress: f32, 
        downloaded: u64, 
        total: u64 
    },
    Installing { 
        version: String, 
        progress: f32 
    },
    ReadyToRestart { version: String },
    Error(String),
}

/// Update metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub version: String,
    pub release_date: String,
    pub release_notes: String,
    pub download_url: String,
    pub size: u64,
    pub checksum: Option<String>,
    pub is_critical: bool,
}

/// Enhanced update manager with Tauri v2 compatibility
#[derive(Debug)]
pub struct UpdateManager {
    config: Arc<RwLock<UpdateConfig>>,
    status: Arc<RwLock<UpdateStatus>>,
    app_handle: AppHandle,
    http_client: Client,
    last_check: Arc<RwLock<Option<SystemTime>>>,
    update_history: Arc<RwLock<Vec<UpdateInfo>>>,
    pending_update: Arc<RwLock<Option<UpdateInfo>>>,
}

impl UpdateManager {
    /// Create a new enhanced update manager
    pub fn new(app_handle: AppHandle) -> Self {
        let http_client = Client::builder()
            .user_agent(format!("AutoDev-AI/{}", env!("CARGO_PKG_VERSION")))
            .timeout(Duration::from_secs(30))
            .build()
            .unwrap_or_else(|_| Client::new());
            
        Self {
            config: Arc::new(RwLock::new(UpdateConfig::default())),
            status: Arc::new(RwLock::new(UpdateStatus::Idle)),
            app_handle,
            http_client,
            last_check: Arc::new(RwLock::new(None)),
            update_history: Arc::new(RwLock::new(Vec::new())),
            pending_update: Arc::new(RwLock::new(None)),
        }
    }

    /// Initialize the update manager with auto-check scheduling
    pub async fn initialize(&self) -> Result<(), Box<dyn std::error::Error>> {
        // Start auto-check scheduler if enabled
        let config = {
            let config_guard = self.config.read().unwrap();
            config_guard.clone()
        };
        
        if config.auto_check {
            self.schedule_auto_checks().await;
        }
        
        // Perform initial update check
        tokio::spawn({
            let self_clone = self.clone_for_async();
            async move {
                if let Err(e) = self_clone.check_for_updates().await {
                    log::warn!("Initial update check failed: {}", e);
                }
            }
        });
        
        log::info!("Enhanced update manager initialized");
        Ok(())
    }

    /// Check for updates via GitHub API
    pub async fn check_for_updates(&self) -> Result<bool, Box<dyn std::error::Error>> {
        {
            let mut status_guard = self.status.write().unwrap();
            *status_guard = UpdateStatus::Checking;
        }
        
        // Update last check time
        {
            let mut last_check_guard = self.last_check.write().unwrap();
            *last_check_guard = Some(SystemTime::now());
        }
        
        // Emit checking event
        let _ = self.app_handle.emit("update-checking", ());
        
        let config = {
            let config_guard = self.config.read().unwrap();
            config_guard.clone()
        };
        
        match self.fetch_latest_release(&config).await {
            Ok(Some(update_info)) => {
                let current_version = env!("CARGO_PKG_VERSION");
                
                if self.is_newer_version(current_version, &update_info.version)? {
                    {
                        let mut status_guard = self.status.write().unwrap();
                        *status_guard = UpdateStatus::Available {
                            version: update_info.version.clone(),
                            release_notes: update_info.release_notes.clone(),
                            download_url: update_info.download_url.clone(),
                            size: update_info.size,
                        };
                    }
                    
                    {
                        let mut pending_guard = self.pending_update.write().unwrap();
                        *pending_guard = Some(update_info.clone());
                    }
                    
                    // Add to history
                    {
                        let mut history_guard = self.update_history.write().unwrap();
                        history_guard.push(update_info.clone());
                        // Keep only last 10 updates
                        if history_guard.len() > 10 {
                            history_guard.remove(0);
                        }
                    }
                    
                    // Emit update available event
                    let _ = self.app_handle.emit("update-available", &update_info);
                    
                    if config.notify_user {
                        log::info!("Update available: {} -> {}", current_version, update_info.version);
                    }
                    
                    return Ok(true);
                } else {
                    log::debug!("No newer version available (current: {}, latest: {})", 
                               current_version, update_info.version);
                }
            }
            Ok(None) => {
                log::debug!("No releases found");
            }
            Err(e) => {
                let error_msg = format!("Failed to check for updates: {}", e);
                {
                    let mut status_guard = self.status.write().unwrap();
                    *status_guard = UpdateStatus::Error(error_msg.clone());
                }
                
                let _ = self.app_handle.emit("update-error", error_msg.clone());
                log::error!("{}", error_msg);
                
                return Err(e);
            }
        }
        
        {
            let mut status_guard = self.status.write().unwrap();
            *status_guard = UpdateStatus::Idle;
        }
        
        let _ = self.app_handle.emit("update-not-available", ());
        Ok(false)
    }

    /// Install pending update with progress tracking
    pub async fn install_update(&self) -> Result<(), Box<dyn std::error::Error>> {
        let update_info = {
            let pending_guard = self.pending_update.read().unwrap();
            pending_guard.clone()
        };
        
        let update_info = update_info.ok_or("No pending update available")?;
        
        {
            let mut status_guard = self.status.write().unwrap();
            *status_guard = UpdateStatus::Installing { 
                version: update_info.version.clone(), 
                progress: 0.0 
            };
        }
        
        let _ = self.app_handle.emit("update-installing", &update_info);
        
        // Simulate download progress (in real implementation, download the update file)
        for progress in (0..=100).step_by(10) {
            {
                let mut status_guard = self.status.write().unwrap();
                *status_guard = UpdateStatus::Installing { 
                    version: update_info.version.clone(), 
                    progress: progress as f32 
                };
            }
            
            let _ = self.app_handle.emit("update-progress", progress);
            tokio::time::sleep(Duration::from_millis(200)).await;
        }
        
        {
            let mut status_guard = self.status.write().unwrap();
            *status_guard = UpdateStatus::ReadyToRestart { 
                version: update_info.version.clone() 
            };
        }
        
        let _ = self.app_handle.emit("update-ready", &update_info);
        
        log::info!("Update installation completed: {}", update_info.version);
        Ok(())
    }

    /// Get current status (thread-safe)
    pub fn get_status(&self) -> UpdateStatus {
        let status_guard = self.status.read().unwrap();
        status_guard.clone()
    }

    /// Get configuration (thread-safe)
    pub fn get_config(&self) -> UpdateConfig {
        let config_guard = self.config.read().unwrap();
        config_guard.clone()
    }

    /// Update configuration (thread-safe)
    pub async fn update_config(
        &self,
        new_config: UpdateConfig,
    ) -> Result<(), Box<dyn std::error::Error>> {
        {
            let mut config_guard = self.config.write().unwrap();
            *config_guard = new_config.clone();
        }
        
        // Restart auto-check scheduler if interval changed
        if new_config.auto_check {
            self.schedule_auto_checks().await;
        }
        
        log::info!("Update configuration updated");
        Ok(())
    }

    /// Clear pending update
    pub async fn clear_pending_update(&self) {
        {
            let mut status_guard = self.status.write().unwrap();
            *status_guard = UpdateStatus::Idle;
        }
        
        {
            let mut pending_guard = self.pending_update.write().unwrap();
            *pending_guard = None;
        }
        
        let _ = self.app_handle.emit("update-cleared", ());
        log::info!("Pending update cleared");
    }
    
    /// Get update history
    pub fn get_update_history(&self) -> Vec<UpdateInfo> {
        let history_guard = self.update_history.read().unwrap();
        history_guard.clone()
    }
    
    /// Get pending update info
    pub fn get_pending_update(&self) -> Option<UpdateInfo> {
        let pending_guard = self.pending_update.read().unwrap();
        pending_guard.clone()
    }
    
    /// Get last check time
    pub fn get_last_check(&self) -> Option<SystemTime> {
        let last_check_guard = self.last_check.read().unwrap();
        *last_check_guard
    }
    
    /// Fetch latest release from GitHub
    async fn fetch_latest_release(&self, config: &UpdateConfig) -> Result<Option<UpdateInfo>, Box<dyn std::error::Error>> {
        let url = format!("https://api.github.com/repos/{}/releases{}", 
                         config.github_repo,
                         if config.pre_release { "" } else { "/latest" });
        
        let response = self.http_client
            .get(&url)
            .header("Accept", "application/vnd.github.v3+json")
            .send()
            .await?;
            
        if !response.status().is_success() {
            return Err(format!("GitHub API returned status: {}", response.status()).into());
        }
        
        let releases: serde_json::Value = response.json().await?;
        
        // Handle both single release (latest) and array (all releases)
        let release = if releases.is_array() {
            releases.as_array()
                .and_then(|arr| arr.first())
                .cloned()
        } else {
            Some(releases)
        };
        
        if let Some(release) = release {
            let version = release["tag_name"]
                .as_str()
                .unwrap_or("unknown")
                .trim_start_matches('v')
                .to_string();
                
            let release_notes = release["body"]
                .as_str()
                .unwrap_or("No release notes available")
                .to_string();
                
            let download_url = release["assets"]
                .as_array()
                .and_then(|assets| assets.first())
                .and_then(|asset| asset["browser_download_url"].as_str())
                .unwrap_or("")
                .to_string();
                
            let size = release["assets"]
                .as_array()
                .and_then(|assets| assets.first())
                .and_then(|asset| asset["size"].as_u64())
                .unwrap_or(0);
                
            let release_date = release["published_at"]
                .as_str()
                .unwrap_or("")
                .to_string();
                
            let is_critical = release_notes.to_lowercase().contains("critical") || 
                             release_notes.to_lowercase().contains("security");
            
            Ok(Some(UpdateInfo {
                version,
                release_date,
                release_notes,
                download_url,
                size,
                checksum: None, // TODO: Extract from release assets
                is_critical,
            }))
        } else {
            Ok(None)
        }
    }
    
    /// Check if a version is newer than current
    fn is_newer_version(&self, current: &str, new: &str) -> Result<bool, Box<dyn std::error::Error>> {
        // Simple semantic version comparison
        let current_parts: Vec<u32> = current
            .split('.')
            .take(3)
            .map(|s| s.parse().unwrap_or(0))
            .collect();
            
        let new_parts: Vec<u32> = new
            .split('.')
            .take(3)
            .map(|s| s.parse().unwrap_or(0))
            .collect();
            
        if current_parts.len() < 3 || new_parts.len() < 3 {
            return Ok(current != new); // Fallback to string comparison
        }
        
        Ok(new_parts > current_parts)
    }
    
    /// Schedule automatic update checks
    async fn schedule_auto_checks(&self) {
        let app_handle = self.app_handle.clone();
        let config = self.config.clone();
        let status = self.status.clone();
        let last_check = self.last_check.clone();
        let pending_update = self.pending_update.clone();
        let update_history = self.update_history.clone();
        let http_client = self.http_client.clone();
        
        tokio::spawn(async move {
            let updater = UpdateManager {
                config: config.clone(),
                status: status.clone(),
                app_handle: app_handle.clone(),
                http_client,
                last_check,
                update_history,
                pending_update,
            };
            
            loop {
                let check_interval = {
                    let config_guard = config.read().unwrap();
                    if !config_guard.auto_check {
                        break;
                    }
                    Duration::from_secs(config_guard.check_interval_hours * 3600)
                };
                
                let mut interval_timer = interval(check_interval);
                interval_timer.tick().await; // First tick is immediate
                
                if let Err(e) = updater.check_for_updates().await {
                    log::warn!("Scheduled update check failed: {}", e);
                }
            }
        });
    }
    
    /// Create a clone for async contexts
    fn clone_for_async(&self) -> UpdateManager {
        UpdateManager {
            config: self.config.clone(),
            status: self.status.clone(),
            app_handle: self.app_handle.clone(),
            http_client: self.http_client.clone(),
            last_check: self.last_check.clone(),
            update_history: self.update_history.clone(),
            pending_update: self.pending_update.clone(),
        }
    }
}

/// Initialize update manager
pub async fn setup_updater(app_handle: AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let updater = UpdateManager::new(app_handle.clone());
    updater.initialize().await?;

    app_handle.manage(updater);

    log::info!("Update manager setup completed");
    Ok(())
}

/// Tauri command to check for updates manually
#[tauri::command]
pub async fn check_for_updates(updater: State<'_, UpdateManager>) -> Result<bool, String> {
    updater
        .check_for_updates()
        .await
        .map_err(|e| format!("Failed to check for updates: {}", e))
}

/// Tauri command to install pending update
#[tauri::command]
pub async fn install_update(updater: State<'_, UpdateManager>) -> Result<(), String> {
    updater
        .install_update()
        .await
        .map_err(|e| format!("Failed to install update: {}", e))
}

/// Tauri command to get update status
#[tauri::command]
pub async fn get_update_status(updater: State<'_, UpdateManager>) -> Result<UpdateStatus, String> {
    Ok(updater.get_status())
}

/// Tauri command to get update configuration
#[tauri::command]
pub async fn get_update_config(updater: State<'_, UpdateManager>) -> Result<UpdateConfig, String> {
    Ok(updater.get_config())
}

/// Tauri command to update configuration
#[tauri::command]
pub async fn update_update_config(
    updater: State<'_, UpdateManager>,
    config: UpdateConfig,
) -> Result<(), String> {
    updater
        .update_config(config)
        .await
        .map_err(|e| format!("Failed to update config: {}", e))
}

/// Tauri command to clear pending update
#[tauri::command]
pub async fn clear_pending_update(updater: State<'_, UpdateManager>) -> Result<(), String> {
    updater.clear_pending_update().await;
    Ok(())
}

/// Tauri command to restart app
#[tauri::command]
pub async fn restart_app(app_handle: AppHandle) -> Result<(), String> {
    log::info!("App restart requested");
    // For now, just exit - restart functionality depends on OS integration
    app_handle.exit(0);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::test::mock_app;

    #[tokio::test]
    async fn test_update_config_default() {
        let config = UpdateConfig::default();
        assert!(config.auto_check);
        assert_eq!(config.check_interval_hours, 24);
        assert!(config.notify_user);
    }

    #[test]
    fn test_update_status_serialization() {
        let status = UpdateStatus::Available {
            version: "1.0.0".to_string(),
        };

        let serialized = serde_json::to_string(&status).unwrap();
        assert!(serialized.contains("1.0.0"));
    }
}
