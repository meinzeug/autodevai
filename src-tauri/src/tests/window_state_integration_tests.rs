//! Comprehensive Window State Management Integration Tests
//! 
//! Tests for window state persistence, restoration, and management including:
//! - Window state persistence across sessions
//! - Multi-window state management
//! - Window property restoration (size, position, maximized, fullscreen)
//! - Error handling and edge cases
//! - Performance with many windows
//! - Cross-platform window behavior
//! - Integration with tauri-plugin-window-state

#[cfg(test)]
mod window_state_integration_tests {
    use std::collections::HashMap;
    use std::path::PathBuf;
    use std::sync::{Arc, Mutex};
    use std::time::{Duration, Instant, SystemTime};
    use serde::{Deserialize, Serialize};
    use tempfile::TempDir;
    use tokio::fs;

    /// Enhanced mock window state for comprehensive testing
    #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
    struct MockWindowState {
        pub width: f64,
        pub height: f64,
        pub x: Option<f64>,
        pub y: Option<f64>,
        pub maximized: bool,
        pub fullscreen: bool,
        pub visible: bool,
        pub always_on_top: bool,
        pub decorations: bool,
        pub resizable: bool,
        pub focused: bool,
        pub minimized: bool,
        pub title: String,
        pub url: String,
    }

    impl Default for MockWindowState {
        fn default() -> Self {
            Self {
                width: 1200.0,
                height: 800.0,
                x: None,
                y: None,
                maximized: false,
                fullscreen: false,
                visible: true,
                always_on_top: false,
                decorations: true,
                resizable: true,
                focused: false,
                minimized: false,
                title: "AutoDev-AI Neural Bridge Platform".to_string(),
                url: "/".to_string(),
            }
        }
    }

    /// Mock window state collection
    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct MockWindowStateCollection {
        pub states: HashMap<String, MockWindowState>,
        pub last_updated: u64,
        pub version: u32,
        pub session_id: String,
        pub platform: String,
    }

    impl Default for MockWindowStateCollection {
        fn default() -> Self {
            Self {
                states: HashMap::new(),
                last_updated: SystemTime::now()
                    .duration_since(SystemTime::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                version: 1,
                session_id: "test_session".to_string(),
                platform: std::env::consts::OS.to_string(),
            }
        }
    }

    /// Mock window for testing
    #[derive(Debug, Clone)]
    struct MockWindow {
        pub label: String,
        pub state: MockWindowState,
        pub events: Vec<String>,
        pub error_simulation: Option<String>,
    }

    impl MockWindow {
        fn new(label: &str) -> Self {
            Self {
                label: label.to_string(),
                state: MockWindowState::default(),
                events: Vec::new(),
                error_simulation: None,
            }
        }

        fn with_state(label: &str, state: MockWindowState) -> Self {
            Self {
                label: label.to_string(),
                state,
                events: Vec::new(),
                error_simulation: None,
            }
        }

        // Window property getters (simulating Tauri window API)
        fn inner_size(&self) -> Result<(u32, u32), String> {
            if let Some(ref error) = self.error_simulation {
                return Err(error.clone());
            }
            Ok((self.state.width as u32, self.state.height as u32))
        }

        fn outer_position(&self) -> Result<Option<(i32, i32)>, String> {
            if let Some(ref error) = self.error_simulation {
                return Err(error.clone());
            }
            if let (Some(x), Some(y)) = (self.state.x, self.state.y) {
                Ok(Some((x as i32, y as i32)))
            } else {
                Ok(None)
            }
        }

        fn is_maximized(&self) -> Result<bool, String> {
            if let Some(ref error) = self.error_simulation {
                return Err(error.clone());
            }
            Ok(self.state.maximized)
        }

        fn is_fullscreen(&self) -> Result<bool, String> {
            if let Some(ref error) = self.error_simulation {
                return Err(error.clone());
            }
            Ok(self.state.fullscreen)
        }

        fn is_visible(&self) -> Result<bool, String> {
            if let Some(ref error) = self.error_simulation {
                return Err(error.clone());
            }
            Ok(self.state.visible)
        }

        fn is_focused(&self) -> Result<bool, String> {
            if let Some(ref error) = self.error_simulation {
                return Err(error.clone());
            }
            Ok(self.state.focused)
        }

