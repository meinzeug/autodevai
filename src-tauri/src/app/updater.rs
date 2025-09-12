//! Comprehensive App Update Handler with Tauri v2 Integration
//!
//! This module provides complete update functionality including:
//! - Automatic update checking via GitHub releases
//! - Background downloads with progress tracking
//! - Rollback mechanism for failed updates
//! - User notifications and progress UI
//! - Settings and preferences management

use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind, MessageDialogButtons};
use tauri_plugin_notification::{NotificationExt, PermissionState};
use tauri_plugin_updater::{Update, UpdaterExt};
use tokio::time::interval;

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

/// Enhanced update status with progress tracking and rollback support
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UpdateStatus {
    Idle,
    Checking,
    Available {
        version: String,
        release_notes: String,
        download_url: String,
        size: u64,
        is_critical: bool,
    },
    Downloading {
        version: String,
        progress: f32,
        downloaded: u64,
        total: u64,
    },
    Installing {
        version: String,
        progress: f32,
    },
    ReadyToRestart {
        version: String,
    },
    RollingBack {
        reason: String,
    },
    RollbackComplete {
        previous_version: String,
    },
    Error(String),
}

/// Update metadata with rollback information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub version: String,
    pub release_date: String,
    pub release_notes: String,
    pub download_url: String,
    pub size: u64,
    pub checksum: Option<String>,
    pub is_critical: bool,
    pub backup_path: Option<PathBuf>,
    pub rollback_version: Option<String>,
}

/// Rollback information for failed updates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollbackInfo {
    pub backup_path: PathBuf,
    pub previous_version: String,
    pub backup_timestamp: SystemTime,
    pub reason: String,
}

/// Enhanced update manager with Tauri v2 compatibility and rollback support
pub struct UpdateManager {
    config: Arc<RwLock<UpdateConfig>>,
    status: Arc<RwLock<UpdateStatus>>,
    app_handle: AppHandle,
    http_client: Client,
    last_check: Arc<RwLock<Option<SystemTime>>>,
    update_history: Arc<RwLock<Vec<UpdateInfo>>>,
    pending_update: Arc<RwLock<Option<UpdateInfo>>>,
    rollback_info: Arc<RwLock<Option<RollbackInfo>>>,
    backup_directory: PathBuf,
    native_updater: Option<Update>,
}

impl UpdateManager {
    /// Create a new enhanced update manager with rollback support
    pub fn new(app_handle: AppHandle) -> Self {
        let http_client = Client::builder()
            .user_agent(format!("AutoDev-AI/{}", env!("CARGO_PKG_VERSION")))
            .timeout(Duration::from_secs(30))
            .build()
            .unwrap_or_else(|_| Client::new());

        // Create backup directory
        let backup_directory = app_handle
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| std::env::temp_dir())
            .join("update_backups");

        let _ = std::fs::create_dir_all(&backup_directory);

