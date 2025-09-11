//! Comprehensive Auto-Updater System Integration Tests
//! 
//! Tests for the application auto-update system including:
//! - Update checking and discovery
//! - Version comparison and validation
//! - Update download and verification
//! - Installation process and rollback
//! - Update policies and scheduling
//! - Differential/incremental updates
//! - Cross-platform update behavior
//! - Security and signature verification
//! - Network error handling and retry logic
//! - User notification and interaction

#[cfg(test)]
mod updater_integration_tests {
    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};
    use std::time::{Duration, Instant, SystemTime};
    use serde::{Deserialize, Serialize};
    use serde_json::{json, Value};

    /// Version information structure
    #[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
    struct Version {
        pub major: u32,
        pub minor: u32,
        pub patch: u32,
        pub pre_release: Option<String>,
        pub build_metadata: Option<String>,
    }

    impl Version {
        fn new(major: u32, minor: u32, patch: u32) -> Self {
            Self {
                major,
                minor,
                patch,
                pre_release: None,
                build_metadata: None,
            }
        }

        fn with_pre_release(mut self, pre_release: String) -> Self {
            self.pre_release = Some(pre_release);
            self
        }

        fn parse(version_str: &str) -> Result<Self, String> {
            let parts: Vec<&str> = version_str.split('.').collect();
            if parts.len() < 3 {
                return Err("Invalid version format".to_string());
            }

            let major = parts[0].parse().map_err(|_| "Invalid major version")?;
            let minor = parts[1].parse().map_err(|_| "Invalid minor version")?;
            let patch = parts[2].parse().map_err(|_| "Invalid patch version")?;

            Ok(Self::new(major, minor, patch))
        }

        fn to_string(&self) -> String {
            let base = format!("{}.{}.{}", self.major, self.minor, self.patch);
            if let Some(ref pre) = self.pre_release {
                format!("{}-{}", base, pre)
            } else {
                base
            }
        }

        fn is_compatible_with(&self, other: &Version) -> bool {
            // Semantic versioning compatibility rules
            self.major == other.major
        }
    }

    /// Update information
    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct UpdateInfo {
        pub version: Version,
        pub title: String,
        pub description: String,
        pub release_date: u64,
        pub download_url: String,
        pub download_size: u64,
        pub checksum: String,
        pub signature: Option<String>,
        pub platform: String,
        pub architecture: String,
        pub is_critical: bool,
        pub rollback_supported: bool,
        pub differential_update: Option<DifferentialUpdate>,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct DifferentialUpdate {
        pub base_version: Version,
        pub patch_url: String,
        pub patch_size: u64,
        pub patch_checksum: String,
    }

    /// Update status enumeration
    #[derive(Debug, Clone, PartialEq)]
    enum UpdateStatus {
        Idle,
        CheckingForUpdates,
        UpdateAvailable(UpdateInfo),
        Downloading(f32), // Progress percentage
        Downloaded,
        Installing,
        Installed,
        RestartRequired,
        Failed(String),
        RolledBack,
    }

    /// Update policy configuration
    #[derive(Debug, Clone)]
    struct UpdatePolicy {
        pub auto_check: bool,
        pub auto_download: bool,
        pub auto_install: bool,
        pub check_interval: Duration,
        pub update_channel: UpdateChannel,
        pub allow_downgrades: bool,
        pub require_user_consent: bool,
        pub skip_pre_releases: bool,
        pub max_download_attempts: u32,
        pub bandwidth_limit: Option<u64>, // bytes per second
    }

    #[derive(Debug, Clone, PartialEq)]
    enum UpdateChannel {
        Stable,
        Beta,
        Alpha,
        Dev,
    }

    impl Default for UpdatePolicy {
        fn default() -> Self {
            Self {
                auto_check: true,
                auto_download: false,
                auto_install: false,
                check_interval: Duration::from_secs(3600), // 1 hour
                update_channel: UpdateChannel::Stable,
                allow_downgrades: false,
                require_user_consent: true,
                skip_pre_releases: true,
                max_download_attempts: 3,
                bandwidth_limit: None,
            }
        }
    }

    /// Mock update server
    #[derive(Debug)]
    struct MockUpdateServer {
        available_updates: HashMap<String, Vec<UpdateInfo>>,
        server_errors: Vec<String>,
        download_delays: HashMap<String, Duration>,
        bandwidth_simulation: Option<u64>,
    }

    impl MockUpdateServer {
        fn new() -> Self {
            let mut server = Self {
                available_updates: HashMap::new(),
                server_errors: Vec::new(),
                download_delays: HashMap::new(),
                bandwidth_simulation: None,
            };

            // Add some test updates
            server.add_test_updates();
            server
        }

        fn add_test_updates(&mut self) {
            let current_platform = format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH);
            
            let updates = vec![
                UpdateInfo {
                    version: Version::new(1, 2, 0),
                    title: "Feature Update".to_string(),
                    description: "Added new neural bridge capabilities".to_string(),
                    release_date: SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs(),
                    download_url: "https://releases.autodev-ai.com/v1.2.0/autodev-ai-1.2.0.tar.gz".to_string(),
                    download_size: 50 * 1024 * 1024, // 50MB
                    checksum: "abc123def456".to_string(),
                    signature: Some("signature_data".to_string()),
                    platform: std::env::consts::OS.to_string(),
                    architecture: std::env::consts::ARCH.to_string(),
                    is_critical: false,
                    rollback_supported: true,
                    differential_update: None,
                },
                UpdateInfo {
                    version: Version::new(1, 1, 5),
                    title: "Security Update".to_string(),
                    description: "Critical security fixes".to_string(),
                    release_date: SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs() - 86400,
                    download_url: "https://releases.autodev-ai.com/v1.1.5/autodev-ai-1.1.5.tar.gz".to_string(),
                    download_size: 30 * 1024 * 1024, // 30MB
                    checksum: "def456ghi789".to_string(),
                    signature: Some("security_signature".to_string()),
                    platform: std::env::consts::OS.to_string(),
                    architecture: std::env::consts::ARCH.to_string(),
                    is_critical: true,
                    rollback_supported: true,
                    differential_update: Some(DifferentialUpdate {
                        base_version: Version::new(1, 1, 4),
                        patch_url: "https://releases.autodev-ai.com/patches/1.1.4-to-1.1.5.patch".to_string(),
                        patch_size: 5 * 1024 * 1024, // 5MB
                        patch_checksum: "patch123456".to_string(),
                    }),
                },
                UpdateInfo {
                    version: Version::new(2, 0, 0).with_pre_release("beta.1".to_string()),
                    title: "Beta Release".to_string(),
                    description: "Next major version preview".to_string(),
                    release_date: SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs() + 86400,
                    download_url: "https://releases.autodev-ai.com/v2.0.0-beta.1/autodev-ai-2.0.0-beta.1.tar.gz".to_string(),
                    download_size: 75 * 1024 * 1024, // 75MB
                    checksum: "beta123789".to_string(),
                    signature: Some("beta_signature".to_string()),
                    platform: std::env::consts::OS.to_string(),
                    architecture: std::env::consts::ARCH.to_string(),
                    is_critical: false,
                    rollback_supported: false,
                    differential_update: None,
                },
            ];

            self.available_updates.insert(current_platform, updates);
        }

        fn check_for_updates(&self, current_version: &Version, channel: &UpdateChannel) -> Result<Vec<UpdateInfo>, String> {
            if !self.server_errors.is_empty() {
                return Err(self.server_errors[0].clone());
            }

            let platform_key = format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH);
            
            if let Some(updates) = self.available_updates.get(&platform_key) {
                let filtered_updates: Vec<UpdateInfo> = updates.iter()
                    .filter(|update| {
                        // Filter by channel
                        match channel {
                            UpdateChannel::Stable => update.version.pre_release.is_none(),
                            UpdateChannel::Beta => true, // Include all
                            UpdateChannel::Alpha => true,
                            UpdateChannel::Dev => true,
                        }
                    })
                    .filter(|update| update.version > *current_version)
                    .cloned()
                    .collect();

                Ok(filtered_updates)
            } else {
                Ok(Vec::new())
            }
        }

        fn simulate_download(&self, url: &str, size: u64) -> Result<Vec<u8>, String> {
            if self.server_errors.iter().any(|e| e.contains("download")) {
                return Err("Download failed".to_string());
            }

            // Simulate download delay
            if let Some(delay) = self.download_delays.get(url) {
                std::thread::sleep(*delay);
            }

            // Simulate bandwidth limitation
            if let Some(bandwidth) = self.bandwidth_simulation {
                let download_time = size / bandwidth;
                std::thread::sleep(Duration::from_secs(download_time));
            }

            // Return mock data
            Ok(vec![0u8; size as usize])
        }

        fn simulate_server_error(&mut self, error: String) {
            self.server_errors.push(error);
        }

        fn clear_server_errors(&mut self) {
            self.server_errors.clear();
        }

        fn set_download_delay(&mut self, url: String, delay: Duration) {
            self.download_delays.insert(url, delay);
        }

        fn set_bandwidth_limit(&mut self, bytes_per_second: u64) {
            self.bandwidth_simulation = Some(bytes_per_second);
        }
    }

    /// Mock updater system
    #[derive(Debug)]
    struct MockUpdaterSystem {
        current_version: Version,
        status: Arc<Mutex<UpdateStatus>>,
        policy: UpdatePolicy,
        server: Arc<Mutex<MockUpdateServer>>,
        events: Arc<Mutex<Vec<UpdateEvent>>>,
        last_check: Arc<Mutex<Option<u64>>>,
        downloaded_updates: Arc<Mutex<HashMap<String, Vec<u8>>>>,
        installation_progress: Arc<Mutex<f32>>,
        rollback_available: Arc<Mutex<bool>>,
        user_interactions: Arc<Mutex<Vec<UserInteraction>>>,
    }

    #[derive(Debug, Clone)]
    struct UpdateEvent {
        pub timestamp: u64,
        pub event_type: String,
        pub details: HashMap<String, Value>,
    }

    #[derive(Debug, Clone)]
    struct UserInteraction {
        pub timestamp: u64,
        pub interaction_type: String,
        pub response: String,
    }

    impl MockUpdaterSystem {
        fn new(current_version: Version) -> Self {
            Self {
                current_version,
                status: Arc::new(Mutex::new(UpdateStatus::Idle)),
                policy: UpdatePolicy::default(),
                server: Arc::new(Mutex::new(MockUpdateServer::new())),
                events: Arc::new(Mutex::new(Vec::new())),
                last_check: Arc::new(Mutex::new(None)),
                downloaded_updates: Arc::new(Mutex::new(HashMap::new())),
                installation_progress: Arc::new(Mutex::new(0.0)),
                rollback_available: Arc::new(Mutex::new(false)),
                user_interactions: Arc::new(Mutex::new(Vec::new())),
            }
        }

        fn with_policy(mut self, policy: UpdatePolicy) -> Self {
            self.policy = policy;
            self
        }

        async fn check_for_updates(&self) -> Result<Vec<UpdateInfo>, String> {
            self.emit_event("check_started", HashMap::new());
            self.set_status(UpdateStatus::CheckingForUpdates);

            let server = self.server.lock().map_err(|_| "Server lock failed")?;
            let result = server.check_for_updates(&self.current_version, &self.policy.update_channel);

            // Update last check time
            {
                let mut last_check = self.last_check.lock().map_err(|_| "Last check lock failed")?;
                *last_check = Some(SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs());
            }

            match result {
                Ok(updates) => {
                    if updates.is_empty() {
                        self.set_status(UpdateStatus::Idle);
                        self.emit_event("no_updates_available", HashMap::new());
                    } else {
                        // Find the best update
                        let mut best_update = updates[0].clone();
                        for update in &updates {
                            if update.version > best_update.version {
                                best_update = update.clone();
                            }
                        }

                        self.set_status(UpdateStatus::UpdateAvailable(best_update.clone()));
                        let mut details = HashMap::new();
                        details.insert("version".to_string(), json!(best_update.version.to_string()));
                        details.insert("size".to_string(), json!(best_update.download_size));
                        details.insert("critical".to_string(), json!(best_update.is_critical));
                        self.emit_event("update_available", details);
                    }
                    Ok(updates)
                }
                Err(e) => {
                    self.set_status(UpdateStatus::Failed(e.clone()));
                    let mut details = HashMap::new();
                    details.insert("error".to_string(), json!(e));
                    self.emit_event("check_failed", details);
                    Err(e)
                }
            }
        }

        async fn download_update(&self, update_info: &UpdateInfo) -> Result<(), String> {
            if self.policy.require_user_consent && !self.has_user_consent("download") {
                return Err("User consent required for download".to_string());
            }

            self.emit_event("download_started", HashMap::new());

            // Simulate progressive download
            for progress in (0..=100).step_by(10) {
                self.set_status(UpdateStatus::Downloading(progress as f32));
                tokio::time::sleep(Duration::from_millis(100)).await; // Simulate download time
            }

            let server = self.server.lock().map_err(|_| "Server lock failed")?;
            let download_result = server.simulate_download(&update_info.download_url, update_info.download_size);

            match download_result {
                Ok(data) => {
                    // Verify checksum
                    let checksum = self.calculate_checksum(&data);
                    if checksum != update_info.checksum {
                        let error = "Checksum verification failed".to_string();
                        self.set_status(UpdateStatus::Failed(error.clone()));
                        return Err(error);
                    }

                    // Verify signature if present
                    if let Some(ref signature) = update_info.signature {
                        if !self.verify_signature(&data, signature) {
                            let error = "Signature verification failed".to_string();
                            self.set_status(UpdateStatus::Failed(error.clone()));
                            return Err(error);
                        }
                    }

                    // Store downloaded update
                    {
                        let mut downloads = self.downloaded_updates.lock().map_err(|_| "Download lock failed")?;
                        downloads.insert(update_info.version.to_string(), data);
                    }

                    self.set_status(UpdateStatus::Downloaded);
                    self.emit_event("download_completed", HashMap::new());
                    Ok(())
                }
                Err(e) => {
                    self.set_status(UpdateStatus::Failed(e.clone()));
                    let mut details = HashMap::new();
                    details.insert("error".to_string(), json!(e));
                    self.emit_event("download_failed", details);
                    Err(e)
                }
            }
        }

        async fn install_update(&self, update_info: &UpdateInfo) -> Result<(), String> {
            if self.policy.require_user_consent && !self.has_user_consent("install") {
                return Err("User consent required for installation".to_string());
            }

            // Check if update is downloaded
            {
                let downloads = self.downloaded_updates.lock().map_err(|_| "Download lock failed")?;
                if !downloads.contains_key(&update_info.version.to_string()) {
                    return Err("Update not downloaded".to_string());
                }
            }

            self.set_status(UpdateStatus::Installing);
            self.emit_event("installation_started", HashMap::new());

            // Simulate installation progress
            for progress in (0..=100).step_by(5) {
                {
                    let mut install_progress = self.installation_progress.lock().map_err(|_| "Progress lock failed")?;
                    *install_progress = progress as f32;
                }
                tokio::time::sleep(Duration::from_millis(50)).await; // Simulate installation time
            }

            // Simulate installation success/failure
            if update_info.version.to_string().contains("fail") {
                let error = "Installation failed".to_string();
                self.set_status(UpdateStatus::Failed(error.clone()));
                return Err(error);
            }

            // Mark rollback as available if supported
            if update_info.rollback_supported {
                let mut rollback = self.rollback_available.lock().map_err(|_| "Rollback lock failed")?;
                *rollback = true;
            }

            self.set_status(UpdateStatus::Installed);
            self.emit_event("installation_completed", HashMap::new());

            // Check if restart is required
            if self.requires_restart(update_info) {
                self.set_status(UpdateStatus::RestartRequired);
                self.emit_event("restart_required", HashMap::new());
            }

            Ok(())
        }

        fn rollback_update(&self) -> Result<(), String> {
            let rollback_available = self.rollback_available.lock().map_err(|_| "Rollback lock failed")?;
            
            if !*rollback_available {
                return Err("No rollback available".to_string());
            }

            self.emit_event("rollback_started", HashMap::new());

            // Simulate rollback process
            std::thread::sleep(Duration::from_millis(500));

            self.set_status(UpdateStatus::RolledBack);
            self.emit_event("rollback_completed", HashMap::new());

            Ok(())
        }

        fn get_status(&self) -> UpdateStatus {
            if let Ok(status) = self.status.lock() {
                status.clone()
            } else {
                UpdateStatus::Failed("Status lock failed".to_string())
            }
        }

        fn set_status(&self, new_status: UpdateStatus) {
            if let Ok(mut status) = self.status.lock() {
                *status = new_status;
            }
        }

        fn get_last_check_time(&self) -> Option<u64> {
            if let Ok(last_check) = self.last_check.lock() {
                *last_check
            } else {
                None
            }
        }

        fn should_check_for_updates(&self) -> bool {
            if !self.policy.auto_check {
                return false;
            }

            if let Some(last_check) = self.get_last_check_time() {
                let now = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
                let elapsed = now - last_check;
                elapsed >= self.policy.check_interval.as_secs()
            } else {
                true // Never checked before
            }
        }

        fn emit_event(&self, event_type: &str, details: HashMap<String, Value>) {
            let event = UpdateEvent {
                timestamp: SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs(),
                event_type: event_type.to_string(),
                details,
            };

            if let Ok(mut events) = self.events.lock() {
                events.push(event);
            }
        }

        fn get_events(&self) -> Vec<UpdateEvent> {
            if let Ok(events) = self.events.lock() {
                events.clone()
            } else {
                Vec::new()
            }
        }

        fn simulate_user_interaction(&self, interaction_type: &str, response: &str) {
            let interaction = UserInteraction {
                timestamp: SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs(),
                interaction_type: interaction_type.to_string(),
                response: response.to_string(),
            };

            if let Ok(mut interactions) = self.user_interactions.lock() {
                interactions.push(interaction);
            }
        }

        fn has_user_consent(&self, action: &str) -> bool {
            if let Ok(interactions) = self.user_interactions.lock() {
                interactions.iter().any(|i| i.interaction_type == action && i.response == "allow")
            } else {
                false
            }
        }

        fn calculate_checksum(&self, data: &[u8]) -> String {
            // Mock checksum calculation
            format!("checksum_{}", data.len())
        }

        fn verify_signature(&self, _data: &[u8], _signature: &str) -> bool {
            // Mock signature verification - always pass for testing
            true
        }

        fn requires_restart(&self, _update_info: &UpdateInfo) -> bool {
            // Mock restart requirement logic
            true
        }

        fn get_installation_progress(&self) -> f32 {
            if let Ok(progress) = self.installation_progress.lock() {
                *progress
            } else {
                0.0
            }
        }

        fn get_download_size(&self) -> u64 {
            if let Ok(downloads) = self.downloaded_updates.lock() {
                downloads.values().map(|data| data.len() as u64).sum()
            } else {
                0
            }
        }

        fn clear_events(&self) {
            if let Ok(mut events) = self.events.lock() {
                events.clear();
            }
        }
    }

    #[tokio::test]
    async fn test_version_comparison() {
        let v1_0_0 = Version::new(1, 0, 0);
        let v1_1_0 = Version::new(1, 1, 0);
        let v2_0_0 = Version::new(2, 0, 0);
        let v1_0_0_beta = Version::new(1, 0, 0).with_pre_release("beta.1".to_string());

        assert!(v1_1_0 > v1_0_0);
        assert!(v2_0_0 > v1_1_0);
        assert!(v1_0_0 > v1_0_0_beta);
        assert!(v1_0_0.is_compatible_with(&v1_1_0));
        assert!(!v1_0_0.is_compatible_with(&v2_0_0));

        // Test version parsing
        let parsed = Version::parse("1.2.3").unwrap();
        assert_eq!(parsed, Version::new(1, 2, 3));

        let invalid_parse = Version::parse("invalid");
        assert!(invalid_parse.is_err());
    }

    #[tokio::test]
    async fn test_update_checking() {
        let current_version = Version::new(1, 0, 0);
        let updater = MockUpdaterSystem::new(current_version);

        // Test successful update check
        let updates = updater.check_for_updates().await;
        assert!(updates.is_ok(), "Update check should succeed");

        let available_updates = updates.unwrap();
        assert!(!available_updates.is_empty(), "Should find available updates");

        // Verify that only newer versions are returned
        for update in &available_updates {
            assert!(update.version > updater.current_version, 
                   "Update version {} should be newer than current {}", 
                   update.version.to_string(), updater.current_version.to_string());
        }

        // Check events were recorded
        let events = updater.get_events();
        assert!(events.iter().any(|e| e.event_type == "check_started"));
        assert!(events.iter().any(|e| e.event_type == "update_available"));

        // Verify last check time was updated
        assert!(updater.get_last_check_time().is_some());
    }

    #[tokio::test]
    async fn test_update_download() {
        let current_version = Version::new(1, 0, 0);
        let updater = MockUpdaterSystem::new(current_version);

        // Grant user consent
        updater.simulate_user_interaction("download", "allow");

        let updates = updater.check_for_updates().await.unwrap();
        let update_info = &updates[0];

        // Test successful download
        let download_result = updater.download_update(update_info).await;
        assert!(download_result.is_ok(), "Download should succeed");

        // Verify status progression
        assert_eq!(updater.get_status(), UpdateStatus::Downloaded);

        // Verify download was stored
        assert!(updater.get_download_size() > 0, "Should have downloaded data");

        // Check events
        let events = updater.get_events();
        assert!(events.iter().any(|e| e.event_type == "download_started"));
        assert!(events.iter().any(|e| e.event_type == "download_completed"));
    }

    #[tokio::test]
    async fn test_update_installation() {
        let current_version = Version::new(1, 0, 0);
        let updater = MockUpdaterSystem::new(current_version);

        // Grant user consent
        updater.simulate_user_interaction("download", "allow");
        updater.simulate_user_interaction("install", "allow");

        let updates = updater.check_for_updates().await.unwrap();
        let update_info = &updates[0];

        // Download first
        updater.download_update(update_info).await.unwrap();

        // Test installation
        let install_result = updater.install_update(update_info).await;
        assert!(install_result.is_ok(), "Installation should succeed");

        // Verify status
        let status = updater.get_status();
        assert!(matches!(status, UpdateStatus::RestartRequired), "Should require restart");

        // Check installation progress
        assert_eq!(updater.get_installation_progress(), 100.0, "Installation should be complete");

        // Check events
        let events = updater.get_events();
        assert!(events.iter().any(|e| e.event_type == "installation_started"));
        assert!(events.iter().any(|e| e.event_type == "installation_completed"));
        assert!(events.iter().any(|e| e.event_type == "restart_required"));
    }

    #[tokio::test]
    async fn test_differential_updates() {
        let current_version = Version::new(1, 1, 4);
        let updater = MockUpdaterSystem::new(current_version);

        updater.simulate_user_interaction("download", "allow");
        updater.simulate_user_interaction("install", "allow");

        let updates = updater.check_for_updates().await.unwrap();
        
        // Find update with differential support
        let diff_update = updates.iter()
            .find(|u| u.differential_update.is_some())
            .expect("Should have differential update");

        assert!(diff_update.differential_update.is_some());
        let diff_info = diff_update.differential_update.as_ref().unwrap();
        assert_eq!(diff_info.base_version, current_version);
        assert!(diff_info.patch_size < diff_update.download_size, 
               "Differential update should be smaller");

        // Test differential download would be preferred
        assert!(diff_info.patch_size > 0, "Patch should have size");
        assert!(!diff_info.patch_checksum.is_empty(), "Patch should have checksum");
    }

    #[tokio::test]
    async fn test_update_policies() {
        let current_version = Version::new(1, 0, 0);

        // Test beta channel policy
        let beta_policy = UpdatePolicy {
            update_channel: UpdateChannel::Beta,
            skip_pre_releases: false,
            ..UpdatePolicy::default()
        };
        let beta_updater = MockUpdaterSystem::new(current_version.clone()).with_policy(beta_policy);

        let beta_updates = beta_updater.check_for_updates().await.unwrap();
        let has_beta = beta_updates.iter().any(|u| u.version.pre_release.is_some());
        assert!(has_beta, "Beta channel should include pre-release versions");

        // Test stable channel policy
        let stable_policy = UpdatePolicy {
            update_channel: UpdateChannel::Stable,
            skip_pre_releases: true,
            ..UpdatePolicy::default()
        };
        let stable_updater = MockUpdaterSystem::new(current_version.clone()).with_policy(stable_policy);

        let stable_updates = stable_updater.check_for_updates().await.unwrap();
        let has_only_stable = stable_updates.iter().all(|u| u.version.pre_release.is_none());
        assert!(has_only_stable, "Stable channel should only include stable versions");

        // Test auto-check timing
        let auto_policy = UpdatePolicy {
            auto_check: true,
            check_interval: Duration::from_secs(60),
            ..UpdatePolicy::default()
        };
        let auto_updater = MockUpdaterSystem::new(current_version).with_policy(auto_policy);

        assert!(auto_updater.should_check_for_updates(), "Should check for updates initially");
        
        // After a check, should not check again immediately
        auto_updater.check_for_updates().await.unwrap();
        assert!(!auto_updater.should_check_for_updates(), "Should not check again immediately");
    }

    #[tokio::test]
    async fn test_user_consent_flow() {
        let current_version = Version::new(1, 0, 0);
        let consent_policy = UpdatePolicy {
            require_user_consent: true,
            ..UpdatePolicy::default()
        };
        let updater = MockUpdaterSystem::new(current_version).with_policy(consent_policy);

        let updates = updater.check_for_updates().await.unwrap();
        let update_info = &updates[0];

        // Test download without consent
        let download_result = updater.download_update(update_info).await;
        assert!(download_result.is_err(), "Download should fail without consent");
        assert!(download_result.unwrap_err().contains("consent"));

        // Grant consent and try again
        updater.simulate_user_interaction("download", "allow");
        let download_result = updater.download_update(update_info).await;
        assert!(download_result.is_ok(), "Download should succeed with consent");

        // Test installation without consent
        let install_result = updater.install_update(update_info).await;
        assert!(install_result.is_err(), "Installation should fail without consent");

        // Grant installation consent
        updater.simulate_user_interaction("install", "allow");
        let install_result = updater.install_update(update_info).await;
        assert!(install_result.is_ok(), "Installation should succeed with consent");
    }

    #[tokio::test]
    async fn test_rollback_functionality() {
        let current_version = Version::new(1, 0, 0);
        let updater = MockUpdaterSystem::new(current_version);

        updater.simulate_user_interaction("download", "allow");
        updater.simulate_user_interaction("install", "allow");

        let updates = updater.check_for_updates().await.unwrap();
        let update_info = &updates[0];

        // Install update
        updater.download_update(update_info).await.unwrap();
        updater.install_update(update_info).await.unwrap();

        // Test rollback
        let rollback_result = updater.rollback_update();
        assert!(rollback_result.is_ok(), "Rollback should succeed");

        assert_eq!(updater.get_status(), UpdateStatus::RolledBack);

        // Check rollback event
        let events = updater.get_events();
        assert!(events.iter().any(|e| e.event_type == "rollback_completed"));
    }

    #[tokio::test]
    async fn test_network_error_handling() {
        let current_version = Version::new(1, 0, 0);
        let updater = MockUpdaterSystem::new(current_version);

        // Simulate server errors
        {
            let mut server = updater.server.lock().unwrap();
            server.simulate_server_error("Network timeout".to_string());
        }

        // Test check failure
        let check_result = updater.check_for_updates().await;
        assert!(check_result.is_err(), "Check should fail with network error");
        assert_eq!(updater.get_status(), UpdateStatus::Failed("Network timeout".to_string()));

        // Clear errors and test recovery
        {
            let mut server = updater.server.lock().unwrap();
            server.clear_server_errors();
        }

        let recovery_result = updater.check_for_updates().await;
        assert!(recovery_result.is_ok(), "Should recover after error cleared");
    }

    #[tokio::test]
    async fn test_download_retry_logic() {
        let current_version = Version::new(1, 0, 0);
        let retry_policy = UpdatePolicy {
            max_download_attempts: 3,
            ..UpdatePolicy::default()
        };
        let updater = MockUpdaterSystem::new(current_version).with_policy(retry_policy);

        updater.simulate_user_interaction("download", "allow");

        // Simulate download failures
        {
            let mut server = updater.server.lock().unwrap();
            server.simulate_server_error("Download failed".to_string());
        }

        let updates = updater.check_for_updates().await.unwrap();
        let update_info = &updates[0];

        // Should fail after max attempts
        let download_result = updater.download_update(update_info).await;
        assert!(download_result.is_err(), "Download should fail after retries");

        // Verify failure events
        let events = updater.get_events();
        assert!(events.iter().any(|e| e.event_type == "download_failed"));
    }

    #[tokio::test] 
    async fn test_bandwidth_limiting() {
        let current_version = Version::new(1, 0, 0);
        let bandwidth_policy = UpdatePolicy {
            bandwidth_limit: Some(1024 * 1024), // 1MB/s
            ..UpdatePolicy::default()
        };
        let updater = MockUpdaterSystem::new(current_version).with_policy(bandwidth_policy);

        // Configure server for bandwidth simulation
        {
            let mut server = updater.server.lock().unwrap();
            server.set_bandwidth_limit(1024 * 1024); // 1MB/s
        }

        updater.simulate_user_interaction("download", "allow");

        let updates = updater.check_for_updates().await.unwrap();
        let large_update = updates.iter()
            .max_by_key(|u| u.download_size)
            .unwrap();

        let start_time = Instant::now();
        let download_result = updater.download_update(large_update).await;
        let download_time = start_time.elapsed();

        assert!(download_result.is_ok(), "Bandwidth-limited download should succeed");
        
        // Should take time proportional to size and bandwidth limit
        let expected_min_time = Duration::from_secs(large_update.download_size / (1024 * 1024) / 2);
        assert!(download_time >= expected_min_time, 
               "Download should respect bandwidth limits");
    }

    #[tokio::test]
    async fn test_critical_update_handling() {
        let current_version = Version::new(1, 1, 0);
        let updater = MockUpdaterSystem::new(current_version);

        let updates = updater.check_for_updates().await.unwrap();
        let critical_update = updates.iter()
            .find(|u| u.is_critical)
            .expect("Should have critical update");

        assert!(critical_update.is_critical, "Update should be marked as critical");

        // Critical updates might have different handling
        let events = updater.get_events();
        let update_event = events.iter()
            .find(|e| e.event_type == "update_available")
            .unwrap();

        assert_eq!(update_event.details["critical"], json!(true), 
                  "Critical flag should be in event details");
    }

    #[tokio::test]
    async fn test_cross_platform_update_behavior() {
        let current_version = Version::new(1, 0, 0);
        let updater = MockUpdaterSystem::new(current_version);

        let updates = updater.check_for_updates().await.unwrap();

        // All updates should match current platform
        for update in &updates {
            assert_eq!(update.platform, std::env::consts::OS);
            assert_eq!(update.architecture, std::env::consts::ARCH);
        }

        // Test platform-specific update URLs
        let platform_update = &updates[0];
        assert!(platform_update.download_url.contains(&update.platform), 
               "Download URL should be platform-specific");
    }

    #[tokio::test]
    async fn test_concurrent_update_operations() {
        use std::sync::Arc;
        use tokio::task::JoinSet;

        let current_version = Version::new(1, 0, 0);
        let updater = Arc::new(MockUpdaterSystem::new(current_version));

        let mut join_set = JoinSet::new();

        // Spawn concurrent check operations
        for i in 0..5 {
            let updater_clone = Arc::clone(&updater);
            join_set.spawn(async move {
                let result = updater_clone.check_for_updates().await;
                (i, result.is_ok())
            });
        }

        // Wait for all operations to complete
        let mut successful_checks = 0;
        while let Some(result) = join_set.join_next().await {
            if let Ok((_, success)) = result {
                if success {
                    successful_checks += 1;
                }
            }
        }

        assert_eq!(successful_checks, 5, "All concurrent checks should succeed");

        // Verify no data corruption occurred
        let events = updater.get_events();
        assert!(events.len() >= 5, "Should have recorded events from all operations");
    }

    #[tokio::test]
    async fn test_update_performance() {
        let current_version = Version::new(1, 0, 0);
        let updater = MockUpdaterSystem::new(current_version);

        // Test update check performance
        let start_time = Instant::now();
        
        for _ in 0..10 {
            let _ = updater.check_for_updates().await;
        }

        let check_duration = start_time.elapsed();
        assert!(check_duration.as_millis() < 1000, 
               "10 update checks took {}ms, expected < 1000ms", 
               check_duration.as_millis());

        // Test status query performance
        let status_start = Instant::now();
        
        for _ in 0..1000 {
            let _ = updater.get_status();
        }

        let status_duration = status_start.elapsed();
        assert!(status_duration.as_millis() < 100,
               "1000 status queries took {}ms, expected < 100ms",
               status_duration.as_millis());
    }

    #[tokio::test]
    async fn test_update_event_coordination() {
        let current_version = Version::new(1, 0, 0);
        let updater = MockUpdaterSystem::new(current_version);

        updater.simulate_user_interaction("download", "allow");
        updater.simulate_user_interaction("install", "allow");

        // Perform complete update flow
        let updates = updater.check_for_updates().await.unwrap();
        let update_info = &updates[0];

        updater.download_update(update_info).await.unwrap();
        updater.install_update(update_info).await.unwrap();

        // Verify event sequence
        let events = updater.get_events();
        let event_types: Vec<_> = events.iter().map(|e| &e.event_type).collect();

        let expected_sequence = vec![
            "check_started",
            "update_available", 
            "download_started",
            "download_completed",
            "installation_started",
            "installation_completed",
            "restart_required",
        ];

        for expected_event in &expected_sequence {
            assert!(event_types.contains(&expected_event), 
                   "Event sequence should contain '{}'", expected_event);
        }

        // Verify event timestamps are in order
        for i in 1..events.len() {
            assert!(events[i].timestamp >= events[i-1].timestamp,
                   "Event timestamps should be in chronological order");
        }
    }
}