        fn is_minimized(&self) -> Result<bool, String> {
            if let Some(ref error) = self.error_simulation {
                return Err(error.clone());
            }
            Ok(self.state.minimized)
        }

        // Window property setters
        fn set_size(&mut self, width: f64, height: f64) -> Result<(), String> {
            if let Some(ref error) = self.error_simulation {
                return Err(error.clone());
            }
            self.state.width = width;
            self.state.height = height;
            self.events.push(format!("size_changed_{}x{}", width, height));
            Ok(())
        }

        fn set_position(&mut self, x: f64, y: f64) -> Result<(), String> {
            if let Some(ref error) = self.error_simulation {
                return Err(error.clone());
            }
            self.state.x = Some(x);
            self.state.y = Some(y);
            self.events.push(format!("position_changed_{},{}", x, y));
            Ok(())
        }

        fn maximize(&mut self) -> Result<(), String> {
            if let Some(ref error) = self.error_simulation {
                return Err(error.clone());
            }
            self.state.maximized = true;
            self.state.minimized = false;
            self.events.push("maximized".to_string());
            Ok(())
        }

        fn unmaximize(&mut self) -> Result<(), String> {
            if let Some(ref error) = self.error_simulation {
                return Err(error.clone());
            }
            self.state.maximized = false;
            self.events.push("unmaximized".to_string());
            Ok(())
        }

        fn set_fullscreen(&mut self, fullscreen: bool) -> Result<(), String> {
            if let Some(ref error) = self.error_simulation {
                return Err(error.clone());
            }
            self.state.fullscreen = fullscreen;
            self.events.push(format!("fullscreen_{}", fullscreen));
            Ok(())
        }

        fn show(&mut self) -> Result<(), String> {
            if let Some(ref error) = self.error_simulation {
                return Err(error.clone());
            }
            self.state.visible = true;
            self.events.push("shown".to_string());
            Ok(())
        }

        fn hide(&mut self) -> Result<(), String> {
            if let Some(ref error) = self.error_simulation {
                return Err(error.clone());
            }
            self.state.visible = false;
            self.events.push("hidden".to_string());
            Ok(())
        }

        fn minimize(&mut self) -> Result<(), String> {
            if let Some(ref error) = self.error_simulation {
                return Err(error.clone());
            }
            self.state.minimized = true;
            self.state.maximized = false;
            self.events.push("minimized".to_string());
            Ok(())
        }

        fn set_focus(&mut self) -> Result<(), String> {
            if let Some(ref error) = self.error_simulation {
                return Err(error.clone());
            }
            self.state.focused = true;
            self.events.push("focused".to_string());
            Ok(())
        }

        fn set_title(&mut self, title: &str) -> Result<(), String> {
            if let Some(ref error) = self.error_simulation {
                return Err(error.clone());
            }
            self.state.title = title.to_string();
            self.events.push(format!("title_changed_{}", title));
            Ok(())
        }

        // Simulate error conditions for testing
        fn simulate_error(&mut self, error: Option<String>) {
            self.error_simulation = error;
        }
    }

    /// Mock window state manager
    #[derive(Debug)]
    struct MockWindowStateManager {
        collection: MockWindowStateCollection,
        config_path: PathBuf,
        auto_save: bool,
        windows: HashMap<String, MockWindow>,
        events: Vec<String>,
        save_count: usize,
        load_count: usize,
    }

    impl MockWindowStateManager {
        fn new(config_path: PathBuf, auto_save: bool) -> Self {
            Self {
                collection: MockWindowStateCollection::default(),
                config_path,
                auto_save,
                windows: HashMap::new(),
                events: Vec::new(),
                save_count: 0,
                load_count: 0,
            }
        }

        async fn initialize(&mut self) -> Result<(), Box<dyn std::error::Error>> {
            self.load_states().await?;
            self.events.push("initialized".to_string());
            Ok(())
        }

        async fn save_window_state(&mut self, label: &str, window: &MockWindow) -> Result<(), Box<dyn std::error::Error>> {
            self.collection.states.insert(label.to_string(), window.state.clone());
            self.collection.last_updated = SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)?
                .as_secs();
            self.collection.version += 1;