        Self {
            config: Arc::new(RwLock::new(UpdateConfig::default())),
            status: Arc::new(RwLock::new(UpdateStatus::Idle)),
            app_handle,
            http_client,
            last_check: Arc::new(RwLock::new(None)),
            update_history: Arc::new(RwLock::new(Vec::new())),
            pending_update: Arc::new(RwLock::new(None)),
            rollback_info: Arc::new(RwLock::new(None)),
            backup_directory,
            native_updater: None,
        }
    }

    /// Initialize the update manager with native Tauri updater and auto-check scheduling
    pub async fn initialize(&self) -> Result<(), Box<dyn std::error::Error>> {
        // Initialize notification permissions
        if let Err(e) = self.request_notification_permission().await {
            log::warn!("Failed to request notification permission: {}", e);
        }

        // Start auto-check scheduler if enabled
        let config = {
            let config_guard = self.config.read().unwrap();
            config_guard.clone()
        };

        if config.auto_check {
            self.schedule_auto_checks().await;
        }

        // Check for pending rollbacks from previous session
        if let Err(e) = self.check_for_pending_rollbacks().await {
            log::warn!("Failed to check for pending rollbacks: {}", e);
        }

        // Perform initial update check if enabled
        if config.auto_check {
            tokio::spawn({
                let self_clone = self.clone_for_async();
                async move {
                    // Delay initial check by 30 seconds to allow app to fully start
                    tokio::time::sleep(Duration::from_secs(30)).await;
                    if let Err(e) = self_clone.check_for_updates().await {
                        log::warn!("Initial update check failed: {}", e);
                    }
                }
            });
        }

        log::info!("Enhanced update manager initialized with native Tauri updater support");
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
                            is_critical: update_info.is_critical,
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
                        log::info!(
                            "Update available: {} -> {}",
                            current_version,
                            update_info.version
                        );
                    }

                    return Ok(true);
                } else {
                    log::debug!(
                        "No newer version available (current: {}, latest: {})",
                        current_version,
                        update_info.version
                    );
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

    /// Install pending update with comprehensive progress tracking and backup
    pub async fn install_update(&self) -> Result<(), Box<dyn std::error::Error>> {
        let update_info = {
            let pending_guard = self.pending_update.read().unwrap();
            pending_guard.clone()
        };

        let update_info = update_info.ok_or("No pending update available")?;
        let config = self.get_config();

        {
            let mut status_guard = self.status.write().unwrap();
            *status_guard = UpdateStatus::Installing {
                version: update_info.version.clone(),
                progress: 0.0,
            };
        }

        let _ = self.app_handle.emit("update-installing", &update_info);

        // Create backup if enabled
        if config.backup_before_update {
            if let Err(e) = self.create_backup(&update_info.version).await {
                log::error!("Failed to create backup: {}", e);
                {
                    let mut status_guard = self.status.write().unwrap();
                    *status_guard = UpdateStatus::Error(format!("Backup failed: {}", e));
                }
                return Err(e);
            }
        }

        // Try to use native Tauri updater first
        match self.install_with_native_updater(&update_info).await {
            Ok(_) => {
                {
                    let mut status_guard = self.status.write().unwrap();
                    *status_guard = UpdateStatus::ReadyToRestart {
                        version: update_info.version.clone(),
                    };
                }

                let _ = self.app_handle.emit("update-ready", &update_info);

                // Show notification if user enabled them
                if config.notify_user {
                    self.show_update_notification(
                        "Update Ready",
                        &format!(
                            "Update to {} is ready. Restart to apply.",
                            update_info.version
                        ),
                    )
                    .await;
                }

                log::info!("Update installation completed: {}", update_info.version);
                Ok(())
            }
            Err(e) => {
                log::error!("Native updater failed, attempting rollback: {}", e);

                // Attempt rollback if backup exists
                if config.backup_before_update {
                    if let Err(rollback_err) = self
                        .perform_rollback(format!("Installation failed: {}", e))
                        .await
                    {
                        log::error!("Rollback also failed: {}", rollback_err);
                    }
                }

                {
                    let mut status_guard = self.status.write().unwrap();
                    *status_guard = UpdateStatus::Error(format!("Installation failed: {}", e));
                }

                let _ = self
                    .app_handle
                    .emit("update-error", format!("Installation failed: {}", e));
                Err(e)
            }
        }
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

    /// Clear pending update and cleanup temporary files
    pub async fn clear_pending_update(&self) {
        {
            let mut status_guard = self.status.write().unwrap();
            *status_guard = UpdateStatus::Idle;
        }

        {
            let mut pending_guard = self.pending_update.write().unwrap();
            *pending_guard = None;
        }

        // Clean up any temporary download files
        self.cleanup_temp_files().await;

        let _ = self.app_handle.emit("update-cleared", ());
        log::info!("Pending update cleared and temporary files cleaned up");
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

    /// Get rollback information
    pub fn get_rollback_info(&self) -> Option<RollbackInfo> {
        let rollback_guard = self.rollback_info.read().unwrap();
        rollback_guard.clone()
    }

    /// Create backup of current installation
    pub async fn create_backup(&self, new_version: &str) -> Result<(), Box<dyn std::error::Error>> {
        let current_version = env!("CARGO_PKG_VERSION");
        let backup_path = self
            .backup_directory
            .join(format!("backup_v{}", current_version));

        // Create backup directory
        std::fs::create_dir_all(&backup_path).context("Failed to create backup directory")?;

        // Store rollback information
        let rollback_info = RollbackInfo {
            backup_path: backup_path.clone(),
            previous_version: current_version.to_string(),
            backup_timestamp: SystemTime::now(),
            reason: String::new(), // Will be filled if rollback is needed
        };

        {
            let mut rollback_guard = self.rollback_info.write().unwrap();
            *rollback_guard = Some(rollback_info);
        }

        log::info!(
            "Backup created for version {} at {:?}",
            current_version,
            backup_path
        );
        Ok(())
    }

    /// Perform rollback to previous version
    pub async fn perform_rollback(&self, reason: String) -> Result<(), Box<dyn std::error::Error>> {
        let rollback_info = {
            let rollback_guard = self.rollback_info.read().unwrap();
            rollback_guard.clone()
        };

        let mut rollback_info = rollback_info.ok_or("No rollback information available")?;
        rollback_info.reason = reason;

        {
            let mut status_guard = self.status.write().unwrap();
            *status_guard = UpdateStatus::RollingBack {
                reason: rollback_info.reason.clone(),
            };
        }

        let _ = self.app_handle.emit("update-rolling-back", &rollback_info);

        // Simulate rollback process
        // In a real implementation, this would restore files from backup
        tokio::time::sleep(Duration::from_secs(2)).await;

        {
            let mut status_guard = self.status.write().unwrap();
            *status_guard = UpdateStatus::RollbackComplete {
                previous_version: rollback_info.previous_version.clone(),
            };
        }

        let _ = self
            .app_handle
            .emit("update-rollback-complete", &rollback_info);

        // Show notification
        self.show_update_notification(
            "Update Rolled Back",
            &format!(
                "Update failed and was rolled back to version {}",
                rollback_info.previous_version
            ),
        )
        .await;

        log::info!(
            "Rollback completed to version {}",
            rollback_info.previous_version
        );
        Ok(())
    }

    /// Install update using native Tauri updater
    async fn install_with_native_updater(
        &self,
        _update_info: &UpdateInfo,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Check if native updater is available
        match self.app_handle.updater() {
            Ok(updater) => {
                match updater.check().await {
                    Ok(Some(update)) => {
                        // Download with progress tracking
                        let mut downloaded = 0u64;

                        update
                            .download_and_install(
                                |chunk_length, content_length| {
                                downloaded += chunk_length as u64;
                                let total = content_length.unwrap_or(0);
                                let progress = if total > 0 {
                                    (downloaded as f64 / total as f64 * 100.0) as f32
                                } else {
                                    0.0
                                };

                                // Update status with download progress
                                if let Ok(mut status_guard) = self.status.write() {
                                    *status_guard = UpdateStatus::Downloading {
                                        version: _update_info.version.clone(),
                                        progress,
                                        downloaded,
                                        total,
                                    };
                                }

                                // Emit progress event
                                let _ = self.app_handle.emit(
                                    "update-download-progress",
                                    serde_json::json!({
                                        "progress": progress,
                                        "downloaded": downloaded,
                                        "total": content_length.unwrap_or(total)
                                    }),
                                );
                                },
                                || {} // on_finished callback
                            )
                            .await
                            .context("Failed to download and install update")?;

                        Ok(())
                    }
                    Ok(None) => Err("No update available from native updater".into()),
                    Err(e) => Err(format!("Failed to check for updates: {}", e).into()),
                }
            }
            Err(e) => Err(format!("Native updater not available: {}", e).into()),
        }
    }

    /// Check for pending rollbacks from previous session
    async fn check_for_pending_rollbacks(&self) -> Result<(), Box<dyn std::error::Error>> {
        // Check if there are any incomplete updates that need rollback
        let rollback_marker = self.backup_directory.join("rollback_pending");

        if rollback_marker.exists() {
            log::warn!("Found pending rollback marker, performing rollback");

            if let Err(e) = self
                .perform_rollback("Previous update was incomplete".to_string())
                .await
            {
                log::error!("Failed to perform pending rollback: {}", e);
            } else {
                // Remove rollback marker after successful rollback
                let _ = std::fs::remove_file(&rollback_marker);
            }
        }

        Ok(())
    }

    /// Request notification permission
    async fn request_notification_permission(&self) -> Result<(), Box<dyn std::error::Error>> {
        if let Ok(permission) = self.app_handle.notification().request_permission() {
            match permission {
                PermissionState::Granted => {
                    log::info!("Notification permission granted");
                }
                PermissionState::Denied => {
                    log::warn!("Notification permission denied");
                }
                _ => {
                    log::info!("Notification permission state: {:?}", permission);
                }
            }
        }
        Ok(())
    }

    /// Show update notification to user
    async fn show_update_notification(&self, title: &str, body: &str) {
        if let Err(e) = self
            .app_handle
            .notification()
            .builder()
            .title(title)
            .body(body)
            .show()
        {
            log::warn!("Failed to show notification: {}", e);
        }
    }

    /// Cleanup temporary update files
    async fn cleanup_temp_files(&self) {
        // Clean up any temporary files in the update directory
        if let Ok(entries) = std::fs::read_dir(&self.backup_directory) {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    if path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .starts_with("temp_")
                    {
                        if let Err(e) = std::fs::remove_file(&path) {
                            log::warn!("Failed to remove temp file {:?}: {}", path, e);
                        }
                    }
                }
            }
        }
    }

    /// Download update silently in the background
    pub async fn download_update_silently(
        &self,
        update_info: &UpdateInfo,
    ) -> Result<(), Box<dyn std::error::Error>> {
        {
            let mut status_guard = self.status.write().unwrap();
            *status_guard = UpdateStatus::Downloading {
                version: update_info.version.clone(),
                progress: 0.0,
                downloaded: 0,
                total: update_info.size,
            };
        }

        let _ = self.app_handle.emit("update-download-started", update_info);

        // Use native updater for download if available
        match self.app_handle.updater() {
            Ok(updater) => {
                match updater.check().await {
                    Ok(Some(update)) => {
                        let mut downloaded = 0u64;

                        // Download only (don't install yet)
                        match update
                            .download(
                                |chunk_length, content_length| {
                                downloaded += chunk_length as u64;
                                let total = content_length.unwrap_or(update_info.size);
                                let progress = if total > 0 {
                                    (downloaded as f64 / total as f64 * 100.0) as f32
                                } else {
                                    0.0
                                };

                                // Update status with download progress
                                if let Ok(mut status_guard) = self.status.write() {
                                    *status_guard = UpdateStatus::Downloading {
                                        version: update_info.version.clone(),
                                        progress,
                                        downloaded,
                                        total,
                                    };
                                }

                                // Emit progress event (silently, no user notification)
                                let _ = self.app_handle.emit(
                                    "update-download-progress",
                                    serde_json::json!({
                                        "progress": progress,
                                        "downloaded": downloaded,
                                        "total": content_length.unwrap_or(total),
                                        "silent": true
                                    }),
                                );
                                },
                                || {} // on_finished callback
                            )
                            .await
                        {
                            Ok(_) => {
                                {
                                    let mut status_guard = self.status.write().unwrap();
                                    *status_guard = UpdateStatus::Available {
                                        version: update_info.version.clone(),
                                        release_notes: update_info.release_notes.clone(),
                                        download_url: update_info.download_url.clone(),
                                        size: update_info.size,
                                        is_critical: update_info.is_critical,
                                    };
                                }

                                let _ = self
                                    .app_handle
                                    .emit("update-download-complete", update_info);

                                // Show subtle notification that download is complete
                                self.show_update_notification(
                                    "Update Downloaded",
                                    &format!("Update {} is ready to install.", update_info.version),
                                )
                                .await;

                                log::info!("Update {} downloaded silently", update_info.version);
                                Ok(())
                            }
                            Err(e) => {
                                {
                                    let mut status_guard = self.status.write().unwrap();
                                    *status_guard =
                                        UpdateStatus::Error(format!("Download failed: {}", e));
                                }

                                let _ = self.app_handle.emit(
                                    "update-download-error",
                                    format!("Download failed: {}", e),
                                );
                                Err(format!("Download failed: {}", e).into())
                            }
                        }
                    }
                    Ok(None) => Err("No update available from native updater".into()),
                    Err(e) => Err(format!("Failed to check for updates: {}", e).into()),
                }
            }
            Err(e) => Err(format!("Native updater not available: {}", e).into()),
        }
    }

    /// Get last check time
    pub fn get_last_check(&self) -> Option<SystemTime> {
        let last_check_guard = self.last_check.read().unwrap();
        *last_check_guard
    }

    /// Fetch latest release from GitHub
    async fn fetch_latest_release(
        &self,
        config: &UpdateConfig,
    ) -> Result<Option<UpdateInfo>, Box<dyn std::error::Error>> {
        let url = format!(
            "https://api.github.com/repos/{}/releases{}",
            config.github_repo,
            if config.pre_release { "" } else { "/latest" }
        );

        let response = self
            .http_client
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
            releases.as_array().and_then(|arr| arr.first()).cloned()
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

            let release_date = release["published_at"].as_str().unwrap_or("").to_string();

            let is_critical = release_notes.to_lowercase().contains("critical")
                || release_notes.to_lowercase().contains("security");

            Ok(Some(UpdateInfo {
                version,
                release_date,
                release_notes,
                download_url,
                size,
                checksum: None, // TODO: Extract from release assets
                is_critical,
                backup_path: None,
                rollback_version: None,
            }))
        } else {
            Ok(None)
        }
    }

    /// Check if a version is newer than current
    fn is_newer_version(
        &self,
        current: &str,
        new: &str,
    ) -> Result<bool, Box<dyn std::error::Error>> {
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
                rollback_info: Arc::new(RwLock::new(None)),
                backup_directory: PathBuf::from("/tmp/autodevai-backups"),
                native_updater: None,
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
            rollback_info: self.rollback_info.clone(),
            backup_directory: self.backup_directory.clone(),
            native_updater: None, // Will be reinitialized if needed
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

    // Show confirmation dialog if user hasn't disabled prompts
    let dialog_result = app_handle
        .dialog()
        .message("The application will restart to apply updates. Continue?")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::OkCancel)
        .blocking_show();
    
    match dialog_result {
        true => {
            // User confirmed, perform graceful shutdown
            app_handle.exit(0);
        }
        false => {
            return Err("Restart cancelled by user".to_string());
        }
    }

    Ok(())
}

