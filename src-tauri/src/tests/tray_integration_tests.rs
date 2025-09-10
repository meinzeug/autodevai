//! Comprehensive System Tray Integration Tests
//! 
//! Tests for system tray functionality including:
//! - Tray icon creation and visibility
//! - Context menu interactions
//! - Window show/hide from tray
//! - Cross-platform tray behavior
//! - GTK integration on Linux
//! - Tray state management
//! - Event handling and coordination

#[cfg(test)]
mod tray_integration_tests {
    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};
    use std::time::{Duration, Instant};
    use serde_json::{json, Value};

    /// Mock tray configuration for testing
    #[derive(Debug, Clone)]
    struct MockTrayConfig {
        pub show_on_startup: bool,
        pub minimize_to_tray: bool,
        pub close_to_tray: bool,
        pub tooltip: String,
        pub title: String,
        pub icon_theme: String,
        pub show_menu_on_left_click: bool,
        pub double_click_action: String,
        pub gtk_integration: bool,
    }

    impl Default for MockTrayConfig {
        fn default() -> Self {
            Self {
                show_on_startup: true,
                minimize_to_tray: true,
                close_to_tray: false,
                tooltip: "AutoDev-AI Neural Bridge Platform".to_string(),
                title: "AutoDev-AI Neural Bridge Platform".to_string(),
                icon_theme: "default".to_string(),
                show_menu_on_left_click: false,
                double_click_action: "show_window".to_string(),
                gtk_integration: cfg!(target_os = "linux"),
            }
        }
    }

    /// Mock tray icon for testing
    #[derive(Debug, Clone)]
    struct MockTrayIcon {
        pub visible: bool,
        pub tooltip: String,
        pub menu_items: Vec<String>,
        pub config: MockTrayConfig,
        pub click_count: usize,
        pub last_event: Option<String>,
        pub state: HashMap<String, Value>,
    }

    impl MockTrayIcon {
        fn new(config: MockTrayConfig) -> Self {
            let menu_items = vec![
                "tray_show_hide".to_string(),
                "tray_minimize_all".to_string(),
                "tray_restore_all".to_string(),
                "tray_new_window".to_string(),
                "tray_new_dev_window".to_string(),
                "tray_about".to_string(),
                "tray_preferences".to_string(),
                "tray_system_info".to_string(),
                "tray_quit".to_string(),
            ];

            if cfg!(debug_assertions) {
                // Add debug menu items
                let debug_items = vec![
                    "tray_toggle_devtools".to_string(),
                    "tray_reload_app".to_string(),
                ];
            }

            Self {
                visible: true,
                tooltip: config.tooltip.clone(),
                menu_items,
                config,
                click_count: 0,
                last_event: None,
                state: HashMap::new(),
            }
        }

        fn handle_click(&mut self, button: &str, click_type: &str) -> Result<String, String> {
            self.click_count += 1;
            let event = format!("{}_{}_{}", button, click_type, self.click_count);
            self.last_event = Some(event.clone());

            match button {
                "left" => {
                    if click_type == "double" {
                        match self.config.double_click_action.as_str() {
                            "show_window" => Ok("window_shown".to_string()),
                            "new_window" => Ok("window_created".to_string()),
                            "preferences" => Ok("preferences_shown".to_string()),
                            _ => Ok("default_action".to_string()),
                        }
                    } else {
                        if self.config.show_menu_on_left_click {
                            Ok("menu_shown".to_string())
                        } else {
                            Ok("window_toggled".to_string())
                        }
                    }
                }
                "right" => Ok("context_menu_shown".to_string()),
                _ => Err("Unknown button".to_string()),
            }
        }

        fn handle_menu_event(&mut self, menu_id: &str) -> Result<String, String> {
            if !self.menu_items.contains(&menu_id.to_string()) {
                return Err(format!("Unknown menu item: {}", menu_id));
            }

            self.last_event = Some(format!("menu_{}", menu_id));

            match menu_id {
                "tray_show_hide" => Ok("window_visibility_toggled".to_string()),
                "tray_minimize_all" => Ok("all_windows_minimized".to_string()),
                "tray_restore_all" => Ok("all_windows_restored".to_string()),
                "tray_new_window" => Ok("new_window_created".to_string()),
                "tray_new_dev_window" => Ok("dev_window_created".to_string()),
                "tray_toggle_devtools" => {
                    if cfg!(debug_assertions) {
                        Ok("devtools_toggled".to_string())
                    } else {
                        Err("DevTools not available in release builds".to_string())
                    }
                }
                "tray_reload_app" => {
                    if cfg!(debug_assertions) {
                        Ok("app_reloaded".to_string())
                    } else {
                        Err("App reload not available in release builds".to_string())
                    }
                }
                "tray_about" => Ok("about_dialog_shown".to_string()),
                "tray_preferences" => Ok("preferences_shown".to_string()),
                "tray_system_info" => Ok("system_info_shown".to_string()),
                "tray_quit" => Ok("app_quit".to_string()),
                _ => Err(format!("Unhandled menu item: {}", menu_id)),
            }
        }

        fn update_tooltip(&mut self, new_tooltip: String) {
            self.tooltip = new_tooltip;
            self.state.insert("tooltip_updated".to_string(), json!(true));
        }

        fn set_state(&mut self, key: String, value: Value) {
            self.state.insert(key, value);
        }

        fn get_state(&self, key: &str) -> Option<&Value> {
            self.state.get(key)
        }
    }

    /// Mock app handle for tray testing
    #[derive(Debug, Clone)]
    struct MockTrayApp {
        windows: Arc<Mutex<Vec<String>>>,
        tray: Arc<Mutex<Option<MockTrayIcon>>>,
        events: Arc<Mutex<Vec<String>>>,
    }

    impl MockTrayApp {
        fn new() -> Self {
            Self {
                windows: Arc::new(Mutex::new(vec!["main".to_string()])),
                tray: Arc::new(Mutex::new(None)),
                events: Arc::new(Mutex::new(Vec::new())),
            }
        }

        fn create_tray(&self, config: MockTrayConfig) -> Result<(), String> {
            let tray_icon = MockTrayIcon::new(config);
            
            if let Ok(mut tray) = self.tray.lock() {
                *tray = Some(tray_icon);
                self.emit_event("tray_created".to_string());
                Ok(())
            } else {
                Err("Failed to lock tray mutex".to_string())
            }
        }

        fn get_tray(&self) -> Option<MockTrayIcon> {
            if let Ok(tray) = self.tray.lock() {
                tray.clone()
            } else {
                None
            }
        }

        fn handle_tray_click(&self, button: &str, click_type: &str) -> Result<String, String> {
            if let Ok(mut tray) = self.tray.lock() {
                if let Some(ref mut tray_icon) = *tray {
                    let result = tray_icon.handle_click(button, click_type)?;
                    self.emit_event(format!("tray_click_{}_{}", button, click_type));
                    Ok(result)
                } else {
                    Err("No tray icon available".to_string())
                }
            } else {
                Err("Failed to lock tray mutex".to_string())
            }
        }

        fn handle_tray_menu(&self, menu_id: &str) -> Result<String, String> {
            if let Ok(mut tray) = self.tray.lock() {
                if let Some(ref mut tray_icon) = *tray {
                    let result = tray_icon.handle_menu_event(menu_id)?;
                    self.emit_event(format!("tray_menu_{}", menu_id));
                    Ok(result)
                } else {
                    Err("No tray icon available".to_string())
                }
            } else {
                Err("Failed to lock tray mutex".to_string())
            }
        }

        fn toggle_window_visibility(&self, window_label: &str) -> Result<bool, String> {
            if let Ok(windows) = self.windows.lock() {
                let is_visible = windows.contains(&window_label.to_string());
                self.emit_event(format!("window_visibility_toggled_{}", window_label));
                Ok(!is_visible) // Return new visibility state
            } else {
                Err("Failed to lock windows mutex".to_string())
            }
        }

        fn add_window(&self, label: String) {
            if let Ok(mut windows) = self.windows.lock() {
                windows.push(label.clone());
                self.emit_event(format!("window_added_{}", label));
            }
        }

        fn remove_window(&self, label: &str) {
            if let Ok(mut windows) = self.windows.lock() {
                windows.retain(|w| w != label);
                self.emit_event(format!("window_removed_{}", label));
            }
        }

        fn window_count(&self) -> usize {
            if let Ok(windows) = self.windows.lock() {
                windows.len()
            } else {
                0
            }
        }

        fn emit_event(&self, event: String) {
            if let Ok(mut events) = self.events.lock() {
                events.push(event);
            }
        }

        fn get_events(&self) -> Vec<String> {
            if let Ok(events) = self.events.lock() {
                events.clone()
            } else {
                Vec::new()
            }
        }

        fn clear_events(&self) {
            if let Ok(mut events) = self.events.lock() {
                events.clear();
            }
        }
    }

    #[test]
    fn test_tray_creation() {
        let app = MockTrayApp::new();
        let config = MockTrayConfig::default();

        // Test tray creation
        let result = app.create_tray(config.clone());
        assert!(result.is_ok(), "Tray creation should succeed");

        // Verify tray was created
        let tray = app.get_tray();
        assert!(tray.is_some(), "Tray should exist after creation");

        let tray_icon = tray.unwrap();
        assert_eq!(tray_icon.tooltip, config.tooltip);
        assert_eq!(tray_icon.config.title, config.title);
        assert!(tray_icon.visible, "Tray should be visible by default");

        // Verify events
        let events = app.get_events();
        assert!(events.contains(&"tray_created".to_string()), "Should emit tray_created event");
    }

    #[test]
    fn test_tray_menu_items() {
        let app = MockTrayApp::new();
        let config = MockTrayConfig::default();
        app.create_tray(config).expect("Tray creation should succeed");

        let tray = app.get_tray().expect("Tray should exist");

        // Test expected menu items
        let expected_items = vec![
            "tray_show_hide",
            "tray_minimize_all", 
            "tray_restore_all",
            "tray_new_window",
            "tray_new_dev_window",
            "tray_about",
            "tray_preferences",
            "tray_system_info",
            "tray_quit",
        ];

        for item in expected_items {
            assert!(tray.menu_items.contains(&item.to_string()), 
                   "Menu should contain item: {}", item);
        }

        // Test menu items count
        let expected_count = if cfg!(debug_assertions) { 11 } else { 9 };
        assert_eq!(tray.menu_items.len(), expected_count, 
                  "Menu should have {} items", expected_count);
    }

    #[test]
    fn test_tray_click_handling() {
        let app = MockTrayApp::new();
        let config = MockTrayConfig::default();
        app.create_tray(config).expect("Tray creation should succeed");

        // Test left click
        let result = app.handle_tray_click("left", "single");
        assert!(result.is_ok(), "Left click should be handled successfully");
        assert_eq!(result.unwrap(), "window_toggled");

        // Test right click
        let result = app.handle_tray_click("right", "single");
        assert!(result.is_ok(), "Right click should be handled successfully");
        assert_eq!(result.unwrap(), "context_menu_shown");

        // Test double click
        let result = app.handle_tray_click("left", "double");
        assert!(result.is_ok(), "Double click should be handled successfully");
        assert_eq!(result.unwrap(), "window_shown");

        // Verify events were emitted
        let events = app.get_events();
        assert!(events.iter().any(|e| e.contains("tray_click_left_single")));
        assert!(events.iter().any(|e| e.contains("tray_click_right_single")));
        assert!(events.iter().any(|e| e.contains("tray_click_left_double")));
    }

    #[test]
    fn test_tray_menu_event_handling() {
        let app = MockTrayApp::new();
        let config = MockTrayConfig::default();
        app.create_tray(config).expect("Tray creation should succeed");

        // Test menu event handling
        let menu_tests = vec![
            ("tray_show_hide", "window_visibility_toggled"),
            ("tray_minimize_all", "all_windows_minimized"),
            ("tray_restore_all", "all_windows_restored"),
            ("tray_new_window", "new_window_created"),
            ("tray_new_dev_window", "dev_window_created"),
            ("tray_about", "about_dialog_shown"),
            ("tray_preferences", "preferences_shown"),
            ("tray_system_info", "system_info_shown"),
            ("tray_quit", "app_quit"),
        ];

        for (menu_id, expected_result) in menu_tests {
            let result = app.handle_tray_menu(menu_id);
            assert!(result.is_ok(), "Menu event {} should be handled", menu_id);
            assert_eq!(result.unwrap(), expected_result, 
                      "Menu event {} should return {}", menu_id, expected_result);
        }

        // Test debug-only menu items
        if cfg!(debug_assertions) {
            let debug_tests = vec![
                ("tray_toggle_devtools", "devtools_toggled"),
                ("tray_reload_app", "app_reloaded"),
            ];

            for (menu_id, expected_result) in debug_tests {
                let result = app.handle_tray_menu(menu_id);
                assert!(result.is_ok(), "Debug menu event {} should be handled", menu_id);
                assert_eq!(result.unwrap(), expected_result);
            }
        } else {
            // In release builds, debug items should return errors
            let result = app.handle_tray_menu("tray_toggle_devtools");
            assert!(result.is_err(), "Debug menu should not work in release builds");
        }
    }

    #[test]
    fn test_window_show_hide_from_tray() {
        let app = MockTrayApp::new();
        let config = MockTrayConfig::default();
        app.create_tray(config).expect("Tray creation should succeed");

        // Test window visibility toggle
        let result = app.toggle_window_visibility("main");
        assert!(result.is_ok(), "Window visibility toggle should work");

        let new_visibility = result.unwrap();
        assert!(!new_visibility, "Main window should be hidden first");

        // Toggle again
        let result = app.toggle_window_visibility("main");
        assert!(result.is_ok());
        let new_visibility = result.unwrap();
        assert!(new_visibility, "Main window should be shown again");

        // Verify events
        let events = app.get_events();
        let visibility_events: Vec<_> = events.iter()
            .filter(|e| e.contains("window_visibility_toggled"))
            .collect();
        assert_eq!(visibility_events.len(), 2, "Should have 2 visibility toggle events");
    }

    #[test]
    fn test_tray_configuration_options() {
        let app = MockTrayApp::new();

        // Test different configuration options
        let configs = vec![
            MockTrayConfig {
                close_to_tray: true,
                show_menu_on_left_click: true,
                double_click_action: "new_window".to_string(),
                ..MockTrayConfig::default()
            },
            MockTrayConfig {
                minimize_to_tray: false,
                double_click_action: "preferences".to_string(),
                gtk_integration: true,
                ..MockTrayConfig::default()
            },
        ];

        for (i, config) in configs.iter().enumerate() {
            app.create_tray(config.clone()).expect("Tray creation should succeed");
            
            let tray = app.get_tray().expect("Tray should exist");
            
            // Verify configuration was applied
            assert_eq!(tray.config.close_to_tray, config.close_to_tray);
            assert_eq!(tray.config.show_menu_on_left_click, config.show_menu_on_left_click);
            assert_eq!(tray.config.double_click_action, config.double_click_action);
            assert_eq!(tray.config.gtk_integration, config.gtk_integration);

            // Test behavior based on configuration
            let click_result = app.handle_tray_click("left", "double");
            assert!(click_result.is_ok());

            let expected_action = match config.double_click_action.as_str() {
                "new_window" => "window_created",
                "preferences" => "preferences_shown",
                _ => "window_shown",
            };
            assert_eq!(click_result.unwrap(), expected_action, 
                      "Double click action should match config for test {}", i);
        }
    }

    #[test]
    fn test_tray_tooltip_updates() {
        let app = MockTrayApp::new();
        let config = MockTrayConfig::default();
        app.create_tray(config).expect("Tray creation should succeed");

        // Update tooltip through tray reference
        if let Ok(mut tray) = app.tray.lock() {
            if let Some(ref mut tray_icon) = *tray {
                let new_tooltip = "Updated tooltip text".to_string();
                tray_icon.update_tooltip(new_tooltip.clone());
                
                assert_eq!(tray_icon.tooltip, new_tooltip);
                assert_eq!(tray_icon.get_state("tooltip_updated"), Some(&json!(true)));
            }
        }
    }

    #[test]
    fn test_tray_state_management() {
        let app = MockTrayApp::new();
        let config = MockTrayConfig::default();
        app.create_tray(config).expect("Tray creation should succeed");

        if let Ok(mut tray) = app.tray.lock() {
            if let Some(ref mut tray_icon) = *tray {
                // Test state management
                tray_icon.set_state("test_key".to_string(), json!("test_value"));
                tray_icon.set_state("numeric_key".to_string(), json!(42));
                tray_icon.set_state("boolean_key".to_string(), json!(true));

                // Verify state retrieval
                assert_eq!(tray_icon.get_state("test_key"), Some(&json!("test_value")));
                assert_eq!(tray_icon.get_state("numeric_key"), Some(&json!(42)));
                assert_eq!(tray_icon.get_state("boolean_key"), Some(&json!(true)));
                assert_eq!(tray_icon.get_state("nonexistent_key"), None);
            }
        }
    }

    #[test]
    fn test_cross_platform_tray_behavior() {
        let app = MockTrayApp::new();
        
        // Test platform-specific configuration
        let config = MockTrayConfig {
            gtk_integration: cfg!(target_os = "linux"),
            ..MockTrayConfig::default()
        };

        app.create_tray(config.clone()).expect("Tray creation should succeed");
        let tray = app.get_tray().expect("Tray should exist");

        // Verify platform-specific settings
        #[cfg(target_os = "linux")]
        {
            assert!(tray.config.gtk_integration, "GTK integration should be enabled on Linux");
        }

        #[cfg(not(target_os = "linux"))]
        {
            assert!(!tray.config.gtk_integration, "GTK integration should be disabled on non-Linux");
        }

        // Test platform-specific menu behavior
        let platform = std::env::consts::OS;
        match platform {
            "windows" => {
                // Windows-specific tray testing
                assert!(tray.visible, "Tray should be visible on Windows");
            }
            "macos" => {
                // macOS-specific tray testing
                assert!(tray.visible, "Tray should be visible on macOS");
            }
            "linux" => {
                // Linux-specific tray testing with GTK
                assert!(tray.visible, "Tray should be visible on Linux");
                assert_eq!(tray.config.gtk_integration, true);
            }
            _ => {
                // Other platforms should still work
                assert!(tray.visible, "Tray should be visible on {}", platform);
            }
        }
    }

    #[test]
    fn test_tray_event_coordination() {
        let app = MockTrayApp::new();
        let config = MockTrayConfig::default();
        app.create_tray(config).expect("Tray creation should succeed");

        // Perform various tray operations
        let operations = vec![
            ("left_click", || app.handle_tray_click("left", "single")),
            ("right_click", || app.handle_tray_click("right", "single")), 
            ("double_click", || app.handle_tray_click("left", "double")),
            ("show_hide_menu", || app.handle_tray_menu("tray_show_hide")),
            ("new_window_menu", || app.handle_tray_menu("tray_new_window")),
            ("about_menu", || app.handle_tray_menu("tray_about")),
        ];

        for (op_name, operation) in operations {
            let result = operation();
            assert!(result.is_ok(), "Operation {} should succeed", op_name);
        }

        // Verify all events were recorded
        let events = app.get_events();
        assert!(events.len() > 6, "Should have recorded events for all operations");

        // Verify specific event patterns
        let click_events = events.iter().filter(|e| e.contains("tray_click")).count();
        let menu_events = events.iter().filter(|e| e.contains("tray_menu")).count();

        assert!(click_events >= 3, "Should have at least 3 click events");
        assert!(menu_events >= 3, "Should have at least 3 menu events");
    }

    #[test]
    fn test_tray_performance() {
        let app = MockTrayApp::new();
        let config = MockTrayConfig::default();
        app.create_tray(config).expect("Tray creation should succeed");

        // Test rapid tray interactions
        let start = Instant::now();
        
        for i in 0..100 {
            let _ = app.handle_tray_click("left", "single");
            let _ = app.handle_tray_menu("tray_show_hide");
            
            if i % 10 == 0 {
                app.toggle_window_visibility("main").ok();
            }
        }

        let duration = start.elapsed();
        
        // Operations should complete quickly (less than 100ms for 100 operations)
        assert!(duration.as_millis() < 100, 
               "Tray operations took {}ms, expected < 100ms", 
               duration.as_millis());

        // Verify all events were recorded
        let events = app.get_events();
        assert!(events.len() > 200, "Should have recorded all rapid operations");
    }

    #[test]
    fn test_tray_error_handling() {
        let app = MockTrayApp::new();
        let config = MockTrayConfig::default();
        app.create_tray(config).expect("Tray creation should succeed");

        // Test invalid menu items
        let invalid_menus = vec![
            "invalid_menu_item",
            "",
            "tray_nonexistent",
            "malicious<script>",
        ];

        for invalid_menu in invalid_menus {
            let result = app.handle_tray_menu(invalid_menu);
            assert!(result.is_err(), "Invalid menu {} should return error", invalid_menu);
        }

        // Test invalid click types
        let invalid_clicks = vec![
            ("unknown_button", "single"),
            ("left", "invalid_type"),
            ("", "single"),
        ];

        for (button, click_type) in invalid_clicks {
            let result = app.handle_tray_click(button, click_type);
            if button.is_empty() || button == "unknown_button" {
                assert!(result.is_err(), "Invalid button {} should return error", button);
            }
        }

        // System should remain functional after errors
        let result = app.handle_tray_click("left", "single");
        assert!(result.is_ok(), "Valid operations should still work after errors");
    }

    #[test]
    fn test_tray_window_coordination() {
        let app = MockTrayApp::new();
        let config = MockTrayConfig {
            close_to_tray: true,
            minimize_to_tray: true,
            ..MockTrayConfig::default()
        };
        app.create_tray(config).expect("Tray creation should succeed");

        // Add multiple windows
        app.add_window("dev_window".to_string());
        app.add_window("settings_window".to_string());
        
        assert_eq!(app.window_count(), 3); // main + 2 added

        // Test minimize all from tray
        let result = app.handle_tray_menu("tray_minimize_all");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "all_windows_minimized");

        // Test restore all from tray
        let result = app.handle_tray_menu("tray_restore_all");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "all_windows_restored");

        // Test new window creation from tray
        let initial_count = app.window_count();
        let result = app.handle_tray_menu("tray_new_window");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "new_window_created");

        // Test dev window creation from tray
        let result = app.handle_tray_menu("tray_new_dev_window");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "dev_window_created");

        // Verify coordination events
        let events = app.get_events();
        let window_events: Vec<_> = events.iter()
            .filter(|e| e.contains("window"))
            .collect();
        
        assert!(window_events.len() >= 6, "Should have multiple window coordination events");
    }
}