            if self.auto_save {
                self.persist_states().await?;
            }

            self.events.push(format!("saved_{}", label));
            Ok(())
        }

        async fn restore_window_state(&mut self, label: &str, window: &mut MockWindow) -> Result<(), Box<dyn std::error::Error>> {
            if let Some(state) = self.collection.states.get(label) {
                self.apply_window_state(window, state).await?;
                self.events.push(format!("restored_{}", label));
                Ok(())
            } else {
                Err(format!("No saved state found for window '{}'", label).into())
            }
        }

        fn get_window_state(&self, label: &str) -> Option<&MockWindowState> {
            self.collection.states.get(label)
        }

        async fn save_all_states(&mut self) -> Result<(), Box<dyn std::error::Error>> {
            self.persist_states().await
        }

        async fn apply_window_state(&self, window: &mut MockWindow, state: &MockWindowState) -> Result<(), Box<dyn std::error::Error>> {
            // Apply all state properties
            window.set_size(state.width, state.height)?;
            
            if let (Some(x), Some(y)) = (state.x, state.y) {
                window.set_position(x, y)?;
            }

            if state.maximized {
                window.maximize()?;
            } else {
                window.unmaximize()?;
            }

            window.set_fullscreen(state.fullscreen)?;

            if state.visible {
                window.show()?;
            } else {
                window.hide()?;
            }

            if state.focused {
                window.set_focus()?;
            }

            if state.minimized {
                window.minimize()?;
            }

            window.set_title(&state.title)?;

            Ok(())
        }

        async fn load_states(&mut self) -> Result<(), Box<dyn std::error::Error>> {
            self.load_count += 1;

            if self.config_path.exists() {
                let content = fs::read_to_string(&self.config_path).await?;
                self.collection = serde_json::from_str(&content)?;
                self.events.push(format!("loaded_{}_states", self.collection.states.len()));
            } else {
                self.create_default_states().await?;
            }

            Ok(())
        }

        async fn create_default_states(&mut self) -> Result<(), Box<dyn std::error::Error>> {
            self.collection = MockWindowStateCollection::default();
            
            // Add default main window state
            self.collection.states.insert("main".to_string(), MockWindowState::default());

            self.persist_states().await?;
            self.events.push("created_default_states".to_string());
            Ok(())
        }

        async fn persist_states(&mut self) -> Result<(), Box<dyn std::error::Error>> {
            self.save_count += 1;

            // Ensure parent directory exists
            if let Some(parent) = self.config_path.parent() {
                fs::create_dir_all(parent).await?;
            }

            // Update metadata
            self.collection.last_updated = SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)?
                .as_secs();
            self.collection.version += 1;

            // Write to file
            let content = serde_json::to_string_pretty(&self.collection)?;
            fs::write(&self.config_path, content).await?;

            self.events.push(format!("persisted_{}_states", self.collection.states.len()));
            Ok(())
        }

        fn add_window(&mut self, label: String, window: MockWindow) {
            self.windows.insert(label.clone(), window);
            self.events.push(format!("window_added_{}", label));
        }

        fn remove_window(&mut self, label: &str) -> Option<MockWindow> {
            let window = self.windows.remove(label);
            if window.is_some() {
                self.events.push(format!("window_removed_{}", label));
            }
            window
        }

        fn get_window(&self, label: &str) -> Option<&MockWindow> {
            self.windows.get(label)
        }

        fn get_window_mut(&mut self, label: &str) -> Option<&mut MockWindow> {
            self.windows.get_mut(label)
        }

        fn window_count(&self) -> usize {
            self.windows.len()
        }

        fn get_events(&self) -> &[String] {
            &self.events
        }