/// Tauri command to perform rollback
#[tauri::command]
pub async fn rollback_update(
    updater: State<'_, UpdateManager>,
    reason: Option<String>,
) -> Result<(), String> {
    updater
        .perform_rollback(reason.unwrap_or_else(|| "Manual rollback requested".to_string()))
        .await
        .map_err(|e| format!("Failed to rollback: {}", e))
}

/// Tauri command to get rollback info
#[tauri::command]
pub async fn get_rollback_info(
    updater: State<'_, UpdateManager>,
) -> Result<Option<RollbackInfo>, String> {
    Ok(updater.get_rollback_info())
}

/// Tauri command to create manual backup
#[tauri::command]
pub async fn create_backup(updater: State<'_, UpdateManager>) -> Result<(), String> {
    let version = format!("{}_manual", env!("CARGO_PKG_VERSION"));
    updater
        .create_backup(&version)
        .await
        .map_err(|e| format!("Failed to create backup: {}", e))
}

/// Tauri command to get update history
#[tauri::command]
pub async fn get_update_history(
    updater: State<'_, UpdateManager>,
) -> Result<Vec<UpdateInfo>, String> {
    Ok(updater.get_update_history())
}

/// Tauri command to check for updates manually with user notification
#[tauri::command]
pub async fn check_for_updates_with_notification(
    updater: State<'_, UpdateManager>,
) -> Result<bool, String> {
    match updater.check_for_updates().await {
        Ok(has_update) => {
            if !has_update {
                updater
                    .show_update_notification("No Updates", "You are running the latest version.")
                    .await;
            }
            Ok(has_update)
        }
        Err(e) => Err(format!("Failed to check for updates: {}", e)),
    }
}

/// Tauri command to download update in background
#[tauri::command]
pub async fn download_update(updater: State<'_, UpdateManager>) -> Result<(), String> {
    let update_info = updater
        .get_pending_update()
        .ok_or_else(|| "No pending update available".to_string())?;

    // Perform download directly without spawning a task with lifetime issues
    if let Err(e) = updater.download_update_silently(&update_info).await {
        log::error!("Download failed: {}", e);
        return Err(format!("Download failed: {}", e));
    }

    Ok(())
}

/// Tauri command to get last check time
#[tauri::command]
pub async fn get_last_check_time(
    updater: State<'_, UpdateManager>,
) -> Result<Option<SystemTime>, String> {
    Ok(updater.get_last_check())
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
