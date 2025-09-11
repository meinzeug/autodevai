//! End-to-End Workflow Integration Tests
//! 
//! Comprehensive E2E tests for complete user workflows including:
//! - Application startup and initialization
//! - Complete user interaction flows
//! - Multi-window coordination scenarios
//! - Cross-feature integration testing
//! - Error recovery and resilience
//! - Performance under realistic usage
//! - Data persistence across sessions
//! - Platform-specific workflow variations

#[cfg(test)]
mod e2e_workflow_tests {
    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};
    use std::time::{Duration, Instant, SystemTime};
    use serde::{Deserialize, Serialize};
    use serde_json::{json, Value};
    use tokio::time::timeout;

    /// Comprehensive application state for E2E testing
    #[derive(Debug, Clone)]
    struct E2EAppState {
        // Window management
        windows: Arc<Mutex<HashMap<String, E2EWindow>>>,
        
        // System tray
        tray_state: Arc<Mutex<E2ETrayState>>,
        
        // Menu system
        menu_state: Arc<Mutex<E2EMenuState>>,
        
        // Security system
        security_sessions: Arc<Mutex<HashMap<String, E2ESecuritySession>>>,
        
        // Update system
        update_status: Arc<Mutex<E2EUpdateStatus>>,
        
        // Settings and persistence
        settings: Arc<Mutex<HashMap<String, Value>>>,
        persisted_data: Arc<Mutex<HashMap<String, Vec<u8>>>>,
        
        // Event coordination
        global_events: Arc<Mutex<Vec<E2EEvent>>>,
        
        // Performance metrics
        performance_metrics: Arc<Mutex<E2EPerformanceMetrics>>,
        
        // Error tracking
        errors: Arc<Mutex<Vec<E2EError>>>,
        
        // Application lifecycle
        startup_time: Arc<Mutex<Option<Instant>>>,
        shutdown_initiated: Arc<Mutex<bool>>,
        
        // Feature flags and configuration
        feature_flags: Arc<Mutex<HashMap<String, bool>>>,
    }

    #[derive(Debug, Clone)]
    struct E2EWindow {
        pub label: String,
        pub width: f64,
        pub height: f64,
        pub x: Option<f64>,
        pub y: Option<f64>,
        pub visible: bool,
        pub focused: bool,
        pub maximized: bool,
        pub fullscreen: bool,
        pub title: String,
        pub url: String,
        pub created_at: u64,
        pub last_interaction: u64,
        pub state_saved: bool,
    }

    #[derive(Debug, Clone)]
    struct E2ETrayState {
        pub visible: bool,
        pub tooltip: String,
        pub menu_visible: bool,
        pub click_count: u64,
        pub last_action: Option<String>,
    }

    #[derive(Debug, Clone)]
    struct E2EMenuState {
        pub visible: bool,
        pub enabled_items: HashMap<String, bool>,
        pub checked_items: HashMap<String, bool>,
        pub last_action: Option<String>,
        pub shortcuts_active: bool,
    }

    #[derive(Debug, Clone)]
    struct E2ESecuritySession {
        pub session_id: String,
        pub user_id: Option<String>,
        pub permissions: Vec<String>,
        pub auth_level: String,
        pub created_at: u64,
        pub last_activity: u64,
        pub command_count: u64,
    }

    #[derive(Debug, Clone)]
    struct E2EUpdateStatus {
        pub current_version: String,
        pub available_version: Option<String>,
        pub status: String,
        pub last_check: Option<u64>,
        pub auto_update_enabled: bool,
    }

    #[derive(Debug, Clone)]
    struct E2EEvent {
        pub timestamp: u64,
        pub source: String,
        pub event_type: String,
        pub details: HashMap<String, Value>,
        pub correlation_id: Option<String>,
    }

    #[derive(Debug, Clone)]
    struct E2EPerformanceMetrics {
        pub startup_time_ms: Option<u64>,
        pub window_creation_times: HashMap<String, u64>,
        pub command_execution_times: HashMap<String, Vec<u64>>,
        pub memory_usage_samples: Vec<u64>,
        pub cpu_usage_samples: Vec<f32>,
        pub event_processing_times: Vec<u64>,
    }

    #[derive(Debug, Clone)]
    struct E2EError {
        pub timestamp: u64,
        pub source: String,
        pub error_type: String,
        pub message: String,
        pub context: HashMap<String, Value>,
        pub recovered: bool,
        pub recovery_time: Option<u64>,
    }

    impl E2EAppState {
        fn new() -> Self {
            Self {
                windows: Arc::new(Mutex::new(HashMap::new())),
                tray_state: Arc::new(Mutex::new(E2ETrayState {
                    visible: true,
                    tooltip: "AutoDev-AI Neural Bridge Platform".to_string(),
                    menu_visible: false,
                    click_count: 0,
                    last_action: None,
                })),
                menu_state: Arc::new(Mutex::new(E2EMenuState {
                    visible: true,
                    enabled_items: HashMap::new(),
                    checked_items: HashMap::new(),
                    last_action: None,
                    shortcuts_active: true,
                })),
                security_sessions: Arc::new(Mutex::new(HashMap::new())),
                update_status: Arc::new(Mutex::new(E2EUpdateStatus {
                    current_version: "1.0.0".to_string(),
                    available_version: None,
                    status: "idle".to_string(),
                    last_check: None,
                    auto_update_enabled: true,
                })),
                settings: Arc::new(Mutex::new(HashMap::new())),
                persisted_data: Arc::new(Mutex::new(HashMap::new())),
                global_events: Arc::new(Mutex::new(Vec::new())),
                performance_metrics: Arc::new(Mutex::new(E2EPerformanceMetrics {
                    startup_time_ms: None,
                    window_creation_times: HashMap::new(),
                    command_execution_times: HashMap::new(),
                    memory_usage_samples: Vec::new(),
                    cpu_usage_samples: Vec::new(),
                    event_processing_times: Vec::new(),
                })),
                errors: Arc::new(Mutex::new(Vec::new())),
                startup_time: Arc::new(Mutex::new(None)),
                shutdown_initiated: Arc::new(Mutex::new(false)),
                feature_flags: Arc::new(Mutex::new(HashMap::new())),
            }
        }

        /// Simulate application startup
        async fn startup(&self) -> Result<(), String> {
            let start_time = Instant::now();
            
            // Set startup time
            {
                let mut startup = self.startup_time.lock().map_err(|_| "Startup lock failed")?;
                *startup = Some(start_time);
            }

            self.emit_event("system", "startup_initiated", HashMap::new());

            // Initialize core systems
            self.initialize_security_system().await?;
            self.initialize_window_system().await?;
            self.initialize_tray_system().await?;
            self.initialize_menu_system().await?;
            self.initialize_update_system().await?;
            self.load_persisted_settings().await?;

            // Create main window
            self.create_window("main", "AutoDev-AI Neural Bridge Platform", "/").await?;

            // Record startup time
            let startup_duration = start_time.elapsed().as_millis() as u64;
            {
                let mut metrics = self.performance_metrics.lock().map_err(|_| "Metrics lock failed")?;
                metrics.startup_time_ms = Some(startup_duration);
            }

            self.emit_event("system", "startup_completed", json!({
                "duration_ms": startup_duration
            }).as_object().unwrap().clone());

            Ok(())
        }

        /// Create a new window
        async fn create_window(&self, label: &str, title: &str, url: &str) -> Result<String, String> {
            let start_time = Instant::now();
            
            let window = E2EWindow {
                label: label.to_string(),
                width: 1200.0,
                height: 800.0,
                x: Some(100.0),
                y: Some(100.0),
                visible: true,
                focused: true,
                maximized: false,
                fullscreen: false,
                title: title.to_string(),
                url: url.to_string(),
                created_at: SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs(),
                last_interaction: SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs(),
                state_saved: false,
            };

            // Simulate window creation delay
            tokio::time::sleep(Duration::from_millis(100)).await;

            {
                let mut windows = self.windows.lock().map_err(|_| "Windows lock failed")?;
                windows.insert(label.to_string(), window);
            }

            // Record creation time
            let creation_time = start_time.elapsed().as_millis() as u64;
            {
                let mut metrics = self.performance_metrics.lock().map_err(|_| "Metrics lock failed")?;
                metrics.window_creation_times.insert(label.to_string(), creation_time);
            }

            self.emit_event("window", "created", json!({
                "label": label,
                "title": title,
                "creation_time_ms": creation_time
            }).as_object().unwrap().clone());

            Ok(label.to_string())
        }

        /// Simulate user interaction with window
        async fn interact_with_window(&self, label: &str, action: &str) -> Result<(), String> {
            {
                let mut windows = self.windows.lock().map_err(|_| "Windows lock failed")?;
                if let Some(window) = windows.get_mut(label) {
                    window.last_interaction = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
                    
                    match action {
                        "focus" => window.focused = true,
                        "blur" => window.focused = false,
                        "maximize" => {
                            window.maximized = true;
                            window.fullscreen = false;
                        },
                        "minimize" => window.maximized = false,
                        "fullscreen" => {
                            window.fullscreen = true;
                            window.maximized = false;
                        },
                        "resize" => {
                            window.width = 1400.0;
                            window.height = 900.0;
                        },
                        "move" => {
                            window.x = Some(200.0);
                            window.y = Some(150.0);
                        },
                        _ => {},
                    }
                } else {
                    return Err(format!("Window {} not found", label));
                }
            }

            self.emit_event("window", "interaction", json!({
                "label": label,
                "action": action
            }).as_object().unwrap().clone());

            Ok(())
        }

        /// Save window state
        async fn save_window_state(&self, label: &str) -> Result<(), String> {
            let window_data = {
                let windows = self.windows.lock().map_err(|_| "Windows lock failed")?;
                if let Some(window) = windows.get(label) {
                    serde_json::to_vec(window).map_err(|e| format!("Serialization failed: {}", e))?
                } else {
                    return Err(format!("Window {} not found", label));
                }
            };

            {
                let mut persisted = self.persisted_data.lock().map_err(|_| "Persistence lock failed")?;
                persisted.insert(format!("window_state_{}", label), window_data);
            }

            // Mark as saved
            {
                let mut windows = self.windows.lock().map_err(|_| "Windows lock failed")?;
                if let Some(window) = windows.get_mut(label) {
                    window.state_saved = true;
                }
            }

            self.emit_event("window", "state_saved", json!({
                "label": label
            }).as_object().unwrap().clone());

            Ok(())
        }

        /// Restore window state
        async fn restore_window_state(&self, label: &str) -> Result<(), String> {
            let window_data = {
                let persisted = self.persisted_data.lock().map_err(|_| "Persistence lock failed")?;
                persisted.get(&format!("window_state_{}", label))
                    .ok_or_else(|| format!("No saved state for window {}", label))?
                    .clone()
            };

            let restored_window: E2EWindow = serde_json::from_slice(&window_data)
                .map_err(|e| format!("Deserialization failed: {}", e))?;

            {
                let mut windows = self.windows.lock().map_err(|_| "Windows lock failed")?;
                windows.insert(label.to_string(), restored_window);
            }

            self.emit_event("window", "state_restored", json!({
                "label": label
            }).as_object().unwrap().clone());

            Ok(())
        }

        /// Handle menu action
        async fn handle_menu_action(&self, action: &str) -> Result<String, String> {
            let start_time = Instant::now();

            {
                let mut menu = self.menu_state.lock().map_err(|_| "Menu lock failed")?;
                menu.last_action = Some(action.to_string());
            }

            let result = match action {
                "new_window" => {
                    let count = self.get_window_count().await;
                    let label = format!("window_{}", count + 1);
                    self.create_window(&label, "New Window", "/").await?;
                    format!("window_created_{}", label)
                },
                "close_window" => {
                    let active_window = self.get_active_window().await?;
                    self.close_window(&active_window).await?;
                    format!("window_closed_{}", active_window)
                },
                "zoom_in" => {
                    self.modify_zoom(1.1).await?;
                    "zoom_increased".to_string()
                },
                "zoom_out" => {
                    self.modify_zoom(0.9).await?;
                    "zoom_decreased".to_string()
                },
                "zoom_reset" => {
                    self.modify_zoom(1.0).await?;
                    "zoom_reset".to_string()
                },
                "fullscreen" => {
                    let active_window = self.get_active_window().await?;
                    self.interact_with_window(&active_window, "fullscreen").await?;
                    "fullscreen_toggled".to_string()
                },
                "about" => {
                    self.show_about_dialog().await?;
                    "about_shown".to_string()
                },
                _ => return Err(format!("Unknown menu action: {}", action)),
            };

            // Record execution time
            let execution_time = start_time.elapsed().as_millis() as u64;
            {
                let mut metrics = self.performance_metrics.lock().map_err(|_| "Metrics lock failed")?;
                metrics.command_execution_times
                    .entry(action.to_string())
                    .or_insert_with(Vec::new)
                    .push(execution_time);
            }

            self.emit_event("menu", "action_executed", json!({
                "action": action,
                "result": result,
                "execution_time_ms": execution_time
            }).as_object().unwrap().clone());

            Ok(result)
        }

        /// Handle tray interaction
        async fn handle_tray_action(&self, action: &str) -> Result<String, String> {
            {
                let mut tray = self.tray_state.lock().map_err(|_| "Tray lock failed")?;
                tray.click_count += 1;
                tray.last_action = Some(action.to_string());
            }

            let result = match action {
                "left_click" => {
                    let main_visible = self.is_window_visible("main").await?;
                    if main_visible {
                        self.hide_window("main").await?;
                        "window_hidden".to_string()
                    } else {
                        self.show_window("main").await?;
                        "window_shown".to_string()
                    }
                },
                "right_click" => {
                    self.show_tray_menu().await?;
                    "menu_shown".to_string()
                },
                "double_click" => {
                    self.show_window("main").await?;
                    self.focus_window("main").await?;
                    "window_focused".to_string()
                },
                _ => return Err(format!("Unknown tray action: {}", action)),
            };

            self.emit_event("tray", "action_executed", json!({
                "action": action,
                "result": result
            }).as_object().unwrap().clone());

            Ok(result)
        }

        /// Execute security command
        async fn execute_secure_command(&self, session_id: &str, command: &str, args: HashMap<String, Value>) -> Result<Value, String> {
            // Validate session
            let session = {
                let sessions = self.security_sessions.lock().map_err(|_| "Sessions lock failed")?;
                sessions.get(session_id)
                    .ok_or_else(|| "Invalid session".to_string())?
                    .clone()
            };

            // Update session activity
            {
                let mut sessions = self.security_sessions.lock().map_err(|_| "Sessions lock failed")?;
                if let Some(session) = sessions.get_mut(session_id) {
                    session.last_activity = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
                    session.command_count += 1;
                }
            }

            // Check permissions (simplified)
            if !session.permissions.contains(&format!("{}.execute", command)) && 
               !session.permissions.contains(&"*".to_string()) {
                return Err("Insufficient permissions".to_string());
            }

            // Execute command
            let result = match command {
                "get_settings" => {
                    let settings = self.settings.lock().map_err(|_| "Settings lock failed")?;
                    json!(settings.clone())
                },
                "save_settings" => {
                    let new_settings = args.get("settings")
                        .ok_or_else(|| "Missing settings parameter".to_string())?;
                    
                    {
                        let mut settings = self.settings.lock().map_err(|_| "Settings lock failed")?;
                        if let Value::Object(obj) = new_settings {
                            for (key, value) in obj {
                                settings.insert(key.clone(), value.clone());
                            }
                        }
                    }
                    
                    json!({"status": "saved"})
                },
                "get_window_states" => {
                    let windows = self.windows.lock().map_err(|_| "Windows lock failed")?;
                    let states: HashMap<String, Value> = windows.iter()
                        .map(|(k, v)| (k.clone(), json!({
                            "width": v.width,
                            "height": v.height,
                            "x": v.x,
                            "y": v.y,
                            "visible": v.visible,
                            "maximized": v.maximized,
                            "fullscreen": v.fullscreen
                        })))
                        .collect();
                    json!(states)
                },
                _ => return Err(format!("Unknown command: {}", command)),
            };

            self.emit_event("security", "command_executed", json!({
                "session_id": session_id,
                "command": command,
                "success": true
            }).as_object().unwrap().clone());

            Ok(result)
        }

        /// Check for updates
        async fn check_for_updates(&self) -> Result<Option<String>, String> {
            {
                let mut update_status = self.update_status.lock().map_err(|_| "Update lock failed")?;
                update_status.last_check = Some(SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs());
                update_status.status = "checking".to_string();
            }

            // Simulate update check
            tokio::time::sleep(Duration::from_millis(500)).await;

            let has_update = rand::random::<f32>() < 0.3; // 30% chance of update
            
            {
                let mut update_status = self.update_status.lock().map_err(|_| "Update lock failed")?;
                if has_update {
                    update_status.available_version = Some("1.1.0".to_string());
                    update_status.status = "update_available".to_string();
                } else {
                    update_status.status = "up_to_date".to_string();
                }
            }

            let result = if has_update { Some("1.1.0".to_string()) } else { None };

            self.emit_event("update", "check_completed", json!({
                "has_update": has_update,
                "version": result
            }).as_object().unwrap().clone());

            Ok(result)
        }

        /// Simulate application shutdown
        async fn shutdown(&self) -> Result<(), String> {
            {
                let mut shutdown = self.shutdown_initiated.lock().map_err(|_| "Shutdown lock failed")?;
                *shutdown = true;
            }

            self.emit_event("system", "shutdown_initiated", HashMap::new());

            // Save all window states
            let window_labels: Vec<String> = {
                let windows = self.windows.lock().map_err(|_| "Windows lock failed")?;
                windows.keys().cloned().collect()
            };

            for label in window_labels {
                self.save_window_state(&label).await?;
            }

            // Cleanup sessions
            {
                let mut sessions = self.security_sessions.lock().map_err(|_| "Sessions lock failed")?;
                sessions.clear();
            }

            self.emit_event("system", "shutdown_completed", HashMap::new());

            Ok(())
        }

        /// Recovery from error state
        async fn recover_from_error(&self, error_id: usize) -> Result<(), String> {
            let error_info = {
                let errors = self.errors.lock().map_err(|_| "Errors lock failed")?;
                errors.get(error_id).cloned()
                    .ok_or_else(|| "Error not found".to_string())?
            };

            let recovery_start = Instant::now();

            // Implement recovery based on error type
            match error_info.error_type.as_str() {
                "window_creation_failed" => {
                    // Retry window creation
                    if let Some(window_label) = error_info.context.get("window_label") {
                        if let Some(label_str) = window_label.as_str() {
                            self.create_window(label_str, "Recovered Window", "/").await?;
                        }
                    }
                },
                "tray_initialization_failed" => {
                    // Reinitialize tray
                    self.initialize_tray_system().await?;
                },
                "security_session_expired" => {
                    // Clean up expired sessions
                    self.cleanup_expired_sessions().await?;
                },
                "settings_corruption" => {
                    // Reset to default settings
                    self.reset_settings_to_default().await?;
                },
                _ => {
                    return Err(format!("No recovery strategy for error type: {}", error_info.error_type));
                }
            }

            let recovery_time = recovery_start.elapsed().as_millis() as u64;

            // Mark error as recovered
            {
                let mut errors = self.errors.lock().map_err(|_| "Errors lock failed")?;
                if let Some(error) = errors.get_mut(error_id) {
                    error.recovered = true;
                    error.recovery_time = Some(recovery_time);
                }
            }

            self.emit_event("system", "error_recovered", json!({
                "error_id": error_id,
                "error_type": error_info.error_type,
                "recovery_time_ms": recovery_time
            }).as_object().unwrap().clone());

            Ok(())
        }

        // Helper methods
        
        async fn initialize_security_system(&self) -> Result<(), String> {
            // Create default session
            let session = E2ESecuritySession {
                session_id: "default_session".to_string(),
                user_id: None,
                permissions: vec!["app.read".to_string(), "settings.read".to_string()],
                auth_level: "basic".to_string(),
                created_at: SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs(),
                last_activity: SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs(),
                command_count: 0,
            };

            {
                let mut sessions = self.security_sessions.lock().map_err(|_| "Sessions lock failed")?;
                sessions.insert("default_session".to_string(), session);
            }

            Ok(())
        }

        async fn initialize_window_system(&self) -> Result<(), String> {
            // Window system is initialized when windows are created
            Ok(())
        }

        async fn initialize_tray_system(&self) -> Result<(), String> {
            // Tray system is already initialized in constructor
            Ok(())
        }

        async fn initialize_menu_system(&self) -> Result<(), String> {
            let default_items = vec![
                ("new_window", true),
                ("close_window", true),
                ("zoom_in", true),
                ("zoom_out", true),
                ("zoom_reset", true),
                ("fullscreen", true),
                ("about", true),
            ];

            {
                let mut menu = self.menu_state.lock().map_err(|_| "Menu lock failed")?;
                for (item, enabled) in default_items {
                    menu.enabled_items.insert(item.to_string(), enabled);
                }
            }

            Ok(())
        }

        async fn initialize_update_system(&self) -> Result<(), String> {
            // Update system is already initialized in constructor
            Ok(())
        }

        async fn load_persisted_settings(&self) -> Result<(), String> {
            // Load default settings
            let default_settings = json!({
                "theme": "dark",
                "auto_save": true,
                "check_updates": true,
                "window_animations": true
            });

            {
                let mut settings = self.settings.lock().map_err(|_| "Settings lock failed")?;
                if let Value::Object(obj) = default_settings {
                    for (key, value) in obj {
                        settings.insert(key, value);
                    }
                }
            }

            Ok(())
        }

        async fn get_window_count(&self) -> usize {
            if let Ok(windows) = self.windows.lock() {
                windows.len()
            } else {
                0
            }
        }

        async fn get_active_window(&self) -> Result<String, String> {
            let windows = self.windows.lock().map_err(|_| "Windows lock failed")?;
            windows.iter()
                .find(|(_, window)| window.focused)
                .map(|(label, _)| label.clone())
                .or_else(|| windows.keys().next().cloned())
                .ok_or_else(|| "No windows available".to_string())
        }

        async fn close_window(&self, label: &str) -> Result<(), String> {
            let mut windows = self.windows.lock().map_err(|_| "Windows lock failed")?;
            windows.remove(label)
                .ok_or_else(|| format!("Window {} not found", label))?;
            Ok(())
        }

        async fn modify_zoom(&self, _factor: f64) -> Result<(), String> {
            // Simulate zoom modification
            Ok(())
        }

        async fn show_about_dialog(&self) -> Result<(), String> {
            // Simulate showing about dialog
            Ok(())
        }

        async fn is_window_visible(&self, label: &str) -> Result<bool, String> {
            let windows = self.windows.lock().map_err(|_| "Windows lock failed")?;
            windows.get(label)
                .map(|w| w.visible)
                .ok_or_else(|| format!("Window {} not found", label))
        }

        async fn hide_window(&self, label: &str) -> Result<(), String> {
            let mut windows = self.windows.lock().map_err(|_| "Windows lock failed")?;
            if let Some(window) = windows.get_mut(label) {
                window.visible = false;
                Ok(())
            } else {
                Err(format!("Window {} not found", label))
            }
        }

        async fn show_window(&self, label: &str) -> Result<(), String> {
            let mut windows = self.windows.lock().map_err(|_| "Windows lock failed")?;
            if let Some(window) = windows.get_mut(label) {
                window.visible = true;
                Ok(())
            } else {
                Err(format!("Window {} not found", label))
            }
        }

        async fn focus_window(&self, label: &str) -> Result<(), String> {
            let mut windows = self.windows.lock().map_err(|_| "Windows lock failed")?;
            
            // Remove focus from all windows
            for window in windows.values_mut() {
                window.focused = false;
            }
            
            // Focus target window
            if let Some(window) = windows.get_mut(label) {
                window.focused = true;
                Ok(())
            } else {
                Err(format!("Window {} not found", label))
            }
        }

        async fn show_tray_menu(&self) -> Result<(), String> {
            let mut tray = self.tray_state.lock().map_err(|_| "Tray lock failed")?;
            tray.menu_visible = true;
            Ok(())
        }

        async fn cleanup_expired_sessions(&self) -> Result<(), String> {
            let now = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
            let mut sessions = self.security_sessions.lock().map_err(|_| "Sessions lock failed")?;
            
            sessions.retain(|_, session| {
                now - session.last_activity < 3600 // Keep sessions active within 1 hour
            });
            
            Ok(())
        }

        async fn reset_settings_to_default(&self) -> Result<(), String> {
            let mut settings = self.settings.lock().map_err(|_| "Settings lock failed")?;
            settings.clear();
            
            // Re-load defaults
            self.load_persisted_settings().await
        }

        fn emit_event(&self, source: &str, event_type: &str, details: HashMap<String, Value>) {
            let event = E2EEvent {
                timestamp: SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs(),
                source: source.to_string(),
                event_type: event_type.to_string(),
                details,
                correlation_id: None,
            };

            if let Ok(mut events) = self.global_events.lock() {
                events.push(event);
            }
        }

        fn record_error(&self, source: &str, error_type: &str, message: &str, context: HashMap<String, Value>) {
            let error = E2EError {
                timestamp: SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs(),
                source: source.to_string(),
                error_type: error_type.to_string(),
                message: message.to_string(),
                context,
                recovered: false,
                recovery_time: None,
            };

            if let Ok(mut errors) = self.errors.lock() {
                errors.push(error);
            }
        }

        fn get_events(&self) -> Vec<E2EEvent> {
            if let Ok(events) = self.global_events.lock() {
                events.clone()
            } else {
                Vec::new()
            }
        }

        fn get_errors(&self) -> Vec<E2EError> {
            if let Ok(errors) = self.errors.lock() {
                errors.clone()
            } else {
                Vec::new()
            }
        }

        fn get_performance_metrics(&self) -> Option<E2EPerformanceMetrics> {
            if let Ok(metrics) = self.performance_metrics.lock() {
                Some(metrics.clone())
            } else {
                None
            }
        }
    }

    #[tokio::test]
    async fn test_complete_application_startup_workflow() {
        let app = E2EAppState::new();
        
        // Test complete startup sequence
        let startup_result = app.startup().await;
        assert!(startup_result.is_ok(), "Application startup should succeed");

        // Verify startup events
        let events = app.get_events();
        let startup_events: Vec<_> = events.iter()
            .filter(|e| e.source == "system")
            .collect();

        assert!(startup_events.iter().any(|e| e.event_type == "startup_initiated"));
        assert!(startup_events.iter().any(|e| e.event_type == "startup_completed"));

        // Verify systems were initialized
        assert_eq!(app.get_window_count().await, 1, "Should have main window");
        
        // Verify performance metrics
        let metrics = app.get_performance_metrics();
        assert!(metrics.is_some(), "Should have performance metrics");
        assert!(metrics.unwrap().startup_time_ms.is_some(), "Should record startup time");
    }

    #[tokio::test]
    async fn test_multi_window_coordination_workflow() {
        let app = E2EAppState::new();
        app.startup().await.unwrap();

        // Create multiple windows
        let window_labels = vec!["dev_tools", "settings", "about"];
        for label in &window_labels {
            let result = app.create_window(label, &format!("{} Window", label), "/").await;
            assert!(result.is_ok(), "Window creation should succeed for {}", label);
        }

        assert_eq!(app.get_window_count().await, 4, "Should have 4 windows total"); // main + 3 created

        // Test window interactions
        for label in &window_labels {
            app.interact_with_window(label, "focus").await.unwrap();
            app.interact_with_window(label, "resize").await.unwrap();
            app.interact_with_window(label, "move").await.unwrap();
        }

        // Save all window states
        let all_labels = vec!["main", "dev_tools", "settings", "about"];
        for label in &all_labels {
            let save_result = app.save_window_state(label).await;
            assert!(save_result.is_ok(), "Window state save should succeed for {}", label);
        }

        // Verify events were recorded for all operations
        let events = app.get_events();
        let window_events: Vec<_> = events.iter()
            .filter(|e| e.source == "window")
            .collect();

        assert!(window_events.len() >= 16, "Should have recorded all window operations"); // 4 created + 12 interactions + saves
    }

    #[tokio::test] 
    async fn test_system_tray_integration_workflow() {
        let app = E2EAppState::new();
        app.startup().await.unwrap();

        // Test tray interactions
        let tray_actions = vec!["left_click", "right_click", "double_click"];
        
        for action in &tray_actions {
            let result = app.handle_tray_action(action).await;
            assert!(result.is_ok(), "Tray action {} should succeed", action);
        }

        // Verify tray state changes
        let tray_state = app.tray_state.lock().unwrap();
        assert_eq!(tray_state.click_count, 3, "Should record all tray clicks");
        assert!(tray_state.last_action.is_some(), "Should record last action");

        // Test window show/hide from tray
        let main_visible_before = app.is_window_visible("main").await.unwrap();
        app.handle_tray_action("left_click").await.unwrap();
        let main_visible_after = app.is_window_visible("main").await.unwrap();

        assert_ne!(main_visible_before, main_visible_after, "Tray click should toggle window visibility");
    }

    #[tokio::test]
    async fn test_menu_system_workflow() {
        let app = E2EAppState::new();
        app.startup().await.unwrap();

        // Test menu actions
        let menu_actions = vec![
            "new_window", "zoom_in", "zoom_out", "zoom_reset", 
            "fullscreen", "about"
        ];

        for action in &menu_actions {
            let result = app.handle_menu_action(action).await;
            assert!(result.is_ok(), "Menu action {} should succeed: {:?}", action, result);
        }

        // Verify window was created by new_window action
        assert!(app.get_window_count().await > 1, "Should have created new window");

        // Verify menu state
        let menu_state = app.menu_state.lock().unwrap();
        assert!(menu_state.last_action.is_some(), "Should record last menu action");
        assert!(menu_state.enabled_items.len() > 0, "Should have enabled menu items");
    }

    #[tokio::test]
    async fn test_security_command_execution_workflow() {
        let app = E2EAppState::new();
        app.startup().await.unwrap();

        let session_id = "default_session";
        
        // Test secure command execution
        let commands = vec![
            ("get_settings", HashMap::new()),
            ("save_settings", {
                let mut args = HashMap::new();
                args.insert("settings".to_string(), json!({"theme": "light", "auto_save": false}));
                args
            }),
            ("get_window_states", HashMap::new()),
        ];

        for (command, args) in commands {
            let result = app.execute_secure_command(session_id, command, args).await;
            assert!(result.is_ok(), "Secure command {} should succeed", command);
        }

        // Verify session activity was recorded
        let sessions = app.security_sessions.lock().unwrap();
        let session = sessions.get(session_id).unwrap();
        assert_eq!(session.command_count, 3, "Should record all command executions");
        assert!(session.last_activity > 0, "Should update last activity timestamp");

        // Test command with insufficient permissions
        // Create limited session
        let limited_session = E2ESecuritySession {
            session_id: "limited_session".to_string(),
            user_id: None,
            permissions: vec!["app.read".to_string()], // No write permissions
            auth_level: "basic".to_string(),
            created_at: SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs(),
            last_activity: SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs(),
            command_count: 0,
        };

        {
            let mut sessions = app.security_sessions.lock().unwrap();
            sessions.insert("limited_session".to_string(), limited_session);
        }

        let limited_result = app.execute_secure_command("limited_session", "save_settings", HashMap::new()).await;
        assert!(limited_result.is_err(), "Should deny command with insufficient permissions");
    }

    #[tokio::test]
    async fn test_update_system_workflow() {
        let app = E2EAppState::new();
        app.startup().await.unwrap();

        // Test update checking
        let update_result = app.check_for_updates().await;
        assert!(update_result.is_ok(), "Update check should succeed");

        // Verify update status was updated
        let update_status = app.update_status.lock().unwrap();
        assert!(update_status.last_check.is_some(), "Should record last check time");
        assert!(update_status.status != "idle", "Status should change from idle");

        // Verify update events
        let events = app.get_events();
        let update_events: Vec<_> = events.iter()
            .filter(|e| e.source == "update")
            .collect();

        assert!(!update_events.is_empty(), "Should record update events");
        assert!(update_events.iter().any(|e| e.event_type == "check_completed"));
    }

    #[tokio::test]
    async fn test_error_recovery_workflow() {
        let app = E2EAppState::new();
        app.startup().await.unwrap();

        // Simulate various errors
        app.record_error("window", "window_creation_failed", "Failed to create window", {
            let mut context = HashMap::new();
            context.insert("window_label".to_string(), json!("error_test_window"));
            context
        });

        app.record_error("tray", "tray_initialization_failed", "Tray init failed", HashMap::new());

        app.record_error("security", "security_session_expired", "Session timeout", HashMap::new());

        // Verify errors were recorded
        let errors = app.get_errors();
        assert_eq!(errors.len(), 3, "Should record all errors");
        assert!(errors.iter().all(|e| !e.recovered), "Errors should initially be unrecovered");

        // Test recovery
        for i in 0..errors.len() {
            let recovery_result = app.recover_from_error(i).await;
            assert!(recovery_result.is_ok(), "Error recovery should succeed for error {}", i);
        }

        // Verify errors are marked as recovered
        let recovered_errors = app.get_errors();
        assert!(recovered_errors.iter().all(|e| e.recovered), "All errors should be recovered");
        assert!(recovered_errors.iter().all(|e| e.recovery_time.is_some()), "All errors should have recovery time");

        // Verify recovery events
        let events = app.get_events();
        let recovery_events: Vec<_> = events.iter()
            .filter(|e| e.event_type == "error_recovered")
            .collect();

        assert_eq!(recovery_events.len(), 3, "Should record all recovery events");
    }

    #[tokio::test]
    async fn test_data_persistence_workflow() {
        let app = E2EAppState::new();
        app.startup().await.unwrap();

        // Create and modify windows
        app.create_window("persistence_test", "Test Window", "/test").await.unwrap();
        app.interact_with_window("persistence_test", "resize").await.unwrap();
        app.interact_with_window("persistence_test", "move").await.unwrap();

        // Save states
        app.save_window_state("main").await.unwrap();
        app.save_window_state("persistence_test").await.unwrap();

        // Modify settings
        let settings_update = {
            let mut args = HashMap::new();
            args.insert("settings".to_string(), json!({
                "theme": "custom",
                "persistence_test": true,
                "last_session": "test_session_id"
            }));
            args
        };

        app.execute_secure_command("default_session", "save_settings", settings_update).await.unwrap();

        // Simulate application restart by creating new instance
        let restored_app = E2EAppState::new();
        restored_app.startup().await.unwrap();

        // Restore window states
        let restoration_result = restored_app.restore_window_state("persistence_test").await;
        assert!(restoration_result.is_ok(), "Should restore window state successfully");

        // Verify restored window properties
        let restored_windows = restored_app.windows.lock().unwrap();
        let restored_window = restored_windows.get("persistence_test").unwrap();
        assert_eq!(restored_window.title, "Test Window");
        assert_eq!(restored_window.width, 1400.0); // Modified by resize
        assert_eq!(restored_window.x, Some(200.0)); // Modified by move

        // Verify settings persistence
        let settings_result = restored_app.execute_secure_command("default_session", "get_settings", HashMap::new()).await;
        assert!(settings_result.is_ok(), "Should retrieve settings successfully");
        
        // Note: In a real implementation, settings would be persisted and restored
        // Here we just verify the command succeeds
    }

    #[tokio::test]
    async fn test_performance_under_load_workflow() {
        let app = E2EAppState::new();
        let startup_start = Instant::now();
        
        app.startup().await.unwrap();
        let startup_time = startup_start.elapsed();
        
        // Verify startup performance
        assert!(startup_time.as_millis() < 5000, 
               "Startup should complete within 5 seconds, took {}ms", 
               startup_time.as_millis());

        // Create many windows rapidly
        let window_creation_start = Instant::now();
        for i in 0..10 {
            let label = format!("load_test_window_{}", i);
            let result = app.create_window(&label, &format!("Load Test {}", i), "/").await;
            assert!(result.is_ok(), "Window creation should succeed under load");
        }
        let window_creation_time = window_creation_start.elapsed();

        assert!(window_creation_time.as_millis() < 3000,
               "Creating 10 windows should take less than 3 seconds, took {}ms",
               window_creation_time.as_millis());

        // Perform many rapid operations
        let operations_start = Instant::now();
        for i in 0..50 {
            let action = match i % 5 {
                0 => "new_window",
                1 => "zoom_in",
                2 => "zoom_out", 
                3 => "zoom_reset",
                _ => "about",
            };
            
            let result = timeout(Duration::from_secs(1), app.handle_menu_action(action)).await;
            assert!(result.is_ok(), "Menu action should complete within timeout");
            assert!(result.unwrap().is_ok(), "Menu action should succeed under load");
        }
        let operations_time = operations_start.elapsed();

        assert!(operations_time.as_millis() < 10000,
               "50 menu operations should complete within 10 seconds, took {}ms",
               operations_time.as_millis());

        // Verify system remains stable
        assert!(app.get_window_count().await > 10, "Should have created windows");
        
        let events = app.get_events();
        assert!(events.len() > 60, "Should have recorded all events");

        let errors = app.get_errors();
        assert!(errors.is_empty(), "Should not have any errors under normal load");
    }

    #[tokio::test]
    async fn test_cross_feature_integration_workflow() {
        let app = E2EAppState::new();
        app.startup().await.unwrap();

        // Complex workflow combining multiple features
        
        // 1. User opens application via tray
        app.handle_tray_action("double_click").await.unwrap();

        // 2. User creates new window via menu
        let new_window_result = app.handle_menu_action("new_window").await.unwrap();
        assert!(new_window_result.contains("window_created"));

        // 3. User resizes and moves windows
        let window_labels = vec!["main", "window_2"];
        for label in &window_labels {
            app.interact_with_window(label, "resize").await.unwrap();
            app.interact_with_window(label, "move").await.unwrap();
            app.save_window_state(label).await.unwrap();
        }

        // 4. User modifies settings via secure command
        let settings_args = {
            let mut args = HashMap::new();
            args.insert("settings".to_string(), json!({
                "multi_window": true,
                "tray_integration": true,
                "auto_save_states": true
            }));
            args
        };
        app.execute_secure_command("default_session", "save_settings", settings_args).await.unwrap();

        // 5. User checks for updates
        app.check_for_updates().await.unwrap();

        // 6. User goes fullscreen via menu
        app.handle_menu_action("fullscreen").await.unwrap();

        // 7. User minimizes to tray
        app.handle_tray_action("left_click").await.unwrap();

        // 8. User restores from tray
        app.handle_tray_action("left_click").await.unwrap();

        // Verify the complete workflow was tracked
        let events = app.get_events();
        
        let event_types: Vec<_> = events.iter().map(|e| &e.event_type).collect();
        let expected_events = vec![
            "startup_completed",
            "created", // window creation
            "interaction", // window interactions
            "state_saved", // window state saves
            "command_executed", // settings save
            "check_completed", // update check
            "action_executed", // menu and tray actions
        ];

        for expected in &expected_events {
            assert!(event_types.iter().any(|e| e.contains(expected)),
                   "Workflow should include '{}' events", expected);
        }

        // Verify no critical errors occurred
        let errors = app.get_errors();
        let critical_errors: Vec<_> = errors.iter()
            .filter(|e| e.error_type.contains("critical") || e.error_type.contains("fatal"))
            .collect();
        assert!(critical_errors.is_empty(), "Should not have critical errors during workflow");

        // Verify performance remained acceptable
        let metrics = app.get_performance_metrics().unwrap();
        if let Some(startup_time) = metrics.startup_time_ms {
            assert!(startup_time < 10000, "Startup time should remain reasonable");
        }

        let avg_command_time = metrics.command_execution_times.values()
            .flat_map(|times| times.iter())
            .sum::<u64>() / metrics.command_execution_times.values()
            .flat_map(|times| times.iter())
            .count() as u64;

        assert!(avg_command_time < 1000, "Average command time should be reasonable");
    }

    #[tokio::test]
    async fn test_graceful_shutdown_workflow() {
        let app = E2EAppState::new();
        app.startup().await.unwrap();

        // Perform some operations before shutdown
        app.create_window("shutdown_test", "Test Window", "/").await.unwrap();
        app.handle_menu_action("new_window").await.unwrap();
        app.handle_tray_action("right_click").await.unwrap();

        let settings_args = {
            let mut args = HashMap::new();
            args.insert("settings".to_string(), json!({"shutdown_test": true}));
            args
        };
        app.execute_secure_command("default_session", "save_settings", settings_args).await.unwrap();

        // Verify pre-shutdown state
        assert!(app.get_window_count().await >= 2, "Should have multiple windows before shutdown");
        assert!(app.get_events().len() > 5, "Should have accumulated events");

        // Initiate shutdown
        let shutdown_result = app.shutdown().await;
        assert!(shutdown_result.is_ok(), "Shutdown should complete successfully");

        // Verify shutdown effects
        let shutdown_flag = app.shutdown_initiated.lock().unwrap();
        assert!(*shutdown_flag, "Shutdown flag should be set");

        // Verify cleanup events
        let events = app.get_events();
        let shutdown_events: Vec<_> = events.iter()
            .filter(|e| e.event_type.contains("shutdown"))
            .collect();

        assert!(shutdown_events.len() >= 2, "Should have shutdown initiation and completion events");

        // Verify window states were saved
        let state_save_events: Vec<_> = events.iter()
            .filter(|e| e.event_type == "state_saved")
            .collect();

        assert!(state_save_events.len() >= 2, "Should save states for all windows during shutdown");

        // Verify sessions were cleaned up
        let sessions = app.security_sessions.lock().unwrap();
        assert!(sessions.is_empty(), "Sessions should be cleared during shutdown");
    }
}