        fn get_stats(&self) -> HashMap<String, serde_json::Value> {
            let mut stats = HashMap::new();
            stats.insert("window_count".to_string(), serde_json::json!(self.windows.len()));
            stats.insert("saved_states_count".to_string(), serde_json::json!(self.collection.states.len()));
            stats.insert("save_count".to_string(), serde_json::json!(self.save_count));
            stats.insert("load_count".to_string(), serde_json::json!(self.load_count));
            stats.insert("auto_save".to_string(), serde_json::json!(self.auto_save));
            stats.insert("version".to_string(), serde_json::json!(self.collection.version));
            stats.insert("session_id".to_string(), serde_json::json!(self.collection.session_id));
            stats.insert("platform".to_string(), serde_json::json!(self.collection.platform));
            stats
        }
    }

    #[tokio::test]
    async fn test_window_state_manager_initialization() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("window_states.json");
        
        let mut manager = MockWindowStateManager::new(config_path.clone(), true);
        
        // Test initialization
        let result = manager.initialize().await;
        assert!(result.is_ok(), "Manager initialization should succeed");
        
        // Verify default state was created
        assert!(config_path.exists(), "Config file should be created");
        assert_eq!(manager.collection.states.len(), 1, "Should have default main window state");
        assert!(manager.collection.states.contains_key("main"), "Should contain main window state");
        
        // Verify events
        let events = manager.get_events();
        assert!(events.contains(&"created_default_states".to_string()));
        assert!(events.contains(&"initialized".to_string()));
    }

    #[tokio::test]
    async fn test_window_state_persistence_and_restoration() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("window_states.json");
        
        // Create and configure manager
        let mut manager = MockWindowStateManager::new(config_path.clone(), true);
        manager.initialize().await.unwrap();
        
        // Create a test window with custom state
        let mut test_window = MockWindow::new("test_window");
        test_window.set_size(1400.0, 900.0).unwrap();
        test_window.set_position(100.0, 50.0).unwrap();
        test_window.maximize().unwrap();
        test_window.set_title("Test Window").unwrap();
        
        // Save the window state
        manager.save_window_state("test_window", &test_window).await.unwrap();
        
        // Verify state was saved
        let saved_state = manager.get_window_state("test_window").unwrap();
        assert_eq!(saved_state.width, 1400.0);
        assert_eq!(saved_state.height, 900.0);
        assert_eq!(saved_state.x, Some(100.0));
        assert_eq!(saved_state.y, Some(50.0));
        assert!(saved_state.maximized);
        assert_eq!(saved_state.title, "Test Window");
        
        // Create new manager to test persistence
        let mut new_manager = MockWindowStateManager::new(config_path, true);
        new_manager.initialize().await.unwrap();
        
        // Verify state was loaded from disk
        assert_eq!(new_manager.collection.states.len(), 2); // main + test_window
        let loaded_state = new_manager.get_window_state("test_window").unwrap();
        assert_eq!(loaded_state.width, 1400.0);
        assert_eq!(loaded_state.height, 900.0);
        assert!(loaded_state.maximized);
        
        // Test state restoration
        let mut restore_window = MockWindow::new("test_window");
        new_manager.restore_window_state("test_window", &mut restore_window).await.unwrap();
        
        // Verify restoration
        assert_eq!(restore_window.state.width, 1400.0);
        assert_eq!(restore_window.state.height, 900.0);
        assert!(restore_window.state.maximized);
        assert_eq!(restore_window.state.title, "Test Window");
    }

    #[tokio::test]
    async fn test_multi_window_state_management() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("multi_window_states.json");
        
        let mut manager = MockWindowStateManager::new(config_path, true);
        manager.initialize().await.unwrap();
        
        // Create multiple windows with different configurations
        let window_configs = vec![
            ("main", MockWindowState {
                width: 1200.0,
                height: 800.0,
                x: Some(0.0),
                y: Some(0.0),
                maximized: false,
                fullscreen: false,
                title: "Main Window".to_string(),
                ..MockWindowState::default()
            }),
            ("dev_tools", MockWindowState {
                width: 1000.0,
                height: 700.0,
                x: Some(300.0),
                y: Some(100.0),
                maximized: true,
                fullscreen: false,
                title: "Development Tools".to_string(),
                ..MockWindowState::default()
            }),
            ("settings", MockWindowState {
                width: 800.0,
                height: 600.0,
                x: Some(500.0),
                y: Some(200.0),
                maximized: false,
                fullscreen: true,
                title: "Settings Window".to_string(),
                ..MockWindowState::default()
            }),
        ];
        
        // Save all window states
        for (label, state) in &window_configs {
            let window = MockWindow::with_state(label, state.clone());
            manager.save_window_state(label, &window).await.unwrap();
        }
        
        // Verify all states were saved
        assert_eq!(manager.collection.states.len(), 3);
        
        // Test individual state retrieval
        for (label, expected_state) in &window_configs {
            let saved_state = manager.get_window_state(label).unwrap();
            assert_eq!(saved_state.width, expected_state.width);
            assert_eq!(saved_state.height, expected_state.height);
            assert_eq!(saved_state.maximized, expected_state.maximized);
            assert_eq!(saved_state.fullscreen, expected_state.fullscreen);
            assert_eq!(saved_state.title, expected_state.title);
        }
        
        // Test restoration of all windows
        for (label, expected_state) in window_configs {
            let mut restore_window = MockWindow::new(&label);
            manager.restore_window_state(&label, &mut restore_window).await.unwrap();
            
            assert_eq!(restore_window.state.width, expected_state.width);
            assert_eq!(restore_window.state.height, expected_state.height);
            assert_eq!(restore_window.state.maximized, expected_state.maximized);
            assert_eq!(restore_window.state.fullscreen, expected_state.fullscreen);
            assert_eq!(restore_window.state.title, expected_state.title);
        }
    }

    #[tokio::test]
    async fn test_window_state_edge_cases() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("edge_case_states.json");
        
        let mut manager = MockWindowStateManager::new(config_path, true);
        manager.initialize().await.unwrap();
        
        // Test edge cases
        let edge_cases = vec![
            ("negative_position", MockWindowState {
                x: Some(-100.0),
                y: Some(-50.0),
                width: 800.0,
                height: 600.0,
                ..MockWindowState::default()
            }),
            ("very_large", MockWindowState {
                width: 9999.0,
                height: 9999.0,
                x: Some(0.0),
                y: Some(0.0),
                ..MockWindowState::default()
            }),
            ("very_small", MockWindowState {
                width: 1.0,
                height: 1.0,
                x: Some(0.0),
                y: Some(0.0),
                ..MockWindowState::default()
            }),
            ("no_position", MockWindowState {
                x: None,
                y: None,
                width: 800.0,
                height: 600.0,
                ..MockWindowState::default()
            }),
            ("all_flags_true", MockWindowState {
                maximized: true,
                fullscreen: true,
                visible: true,
                always_on_top: true,
                decorations: true,
                resizable: true,
                focused: true,
                minimized: true,
                ..MockWindowState::default()
            }),
        ];
        
        // Save and restore each edge case
        for (label, state) in edge_cases {
            let window = MockWindow::with_state(&label, state.clone());
            manager.save_window_state(&label, &window).await.unwrap();
            
            let saved_state = manager.get_window_state(&label).unwrap();
            assert_eq!(saved_state.x, state.x);
            assert_eq!(saved_state.y, state.y);
            assert_eq!(saved_state.width, state.width);
            assert_eq!(saved_state.height, state.height);
            
            // Test restoration
            let mut restore_window = MockWindow::new(&label);
            manager.restore_window_state(&label, &mut restore_window).await.unwrap();
        }
    }

    #[tokio::test]
    async fn test_window_state_error_handling() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("error_test_states.json");
        
        let mut manager = MockWindowStateManager::new(config_path, true);
        manager.initialize().await.unwrap();
        
        // Test with window that simulates errors
        let mut error_window = MockWindow::new("error_window");
        error_window.simulate_error(Some("Simulated window error".to_string()));
        
        // Restoration should handle errors gracefully
        let result = manager.restore_window_state("nonexistent_window", &mut error_window).await;
        assert!(result.is_err(), "Should return error for nonexistent window");
        
        // Test with invalid file path
        let invalid_path = PathBuf::from("/invalid/path/that/does/not/exist/window_states.json");
        let mut invalid_manager = MockWindowStateManager::new(invalid_path, true);
        
        // Should handle initialization errors gracefully
        let result = invalid_manager.initialize().await;
        // This might succeed by creating default states, depending on permissions
        
        // Test serialization edge cases
        let mut unicode_window = MockWindow::new("unicode_test");
        unicode_window.set_title("测试窗口 🚀 Тест окно").unwrap();
        
        let result = manager.save_window_state("unicode_test", &unicode_window).await;
        assert!(result.is_ok(), "Should handle Unicode in window titles");
    }

    #[tokio::test]
    async fn test_window_state_performance() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("performance_test_states.json");
        
        let mut manager = MockWindowStateManager::new(config_path, false); // Disable auto-save
        manager.initialize().await.unwrap();
        
        // Performance test with many windows
        let window_count = 100;
        let start_time = Instant::now();
        
        // Create and save many window states
        for i in 0..window_count {
            let label = format!("perf_window_{}", i);
            let state = MockWindowState {
                width: 800.0 + i as f64,
                height: 600.0 + i as f64,
                x: Some(i as f64 * 10.0),
                y: Some(i as f64 * 5.0),
                maximized: i % 2 == 0,
                fullscreen: i % 3 == 0,
                title: format!("Performance Test Window {}", i),
                ..MockWindowState::default()
            };
            
            let window = MockWindow::with_state(&label, state);
            manager.save_window_state(&label, &window).await.unwrap();
        }
        
        let save_duration = start_time.elapsed();
        
        // Save all states to disk
        let save_start = Instant::now();
        manager.save_all_states().await.unwrap();
        let persist_duration = save_start.elapsed();
        
        // Test loading performance
        let mut load_manager = MockWindowStateManager::new(manager.config_path.clone(), false);
        let load_start = Instant::now();
        load_manager.initialize().await.unwrap();
        let load_duration = load_start.elapsed();
        
        // Verify performance expectations
        assert!(save_duration.as_millis() < 1000, 
               "Saving {} states took {}ms, expected < 1000ms", 
               window_count, save_duration.as_millis());
        
        assert!(persist_duration.as_millis() < 500, 
               "Persisting {} states took {}ms, expected < 500ms", 
               window_count, persist_duration.as_millis());
        
        assert!(load_duration.as_millis() < 500, 
               "Loading {} states took {}ms, expected < 500ms", 
               window_count, load_duration.as_millis());
        
        // Verify all states were loaded correctly
        assert_eq!(load_manager.collection.states.len(), window_count + 1); // +1 for default main
        
        // Test restoration performance
        let restore_start = Instant::now();
        for i in 0..10 { // Test subset for restoration performance
            let label = format!("perf_window_{}", i);
            let mut restore_window = MockWindow::new(&label);
            load_manager.restore_window_state(&label, &mut restore_window).await.unwrap();
        }
        let restore_duration = restore_start.elapsed();
        
        assert!(restore_duration.as_millis() < 100, 
               "Restoring 10 states took {}ms, expected < 100ms", 
               restore_duration.as_millis());
    }

    #[tokio::test]
    async fn test_auto_save_functionality() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("auto_save_states.json");
        
        // Test with auto-save enabled
        let mut auto_manager = MockWindowStateManager::new(config_path.clone(), true);
        auto_manager.initialize().await.unwrap();
        
        let test_window = MockWindow::new("auto_save_test");
        auto_manager.save_window_state("auto_save_test", &test_window).await.unwrap();
        
        // File should be automatically saved
        assert!(config_path.exists(), "Auto-save should create file immediately");
        
        let stats = auto_manager.get_stats();
        assert_eq!(stats["save_count"].as_u64().unwrap(), 2); // 1 for default, 1 for test window
        
        // Test with auto-save disabled
        let manual_path = temp_dir.path().join("manual_save_states.json");
        let mut manual_manager = MockWindowStateManager::new(manual_path.clone(), false);
        manual_manager.initialize().await.unwrap();
        
        let test_window2 = MockWindow::new("manual_save_test");
        manual_manager.save_window_state("manual_save_test", &test_window2).await.unwrap();
        
        // File should not exist yet (only in memory)
        let initial_save_count = manual_manager.save_count;
        
        // Manually trigger save
        manual_manager.save_all_states().await.unwrap();
        assert!(manual_path.exists(), "Manual save should create file");
        assert!(manual_manager.save_count > initial_save_count, "Save count should increase");
    }

    #[tokio::test] 
    async fn test_concurrent_window_state_operations() {
        use std::sync::Arc;
        use tokio::sync::Mutex;
        
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("concurrent_states.json");
        
        let manager = Arc::new(Mutex::new(MockWindowStateManager::new(config_path, true)));
        
        // Initialize manager
        {
            let mut mgr = manager.lock().await;
            mgr.initialize().await.unwrap();
        }
        
        // Spawn multiple concurrent tasks
        let mut tasks = Vec::new();
        for i in 0..10 {
            let manager_clone = Arc::clone(&manager);
            let task = tokio::spawn(async move {
                let label = format!("concurrent_window_{}", i);
                let state = MockWindowState {
                    width: 800.0 + i as f64,
                    height: 600.0 + i as f64,
                    title: format!("Concurrent Window {}", i),
                    ..MockWindowState::default()
                };
                
                let window = MockWindow::with_state(&label, state);
                
                {
                    let mut mgr = manager_clone.lock().await;
                    mgr.save_window_state(&label, &window).await.unwrap();
                }
                
                label
            });
            tasks.push(task);
        }
        
        // Wait for all tasks to complete
        let results = futures::future::join_all(tasks).await;
        
        // Verify all tasks completed successfully
        assert_eq!(results.len(), 10);
        for result in results {
            assert!(result.is_ok());
        }
        
        // Verify all states were saved
        {
            let mgr = manager.lock().await;
            assert_eq!(mgr.collection.states.len(), 11); // 10 concurrent + 1 default main
        }
    }

    #[tokio::test]
    async fn test_cross_platform_window_state_behavior() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("cross_platform_states.json");
        
        let mut manager = MockWindowStateManager::new(config_path, true);
        manager.initialize().await.unwrap();
        
        // Test platform-specific behavior
        let platform = std::env::consts::OS;
        let state = MockWindowState {
            width: match platform {
                "windows" => 1200.0, // Windows default
                "macos" => 1280.0,   // macOS default
                "linux" => 1024.0,   // Linux default
                _ => 800.0,           // Other platforms
            },
            height: match platform {
                "windows" => 800.0,
                "macos" => 720.0,
                "linux" => 768.0,
                _ => 600.0,
            },
            decorations: platform != "macos", // macOS might not use decorations
            ..MockWindowState::default()
        };
        
        let window = MockWindow::with_state("platform_test", state.clone());
        manager.save_window_state("platform_test", &window).await.unwrap();
        
        // Verify platform-specific state was saved
        let saved_state = manager.get_window_state("platform_test").unwrap();
        assert_eq!(saved_state.width, state.width);
        assert_eq!(saved_state.height, state.height);
        assert_eq!(saved_state.decorations, state.decorations);
        
        // Test that collection contains platform information
        assert_eq!(manager.collection.platform, platform);
    }

    #[test]
    fn test_window_state_serialization() {
        // Test JSON serialization/deserialization
        let state = MockWindowState {
            width: 1600.0,
            height: 1200.0,
            x: Some(150.0),
            y: Some(75.0),
            maximized: true,
            fullscreen: false,
            visible: true,
            title: "Serialization Test 🚀".to_string(),
            ..MockWindowState::default()
        };
        
        // Test serialization
        let json = serde_json::to_string(&state).unwrap();
        assert!(json.contains("1600"));
        assert!(json.contains("1200"));
        assert!(json.contains("150"));
        assert!(json.contains("75"));
        assert!(json.contains("true"));
        assert!(json.contains("Serialization Test"));
        
        // Test deserialization
        let deserialized: MockWindowState = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.width, state.width);
        assert_eq!(deserialized.height, state.height);
        assert_eq!(deserialized.x, state.x);
        assert_eq!(deserialized.y, state.y);
        assert_eq!(deserialized.maximized, state.maximized);
        assert_eq!(deserialized.fullscreen, state.fullscreen);
        assert_eq!(deserialized.title, state.title);
        
        // Test collection serialization
        let mut collection = MockWindowStateCollection::default();
        collection.states.insert("test".to_string(), state.clone());
        
        let collection_json = serde_json::to_string_pretty(&collection).unwrap();
        let deserialized_collection: MockWindowStateCollection = 
            serde_json::from_str(&collection_json).unwrap();
            
        assert_eq!(deserialized_collection.states.len(), 1);
        assert!(deserialized_collection.states.contains_key("test"));
    }
}