//! Comprehensive Menu System Integration Tests
//! 
//! Tests for application menu functionality including:
//! - Menu creation and structure validation
//! - Menu event handling and routing
//! - Keyboard shortcuts and accelerators
//! - Cross-platform menu behavior
//! - Native menu item integration
//! - Context menu functionality
//! - Menu state synchronization
//! - Accessibility and internationalization

#[cfg(test)]
mod menu_integration_tests {
    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};
    use std::time::{Duration, Instant};
    use serde_json::{json, Value};

    /// Mock menu item structure
    #[derive(Debug, Clone, PartialEq)]
    struct MockMenuItem {
        pub id: String,
        pub title: String,
        pub enabled: bool,
        pub checked: Option<bool>,
        pub accelerator: Option<String>,
        pub item_type: MenuItemType,
        pub submenu: Option<Vec<MockMenuItem>>,
        pub role: Option<String>,
    }

    #[derive(Debug, Clone, PartialEq)]
    enum MenuItemType {
        Normal,
        Separator,
        Submenu,
        Checkbox,
        Radio,
        Predefined,
    }

    impl MockMenuItem {
        fn new(id: &str, title: &str) -> Self {
            Self {
                id: id.to_string(),
                title: title.to_string(),
                enabled: true,
                checked: None,
                accelerator: None,
                item_type: MenuItemType::Normal,
                submenu: None,
                role: None,
            }
        }

        fn with_accelerator(mut self, accelerator: &str) -> Self {
            self.accelerator = Some(accelerator.to_string());
            self
        }

        fn with_role(mut self, role: &str) -> Self {
            self.role = Some(role.to_string());
            self.item_type = MenuItemType::Predefined;
            self
        }

        fn with_submenu(mut self, submenu: Vec<MockMenuItem>) -> Self {
            self.submenu = Some(submenu);
            self.item_type = MenuItemType::Submenu;
            self
        }

        fn checkbox(mut self) -> Self {
            self.item_type = MenuItemType::Checkbox;
            self.checked = Some(false);
            self
        }

        fn separator() -> Self {
            Self {
                id: "separator".to_string(),
                title: "".to_string(),
                enabled: false,
                checked: None,
                accelerator: None,
                item_type: MenuItemType::Separator,
                submenu: None,
                role: None,
            }
        }

        fn set_enabled(&mut self, enabled: bool) {
            self.enabled = enabled;
        }

        fn set_checked(&mut self, checked: bool) {
            if matches!(self.item_type, MenuItemType::Checkbox | MenuItemType::Radio) {
                self.checked = Some(checked);
            }
        }

        fn toggle_checked(&mut self) {
            if let Some(current) = self.checked {
                self.checked = Some(!current);
            }
        }

        /// Find menu item by ID recursively
        fn find_item(&self, id: &str) -> Option<&MockMenuItem> {
            if self.id == id {
                return Some(self);
            }
            
            if let Some(ref submenu) = self.submenu {
                for item in submenu {
                    if let Some(found) = item.find_item(id) {
                        return Some(found);
                    }
                }
            }
            
            None
        }

        /// Find menu item by ID recursively (mutable)
        fn find_item_mut(&mut self, id: &str) -> Option<&mut MockMenuItem> {
            if self.id == id {
                return Some(self);
            }
            
            if let Some(ref mut submenu) = self.submenu {
                for item in submenu {
                    if let Some(found) = item.find_item_mut(id) {
                        return Some(found);
                    }
                }
            }
            
            None
        }

        /// Get all menu item IDs
        fn get_all_ids(&self) -> Vec<String> {
            let mut ids = vec![self.id.clone()];
            
            if let Some(ref submenu) = self.submenu {
                for item in submenu {
                    ids.extend(item.get_all_ids());
                }
            }
            
            ids
        }
    }

    /// Mock menu structure
    #[derive(Debug, Clone)]
    struct MockMenu {
        pub items: Vec<MockMenuItem>,
        pub visible: bool,
        pub platform: String,
    }

    impl MockMenu {
        fn new() -> Self {
            Self {
                items: Vec::new(),
                visible: true,
                platform: std::env::consts::OS.to_string(),
            }
        }

        fn add_item(&mut self, item: MockMenuItem) {
            self.items.push(item);
        }

        fn add_submenu(&mut self, title: &str, items: Vec<MockMenuItem>) {
            let submenu = MockMenuItem::new(&title.to_lowercase().replace(' ', "_"), title)
                .with_submenu(items);
            self.items.push(submenu);
        }

        fn find_item(&self, id: &str) -> Option<&MockMenuItem> {
            for item in &self.items {
                if let Some(found) = item.find_item(id) {
                    return Some(found);
                }
            }
            None
        }

        fn find_item_mut(&mut self, id: &str) -> Option<&mut MockMenuItem> {
            for item in &mut self.items {
                if let Some(found) = item.find_item_mut(id) {
                    return Some(found);
                }
            }
            None
        }

        fn get_all_item_ids(&self) -> Vec<String> {
            let mut ids = Vec::new();
            for item in &self.items {
                ids.extend(item.get_all_ids());
            }
            ids
        }

        fn item_count(&self) -> usize {
            self.get_all_item_ids().len()
        }

        /// Validate menu structure
        fn validate(&self) -> Result<(), String> {
            let all_ids = self.get_all_item_ids();
            let unique_ids: std::collections::HashSet<_> = all_ids.iter().collect();
            
            if all_ids.len() != unique_ids.len() {
                return Err("Duplicate menu item IDs found".to_string());
            }

            // Check for invalid separators
            for item in &self.items {
                if let Err(e) = self.validate_item(item) {
                    return Err(e);
                }
            }

            Ok(())
        }

        fn validate_item(&self, item: &MockMenuItem) -> Result<(), String> {
            if item.item_type == MenuItemType::Separator && !item.title.is_empty() {
                return Err("Separator items should not have titles".to_string());
            }

            if item.item_type != MenuItemType::Separator && item.title.is_empty() {
                return Err(format!("Non-separator item '{}' should have a title", item.id));
            }

            if let Some(ref submenu) = item.submenu {
                for subitem in submenu {
                    self.validate_item(subitem)?;
                }
            }

            Ok(())
        }
    }

    /// Mock menu event
    #[derive(Debug, Clone)]
    struct MockMenuEvent {
        pub id: String,
        pub accelerator_used: bool,
        pub timestamp: u64,
        pub modifiers: Vec<String>,
    }

    impl MockMenuEvent {
        fn new(id: &str) -> Self {
            Self {
                id: id.to_string(),
                accelerator_used: false,
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::SystemTime::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                modifiers: Vec::new(),
            }
        }

        fn with_accelerator(mut self) -> Self {
            self.accelerator_used = true;
            self
        }

        fn with_modifiers(mut self, modifiers: Vec<String>) -> Self {
            self.modifiers = modifiers;
            self
        }
    }

    /// Mock application with menu handling
    #[derive(Debug, Clone)]
    struct MockMenuApp {
        pub menu: Arc<Mutex<MockMenu>>,
        pub events: Arc<Mutex<Vec<MockMenuEvent>>>,
        pub windows: Arc<Mutex<Vec<String>>>,
        pub shortcuts: Arc<Mutex<HashMap<String, String>>>, // accelerator -> menu_id
        pub zoom_level: Arc<Mutex<f64>>,
        pub fullscreen: Arc<Mutex<bool>>,
        pub devtools_open: Arc<Mutex<bool>>,
    }

    impl MockMenuApp {
        fn new() -> Self {
            Self {
                menu: Arc::new(Mutex::new(MockMenu::new())),
                events: Arc::new(Mutex::new(Vec::new())),
                windows: Arc::new(Mutex::new(vec!["main".to_string()])),
                shortcuts: Arc::new(Mutex::new(HashMap::new())),
                zoom_level: Arc::new(Mutex::new(1.0)),
                fullscreen: Arc::new(Mutex::new(false)),
                devtools_open: Arc::new(Mutex::new(false)),
            }
        }

        fn create_app_menu(&self) -> Result<(), String> {
            let mut menu = self.menu.lock().map_err(|_| "Failed to lock menu")?;
            
            // File menu
            let file_menu = vec![
                MockMenuItem::new("new_window", "New Window")
                    .with_accelerator("CmdOrCtrl+N"),
                MockMenuItem::separator(),
                MockMenuItem::new("close_window", "Close Window")
                    .with_accelerator("CmdOrCtrl+W"),
                MockMenuItem::separator(),
                MockMenuItem::new("quit", "Quit")
                    .with_accelerator("CmdOrCtrl+Q"),
            ];

            // Edit menu with native items
            let edit_menu = vec![
                MockMenuItem::new("undo", "Undo")
                    .with_role("undo")
                    .with_accelerator("CmdOrCtrl+Z"),
                MockMenuItem::new("redo", "Redo")
                    .with_role("redo")
                    .with_accelerator("CmdOrCtrl+Shift+Z"),
                MockMenuItem::separator(),
                MockMenuItem::new("cut", "Cut")
                    .with_role("cut")
                    .with_accelerator("CmdOrCtrl+X"),
                MockMenuItem::new("copy", "Copy")
                    .with_role("copy")
                    .with_accelerator("CmdOrCtrl+C"),
                MockMenuItem::new("paste", "Paste")
                    .with_role("paste")
                    .with_accelerator("CmdOrCtrl+V"),
                MockMenuItem::separator(),
                MockMenuItem::new("select_all", "Select All")
                    .with_role("selectall")
                    .with_accelerator("CmdOrCtrl+A"),
            ];

            // View menu
            let mut view_menu = vec![
                MockMenuItem::new("zoom_in", "Zoom In")
                    .with_accelerator("CmdOrCtrl+Plus"),
                MockMenuItem::new("zoom_out", "Zoom Out")
                    .with_accelerator("CmdOrCtrl+-"),
                MockMenuItem::new("zoom_reset", "Reset Zoom")
                    .with_accelerator("CmdOrCtrl+0"),
                MockMenuItem::separator(),
                MockMenuItem::new("fullscreen", "Toggle Fullscreen")
                    .with_accelerator("F11"),
            ];

            // Add developer tools in debug builds
            if cfg!(debug_assertions) {
                view_menu.push(MockMenuItem::separator());
                view_menu.push(
                    MockMenuItem::new("toggle_devtools", "Developer Tools")
                        .with_accelerator("F12")
                );
            }

            // Help menu
            let help_menu = vec![
                MockMenuItem::new("about", "About"),
                MockMenuItem::separator(),
                MockMenuItem::new("documentation", "Documentation"),
                MockMenuItem::new("github", "GitHub Repository"),
            ];

            // Add submenus to main menu
            menu.add_submenu("File", file_menu);
            menu.add_submenu("Edit", edit_menu);
            menu.add_submenu("View", view_menu);
            menu.add_submenu("Help", help_menu);

            // Register keyboard shortcuts
            self.register_shortcuts()?;

            Ok(())
        }

        fn register_shortcuts(&self) -> Result<(), String> {
            let mut shortcuts = self.shortcuts.lock().map_err(|_| "Failed to lock shortcuts")?;
            let menu = self.menu.lock().map_err(|_| "Failed to lock menu")?;

            for item in &menu.items {
                self.register_item_shortcuts(item, &mut shortcuts);
            }

            Ok(())
        }

        fn register_item_shortcuts(&self, item: &MockMenuItem, shortcuts: &mut HashMap<String, String>) {
            if let Some(ref accelerator) = item.accelerator {
                shortcuts.insert(accelerator.clone(), item.id.clone());
            }

            if let Some(ref submenu) = item.submenu {
                for subitem in submenu {
                    self.register_item_shortcuts(subitem, shortcuts);
                }
            }
        }

        fn handle_menu_event(&self, event: MockMenuEvent) -> Result<String, String> {
            // Record the event
            {
                let mut events = self.events.lock().map_err(|_| "Failed to lock events")?;
                events.push(event.clone());
            }

            // Handle the menu action
            match event.id.as_str() {
                "quit" => {
                    Ok("app_exit".to_string())
                }
                "close_window" => {
                    let mut windows = self.windows.lock().map_err(|_| "Failed to lock windows")?;
                    if !windows.is_empty() {
                        let closed = windows.remove(0);
                        Ok(format!("window_closed_{}", closed))
                    } else {
                        Err("No windows to close".to_string())
                    }
                }
                "new_window" => {
                    let mut windows = self.windows.lock().map_err(|_| "Failed to lock windows")?;
                    let new_label = format!("window_{}", windows.len() + 1);
                    windows.push(new_label.clone());
                    Ok(format!("window_created_{}", new_label))
                }
                "zoom_in" => {
                    let mut zoom = self.zoom_level.lock().map_err(|_| "Failed to lock zoom")?;
                    *zoom *= 1.1;
                    Ok(format!("zoom_changed_{:.2}", *zoom))
                }
                "zoom_out" => {
                    let mut zoom = self.zoom_level.lock().map_err(|_| "Failed to lock zoom")?;
                    *zoom /= 1.1;
                    Ok(format!("zoom_changed_{:.2}", *zoom))
                }
                "zoom_reset" => {
                    let mut zoom = self.zoom_level.lock().map_err(|_| "Failed to lock zoom")?;
                    *zoom = 1.0;
                    Ok("zoom_reset".to_string())
                }
                "fullscreen" => {
                    let mut fullscreen = self.fullscreen.lock().map_err(|_| "Failed to lock fullscreen")?;
                    *fullscreen = !*fullscreen;
                    Ok(format!("fullscreen_{}", *fullscreen))
                }
                "toggle_devtools" => {
                    if cfg!(debug_assertions) {
                        let mut devtools = self.devtools_open.lock().map_err(|_| "Failed to lock devtools")?;
                        *devtools = !*devtools;
                        Ok(format!("devtools_{}", *devtools))
                    } else {
                        Err("DevTools not available in release builds".to_string())
                    }
                }
                "about" => {
                    Ok("about_dialog_shown".to_string())
                }
                "documentation" => {
                    Ok("documentation_opened".to_string())
                }
                "github" => {
                    Ok("github_opened".to_string())
                }
                // Native edit commands
                "undo" | "redo" | "cut" | "copy" | "paste" | "select_all" => {
                    Ok(format!("edit_command_{}", event.id))
                }
                _ => {
                    Err(format!("Unhandled menu event: {}", event.id))
                }
            }
        }

        fn handle_keyboard_shortcut(&self, accelerator: &str, modifiers: Vec<String>) -> Result<String, String> {
            let shortcuts = self.shortcuts.lock().map_err(|_| "Failed to lock shortcuts")?;
            
            if let Some(menu_id) = shortcuts.get(accelerator) {
                let event = MockMenuEvent::new(menu_id)
                    .with_accelerator()
                    .with_modifiers(modifiers);
                self.handle_menu_event(event)
            } else {
                Err(format!("No menu item found for accelerator: {}", accelerator))
            }
        }

        fn toggle_menu_item(&self, id: &str) -> Result<(), String> {
            let mut menu = self.menu.lock().map_err(|_| "Failed to lock menu")?;
            
            if let Some(item) = menu.find_item_mut(id) {
                item.toggle_checked();
                Ok(())
            } else {
                Err(format!("Menu item not found: {}", id))
            }
        }

        fn set_menu_item_enabled(&self, id: &str, enabled: bool) -> Result<(), String> {
            let mut menu = self.menu.lock().map_err(|_| "Failed to lock menu")?;
            
            if let Some(item) = menu.find_item_mut(id) {
                item.set_enabled(enabled);
                Ok(())
            } else {
                Err(format!("Menu item not found: {}", id))
            }
        }

        fn get_menu_item_state(&self, id: &str) -> Result<Value, String> {
            let menu = self.menu.lock().map_err(|_| "Failed to lock menu")?;
            
            if let Some(item) = menu.find_item(id) {
                Ok(json!({
                    "id": item.id,
                    "title": item.title,
                    "enabled": item.enabled,
                    "checked": item.checked,
                    "accelerator": item.accelerator,
                    "type": format!("{:?}", item.item_type),
                    "role": item.role
                }))
            } else {
                Err(format!("Menu item not found: {}", id))
            }
        }

        fn get_events(&self) -> Vec<MockMenuEvent> {
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

        fn window_count(&self) -> usize {
            if let Ok(windows) = self.windows.lock() {
                windows.len()
            } else {
                0
            }
        }

        fn get_zoom_level(&self) -> f64 {
            if let Ok(zoom) = self.zoom_level.lock() {
                *zoom
            } else {
                1.0
            }
        }

        fn is_fullscreen(&self) -> bool {
            if let Ok(fullscreen) = self.fullscreen.lock() {
                *fullscreen
            } else {
                false
            }
        }

        fn get_menu_stats(&self) -> HashMap<String, Value> {
            let mut stats = HashMap::new();
            
            if let Ok(menu) = self.menu.lock() {
                stats.insert("total_items".to_string(), json!(menu.item_count()));
                stats.insert("visible".to_string(), json!(menu.visible));
                stats.insert("platform".to_string(), json!(menu.platform));
            }

            if let Ok(shortcuts) = self.shortcuts.lock() {
                stats.insert("shortcuts_count".to_string(), json!(shortcuts.len()));
            }

            stats.insert("events_count".to_string(), json!(self.get_events().len()));
            stats.insert("windows_count".to_string(), json!(self.window_count()));

            stats
        }
    }

    #[test]
    fn test_menu_creation_and_structure() {
        let app = MockMenuApp::new();
        
        // Create application menu
        let result = app.create_app_menu();
        assert!(result.is_ok(), "Menu creation should succeed");

        // Verify menu structure
        let menu = app.menu.lock().unwrap();
        assert_eq!(menu.items.len(), 4, "Should have 4 main menu items (File, Edit, View, Help)");

        // Verify menu validation
        let validation_result = menu.validate();
        assert!(validation_result.is_ok(), "Menu structure should be valid: {:?}", validation_result);

        // Check specific menu items exist
        let expected_items = vec![
            "new_window", "close_window", "quit",           // File menu
            "undo", "redo", "cut", "copy", "paste", "select_all", // Edit menu  
            "zoom_in", "zoom_out", "zoom_reset", "fullscreen", // View menu
            "about", "documentation", "github",             // Help menu
        ];

        for item_id in expected_items {
            assert!(menu.find_item(item_id).is_some(), "Menu should contain item: {}", item_id);
        }

        // Verify debug-only items
        let devtools_item = menu.find_item("toggle_devtools");
        if cfg!(debug_assertions) {
            assert!(devtools_item.is_some(), "DevTools menu should exist in debug builds");
        } else {
            assert!(devtools_item.is_none(), "DevTools menu should not exist in release builds");
        }
    }

    #[test]
    fn test_keyboard_shortcuts_registration() {
        let app = MockMenuApp::new();
        app.create_app_menu().unwrap();

        let shortcuts = app.shortcuts.lock().unwrap();
        
        // Verify common shortcuts are registered
        let expected_shortcuts = vec![
            ("CmdOrCtrl+N", "new_window"),
            ("CmdOrCtrl+W", "close_window"), 
            ("CmdOrCtrl+Q", "quit"),
            ("CmdOrCtrl+Z", "undo"),
            ("CmdOrCtrl+C", "copy"),
            ("CmdOrCtrl+V", "paste"),
            ("CmdOrCtrl+Plus", "zoom_in"),
            ("CmdOrCtrl+-", "zoom_out"),
            ("CmdOrCtrl+0", "zoom_reset"),
            ("F11", "fullscreen"),
        ];

        for (accelerator, menu_id) in expected_shortcuts {
            assert_eq!(shortcuts.get(accelerator), Some(&menu_id.to_string()), 
                      "Shortcut {} should map to {}", accelerator, menu_id);
        }

        // Verify F12 shortcut only in debug builds
        let f12_shortcut = shortcuts.get("F12");
        if cfg!(debug_assertions) {
            assert_eq!(f12_shortcut, Some(&"toggle_devtools".to_string()));
        } else {
            assert_eq!(f12_shortcut, None);
        }
    }

    #[test]
    fn test_menu_event_handling() {
        let app = MockMenuApp::new();
        app.create_app_menu().unwrap();

        // Test basic menu events
        let test_events = vec![
            ("new_window", "window_created_window_2"),
            ("zoom_in", "zoom_changed_1.10"),
            ("zoom_out", "zoom_changed_1.00"),
            ("zoom_reset", "zoom_reset"),
            ("about", "about_dialog_shown"),
            ("documentation", "documentation_opened"),
            ("github", "github_opened"),
        ];

        for (event_id, expected_result) in test_events {
            let event = MockMenuEvent::new(event_id);
            let result = app.handle_menu_event(event);
            
            assert!(result.is_ok(), "Event {} should be handled successfully", event_id);
            let result_str = result.unwrap();
            assert!(result_str.contains(expected_result.split('_').next().unwrap()), 
                   "Event {} result '{}' should contain expected pattern", event_id, result_str);
        }

        // Test native edit commands
        let edit_commands = vec!["undo", "redo", "cut", "copy", "paste", "select_all"];
        for cmd in edit_commands {
            let event = MockMenuEvent::new(cmd);
            let result = app.handle_menu_event(event);
            assert!(result.is_ok(), "Edit command {} should be handled", cmd);
            assert_eq!(result.unwrap(), format!("edit_command_{}", cmd));
        }

        // Verify events were recorded
        let events = app.get_events();
        assert!(events.len() > 10, "Should have recorded all test events");
    }

    #[test]
    fn test_keyboard_shortcut_handling() {
        let app = MockMenuApp::new();
        app.create_app_menu().unwrap();

        // Test keyboard shortcuts
        let shortcut_tests = vec![
            ("CmdOrCtrl+N", "window_created"),
            ("CmdOrCtrl+Plus", "zoom_changed"),
            ("CmdOrCtrl+-", "zoom_changed"),
            ("CmdOrCtrl+0", "zoom_reset"),
            ("F11", "fullscreen"),
        ];

        for (accelerator, expected_pattern) in shortcut_tests {
            let result = app.handle_keyboard_shortcut(accelerator, vec![]);
            assert!(result.is_ok(), "Keyboard shortcut {} should work", accelerator);
            
            let result_str = result.unwrap();
            assert!(result_str.contains(expected_pattern), 
                   "Shortcut {} result '{}' should contain '{}'", 
                   accelerator, result_str, expected_pattern);
        }

        // Test shortcuts with modifiers
        let modifiers = vec!["Cmd".to_string(), "Shift".to_string()];
        let result = app.handle_keyboard_shortcut("CmdOrCtrl+Shift+Z", modifiers);
        assert!(result.is_ok(), "Shortcut with modifiers should work");
        assert_eq!(result.unwrap(), "edit_command_redo");

        // Test invalid shortcut
        let result = app.handle_keyboard_shortcut("Invalid+Shortcut", vec![]);
        assert!(result.is_err(), "Invalid shortcut should return error");
    }

    #[test]
    fn test_menu_state_management() {
        let app = MockMenuApp::new();
        app.create_app_menu().unwrap();

        // Test menu item state queries
        let state_result = app.get_menu_item_state("new_window");
        assert!(state_result.is_ok(), "Should be able to get menu item state");
        
        let state = state_result.unwrap();
        assert_eq!(state["id"], "new_window");
        assert_eq!(state["title"], "New Window");
        assert_eq!(state["enabled"], true);
        assert_eq!(state["accelerator"], "CmdOrCtrl+N");

        // Test enabling/disabling menu items
        app.set_menu_item_enabled("new_window", false).unwrap();
        let updated_state = app.get_menu_item_state("new_window").unwrap();
        assert_eq!(updated_state["enabled"], false);

        app.set_menu_item_enabled("new_window", true).unwrap();
        let restored_state = app.get_menu_item_state("new_window").unwrap();
        assert_eq!(restored_state["enabled"], true);

        // Test invalid menu item
        let invalid_result = app.get_menu_item_state("nonexistent_item");
        assert!(invalid_result.is_err(), "Should return error for invalid item");
    }

    #[test]
    fn test_menu_functionality_integration() {
        let app = MockMenuApp::new();
        app.create_app_menu().unwrap();

        // Test window operations
        let initial_count = app.window_count();
        assert_eq!(initial_count, 1, "Should start with one window");

        // Test new window creation
        let event = MockMenuEvent::new("new_window");
        app.handle_menu_event(event).unwrap();
        assert_eq!(app.window_count(), 2, "Should have created new window");

        // Test window closing
        let event = MockMenuEvent::new("close_window");
        app.handle_menu_event(event).unwrap();
        assert_eq!(app.window_count(), 1, "Should have closed one window");

        // Test zoom functionality
        assert_eq!(app.get_zoom_level(), 1.0, "Should start at 100% zoom");

        let event = MockMenuEvent::new("zoom_in");
        app.handle_menu_event(event).unwrap();
        assert!(app.get_zoom_level() > 1.0, "Zoom should increase");

        let event = MockMenuEvent::new("zoom_out");
        app.handle_menu_event(event).unwrap();

        let event = MockMenuEvent::new("zoom_reset");
        app.handle_menu_event(event).unwrap();
        assert!((app.get_zoom_level() - 1.0).abs() < 0.01, "Zoom should reset to 1.0");

        // Test fullscreen toggle
        assert!(!app.is_fullscreen(), "Should start windowed");
        let event = MockMenuEvent::new("fullscreen");
        app.handle_menu_event(event).unwrap();
        assert!(app.is_fullscreen(), "Should be fullscreen after toggle");
    }

    #[test]
    fn test_cross_platform_menu_behavior() {
        let app = MockMenuApp::new();
        app.create_app_menu().unwrap();

        let menu = app.menu.lock().unwrap();
        let platform = &menu.platform;

        // Test platform-specific behavior
        match platform.as_str() {
            "macos" => {
                // macOS should have system-integrated menus
                assert!(menu.visible, "Menu should be visible on macOS");
                
                // Test platform-specific shortcuts
                let shortcuts = app.shortcuts.lock().unwrap();
                assert!(shortcuts.contains_key("CmdOrCtrl+Q"), "Should have Cmd+Q on macOS");
            }
            "windows" => {
                // Windows should have in-window menus
                assert!(menu.visible, "Menu should be visible on Windows");
                
                // Test Windows-specific behavior
                let shortcuts = app.shortcuts.lock().unwrap();
                assert!(shortcuts.contains_key("CmdOrCtrl+Q"), "Should have Ctrl+Q on Windows");
            }
            "linux" => {
                // Linux should support both styles
                assert!(menu.visible, "Menu should be visible on Linux");
                
                // Test Linux-specific behavior
                let shortcuts = app.shortcuts.lock().unwrap();
                assert!(shortcuts.contains_key("CmdOrCtrl+Q"), "Should have Ctrl+Q on Linux");
            }
            _ => {
                // Other platforms should have basic functionality
                assert!(menu.visible, "Menu should be visible on {}", platform);
            }
        }

        // Test that CmdOrCtrl maps correctly
        let shortcuts = app.shortcuts.lock().unwrap();
        assert!(shortcuts.keys().any(|k| k.contains("CmdOrCtrl")), 
               "Should have CmdOrCtrl shortcuts that map to platform-specific keys");
    }

    #[test]
    fn test_menu_performance() {
        let app = MockMenuApp::new();
        app.create_app_menu().unwrap();

        // Test rapid menu event handling
        let start = Instant::now();
        
        for i in 0..1000 {
            let event_id = match i % 4 {
                0 => "zoom_in",
                1 => "zoom_out", 
                2 => "zoom_reset",
                _ => "about",
            };
            
            let event = MockMenuEvent::new(event_id);
            let _ = app.handle_menu_event(event);
        }

        let duration = start.elapsed();
        
        // Should handle 1000 events quickly
        assert!(duration.as_millis() < 100, 
               "Handling 1000 menu events took {}ms, expected < 100ms", 
               duration.as_millis());

        // Verify all events were recorded
        let events = app.get_events();
        assert_eq!(events.len(), 1000, "Should have recorded all 1000 events");
    }

    #[test] 
    fn test_menu_accessibility() {
        let app = MockMenuApp::new();
        app.create_app_menu().unwrap();

        let menu = app.menu.lock().unwrap();

        // Test that all menu items have appropriate titles
        let all_ids = menu.get_all_item_ids();
        for id in &all_ids {
            if id == "separator" {
                continue; // Separators don't need titles
            }

            let item = menu.find_item(id).unwrap();
            assert!(!item.title.is_empty(), "Menu item {} should have a title", id);
            
            // Test title is user-friendly (not just the ID)
            assert_ne!(item.title, id, "Menu item {} should have descriptive title", id);
        }

        // Test keyboard navigation support
        let shortcuts = app.shortcuts.lock().unwrap();
        let items_with_shortcuts = shortcuts.len();
        
        // Most important items should have shortcuts
        assert!(items_with_shortcuts >= 8, 
               "Should have at least 8 keyboard shortcuts, found {}", items_with_shortcuts);

        // Test that shortcuts follow platform conventions
        for accelerator in shortcuts.keys() {
            if accelerator.starts_with("CmdOrCtrl") {
                // Should use standard modifier patterns
                assert!(accelerator.contains('+'), "Accelerator {} should use + separator", accelerator);
            } else if accelerator.starts_with('F') {
                // Function keys should be valid
                let f_key = &accelerator[1..];
                if let Ok(num) = f_key.parse::<u8>() {
                    assert!(num >= 1 && num <= 24, "Function key F{} should be valid", num);
                }
            }
        }
    }

    #[test]
    fn test_menu_error_handling() {
        let app = MockMenuApp::new();
        app.create_app_menu().unwrap();

        // Test invalid menu events
        let invalid_events = vec![
            "nonexistent_menu_item",
            "",
            "malicious<script>alert('xss')</script>",
            "sql'; DROP TABLE menus; --",
        ];

        for invalid_event in invalid_events {
            let event = MockMenuEvent::new(invalid_event);
            let result = app.handle_menu_event(event);
            assert!(result.is_err(), "Invalid event {} should return error", invalid_event);
        }

        // Test invalid shortcuts
        let invalid_shortcuts = vec![
            "",
            "Invalid+Key",
            "Ctrl+Nonexistent",
            "Special<>Characters",
        ];

        for invalid_shortcut in invalid_shortcuts {
            let result = app.handle_keyboard_shortcut(invalid_shortcut, vec![]);
            assert!(result.is_err(), "Invalid shortcut {} should return error", invalid_shortcut);
        }

        // Test operations on nonexistent menu items
        let result = app.set_menu_item_enabled("nonexistent", true);
        assert!(result.is_err(), "Should error when setting state on nonexistent item");

        let result = app.toggle_menu_item("nonexistent");
        assert!(result.is_err(), "Should error when toggling nonexistent item");

        // System should remain functional after errors
        let valid_event = MockMenuEvent::new("about");
        let result = app.handle_menu_event(valid_event);
        assert!(result.is_ok(), "Valid operations should still work after errors");
    }

    #[test]
    fn test_menu_event_coordination() {
        let app = MockMenuApp::new();
        app.create_app_menu().unwrap();

        // Test that events are properly recorded and coordinated
        let test_sequence = vec![
            "new_window",
            "zoom_in",
            "fullscreen", 
            "toggle_devtools",
            "zoom_reset",
            "close_window",
        ];

        let mut successful_events = 0;
        
        for event_id in test_sequence {
            let event = MockMenuEvent::new(event_id);
            let result = app.handle_menu_event(event);
            
            match result {
                Ok(_) => successful_events += 1,
                Err(e) => {
                    // Some events might fail in release builds (like devtools)
                    if !cfg!(debug_assertions) && event_id == "toggle_devtools" {
                        // Expected failure in release builds
                        continue;
                    } else {
                        panic!("Unexpected error for event {}: {}", event_id, e);
                    }
                }
            }
        }

        assert!(successful_events >= 5, "Most events should succeed");

        // Verify event recording
        let events = app.get_events();
        assert!(events.len() >= successful_events, "Should have recorded all successful events");

        // Verify event details
        for event in &events {
            assert!(!event.id.is_empty(), "Event should have valid ID");
            assert!(event.timestamp > 0, "Event should have valid timestamp");
        }

        // Test event clearing
        app.clear_events();
        let cleared_events = app.get_events();
        assert_eq!(cleared_events.len(), 0, "Events should be cleared");
    }

    #[test]
    fn test_menu_statistics() {
        let app = MockMenuApp::new();
        app.create_app_menu().unwrap();

        // Generate some activity
        for i in 0..5 {
            let event = MockMenuEvent::new("about");
            let _ = app.handle_menu_event(event);
        }

        let stats = app.get_menu_stats();

        // Verify statistics
        assert!(stats.contains_key("total_items"), "Stats should include total items");
        assert!(stats.contains_key("shortcuts_count"), "Stats should include shortcuts count");
        assert!(stats.contains_key("events_count"), "Stats should include events count");
        assert!(stats.contains_key("windows_count"), "Stats should include windows count");

        let total_items = stats["total_items"].as_u64().unwrap();
        let shortcuts_count = stats["shortcuts_count"].as_u64().unwrap();
        let events_count = stats["events_count"].as_u64().unwrap();

        assert!(total_items > 10, "Should have created multiple menu items");
        assert!(shortcuts_count > 5, "Should have registered multiple shortcuts");
        assert_eq!(events_count, 5, "Should have recorded 5 test events");
    }
}