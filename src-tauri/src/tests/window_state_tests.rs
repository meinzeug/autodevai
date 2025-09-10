//! Comprehensive Tests for Window State Management
//! 
//! This module provides extensive testing for the window state management system,
//! including state persistence, restoration, and edge case handling.

#[cfg(test)]
mod window_state_tests {
    use crate::window_state::{WindowState, WindowStateManager};
    use std::collections::HashMap;
    use tempfile::tempdir;

    // Mock Window struct for testing
    struct MockWindow {
        width: u32,
        height: u32,
        x: i32,
        y: i32,
        maximized: bool,
        fullscreen: bool,
    }

    impl MockWindow {
        fn new(width: u32, height: u32, x: i32, y: i32) -> Self {
            Self {
                width,
                height,
                x,
                y,
                maximized: false,
                fullscreen: false,
            }
        }

        // Mock Tauri window methods
        fn inner_size(&self) -> Result<tauri::PhysicalSize<u32>, String> {
            Ok(tauri::PhysicalSize {
                width: self.width,
                height: self.height,
            })
        }

        fn outer_position(&self) -> Result<tauri::PhysicalPosition<i32>, String> {
            Ok(tauri::PhysicalPosition {
                x: self.x,
                y: self.y,
            })
        }

        fn is_maximized(&self) -> Result<bool, String> {
            Ok(self.maximized)
        }

        fn is_fullscreen(&self) -> Result<bool, String> {
            Ok(self.fullscreen)
        }

        fn set_size(&mut self, size: tauri::LogicalSize<f64>) -> Result<(), String> {
            self.width = size.width as u32;
            self.height = size.height as u32;
            Ok(())
        }

        fn set_position(&mut self, position: tauri::LogicalPosition<f64>) -> Result<(), String> {
            self.x = position.x as i32;
            self.y = position.y as i32;
            Ok(())
        }

        fn maximize(&mut self) -> Result<(), String> {
            self.maximized = true;
            Ok(())
        }

        fn set_fullscreen(&mut self, fullscreen: bool) -> Result<(), String> {
            self.fullscreen = fullscreen;
            Ok(())
        }
    }

    #[test]
    fn test_window_state_default() {
        let state = WindowState::default();
        
        assert_eq!(state.width, 1200.0);
        assert_eq!(state.height, 800.0);
        assert_eq!(state.x, None);
        assert_eq!(state.y, None);
        assert_eq!(state.maximized, false);
        assert_eq!(state.fullscreen, false);
    }

    #[test]
    fn test_window_state_manager_new() {
        let manager = WindowStateManager::new();
        
        // Manager should start with empty state
        assert_eq!(manager.states.len(), 0);
    }

    #[test]
    fn test_save_window_state_basic() {
        let mut manager = WindowStateManager::new();
        
        // Create a test window state
        let test_state = WindowState {
            width: 1400.0,
            height: 900.0,
            x: Some(100.0),
            y: Some(200.0),
            maximized: false,
            fullscreen: false,
        };

        // Manually add state (simulating window save)
        manager.states.insert("test_window".to_string(), test_state.clone());

        // Verify state was saved
        let saved_state = manager.states.get("test_window");
        assert!(saved_state.is_some());
        
        let saved_state = saved_state.unwrap();
        assert_eq!(saved_state.width, 1400.0);
        assert_eq!(saved_state.height, 900.0);
        assert_eq!(saved_state.x, Some(100.0));
        assert_eq!(saved_state.y, Some(200.0));
    }

    #[test]
    fn test_multiple_window_states() {
        let mut manager = WindowStateManager::new();
        
        // Create multiple window states
        let main_state = WindowState {
            width: 1200.0,
            height: 800.0,
            x: Some(0.0),
            y: Some(0.0),
            maximized: false,
            fullscreen: false,
        };
        
        let dev_state = WindowState {
            width: 1000.0,
            height: 700.0,
            x: Some(300.0),
            y: Some(100.0),
            maximized: true,
            fullscreen: false,
        };

        manager.states.insert("main".to_string(), main_state.clone());
        manager.states.insert("dev_tools".to_string(), dev_state.clone());

        // Verify both states exist
        assert_eq!(manager.states.len(), 2);
        assert!(manager.states.contains_key("main"));
        assert!(manager.states.contains_key("dev_tools"));
        
        // Verify state contents
        let main = manager.states.get("main").unwrap();
        assert_eq!(main.maximized, false);
        
        let dev = manager.states.get("dev_tools").unwrap();
        assert_eq!(dev.maximized, true);
        assert_eq!(dev.width, 1000.0);
    }

    #[test]
    fn test_window_state_edge_cases() {
        let mut manager = WindowStateManager::new();
        
        // Test edge case: negative positions
        let negative_pos_state = WindowState {
            width: 800.0,
            height: 600.0,
            x: Some(-100.0),
            y: Some(-50.0),
            maximized: false,
            fullscreen: false,
        };
        
        manager.states.insert("negative_pos".to_string(), negative_pos_state);
        let state = manager.states.get("negative_pos").unwrap();
        assert_eq!(state.x, Some(-100.0));
        assert_eq!(state.y, Some(-50.0));

        // Test edge case: very large dimensions
        let large_state = WindowState {
            width: 9999.0,
            height: 9999.0,
            x: Some(0.0),
            y: Some(0.0),
            maximized: false,
            fullscreen: false,
        };
        
        manager.states.insert("large_window".to_string(), large_state);
        let state = manager.states.get("large_window").unwrap();
        assert_eq!(state.width, 9999.0);
        assert_eq!(state.height, 9999.0);

        // Test edge case: minimum dimensions
        let small_state = WindowState {
            width: 1.0,
            height: 1.0,
            x: Some(0.0),
            y: Some(0.0),
            maximized: false,
            fullscreen: false,
        };
        
        manager.states.insert("tiny_window".to_string(), small_state);
        let state = manager.states.get("tiny_window").unwrap();
        assert_eq!(state.width, 1.0);
        assert_eq!(state.height, 1.0);
    }

    #[test]
    fn test_window_state_combinations() {
        let mut manager = WindowStateManager::new();
        
        // Test maximized + fullscreen (should handle gracefully)
        let combined_state = WindowState {
            width: 1920.0,
            height: 1080.0,
            x: Some(0.0),
            y: Some(0.0),
            maximized: true,
            fullscreen: true,
        };
        
        manager.states.insert("combined".to_string(), combined_state);
        let state = manager.states.get("combined").unwrap();
        assert_eq!(state.maximized, true);
        assert_eq!(state.fullscreen, true);
    }

    #[test]
    fn test_state_serialization() {
        let state = WindowState {
            width: 1600.0,
            height: 1200.0,
            x: Some(150.0),
            y: Some(75.0),
            maximized: true,
            fullscreen: false,
        };

        // Test JSON serialization
        let json = serde_json::to_string(&state).unwrap();
        assert!(json.contains("1600"));
        assert!(json.contains("1200"));
        assert!(json.contains("150"));
        assert!(json.contains("75"));
        assert!(json.contains("true")); // maximized
        
        // Test deserialization
        let deserialized: WindowState = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.width, state.width);
        assert_eq!(deserialized.height, state.height);
        assert_eq!(deserialized.x, state.x);
        assert_eq!(deserialized.y, state.y);
        assert_eq!(deserialized.maximized, state.maximized);
        assert_eq!(deserialized.fullscreen, state.fullscreen);
    }

    #[test]
    fn test_window_state_validation() {
        // Test that WindowState can handle various input values
        let states = vec![
            WindowState {
                width: 0.0, // Should handle zero width
                height: 0.0,
                x: None,
                y: None,
                maximized: false,
                fullscreen: false,
            },
            WindowState {
                width: f64::MAX, // Should handle extreme values
                height: f64::MAX,
                x: Some(f64::MIN),
                y: Some(f64::MAX),
                maximized: true,
                fullscreen: true,
            },
        ];

        for (i, state) in states.iter().enumerate() {
            // Should be able to serialize/deserialize without panic
            let json = serde_json::to_string(state);
            assert!(json.is_ok(), "Failed to serialize state {}", i);
            
            if let Ok(json_str) = json {
                let deserialized: Result<WindowState, _> = serde_json::from_str(&json_str);
                assert!(deserialized.is_ok(), "Failed to deserialize state {}", i);
            }
        }
    }

    #[test]
    fn test_window_label_handling() {
        let mut manager = WindowStateManager::new();
        
        // Test various label formats
        let labels = vec![
            "main",
            "dev-tools",
            "window_123",
            "UPPERCASE",
            "special-chars!@#",
            "",  // Empty label
            "very_long_label_name_that_exceeds_normal_expectations_and_tests_boundary_conditions",
        ];

        for label in labels {
            let state = WindowState::default();
            manager.states.insert(label.to_string(), state.clone());
            
            // Verify state was stored with the exact label
            assert!(manager.states.contains_key(label));
            let retrieved_state = manager.states.get(label).unwrap();
            assert_eq!(retrieved_state.width, state.width);
        }
    }

    #[test]
    fn test_concurrent_access_simulation() {
        // Simulate concurrent access to window state manager
        let mut manager = WindowStateManager::new();
        
        // Add multiple states rapidly
        for i in 0..100 {
            let label = format!("window_{}", i);
            let state = WindowState {
                width: 800.0 + i as f64,
                height: 600.0 + i as f64,
                x: Some(i as f64 * 10.0),
                y: Some(i as f64 * 5.0),
                maximized: i % 2 == 0,
                fullscreen: i % 3 == 0,
            };
            manager.states.insert(label.clone(), state.clone());
        }

        // Verify all states were stored correctly
        assert_eq!(manager.states.len(), 100);
        
        // Verify random samples
        let test_indices = [0, 25, 50, 75, 99];
        for &i in &test_indices {
            let label = format!("window_{}", i);
            let state = manager.states.get(&label).unwrap();
            assert_eq!(state.width, 800.0 + i as f64);
            assert_eq!(state.height, 600.0 + i as f64);
            assert_eq!(state.maximized, i % 2 == 0);
            assert_eq!(state.fullscreen, i % 3 == 0);
        }
    }

    #[test]
    fn test_default_state_fallback() {
        let manager = WindowStateManager::new();
        
        // Test that load_state returns default for non-existent windows
        let default_state = manager.load_state("non_existent_window");
        assert!(default_state.is_some());
        
        let state = default_state.unwrap();
        assert_eq!(state.width, 1200.0);
        assert_eq!(state.height, 800.0);
    }
}

#[cfg(test)]
mod integration_tests {
    use super::*;
    use std::sync::{Arc, Mutex};
    use std::thread;
    use std::time::Duration;

    #[test]
    fn test_thread_safety() {
        let manager = Arc::new(Mutex::new(WindowStateManager::new()));
        let mut handles = vec![];

        // Spawn multiple threads that modify the window state manager
        for i in 0..10 {
            let manager_clone = Arc::clone(&manager);
            let handle = thread::spawn(move || {
                let state = WindowState {
                    width: 1000.0 + i as f64,
                    height: 800.0 + i as f64,
                    x: Some(i as f64 * 100.0),
                    y: Some(i as f64 * 50.0),
                    maximized: false,
                    fullscreen: false,
                };
                
                let label = format!("thread_window_{}", i);
                {
                    let mut manager = manager_clone.lock().unwrap();
                    manager.states.insert(label.clone(), state);
                }
                
                // Small delay to increase chance of race conditions
                thread::sleep(Duration::from_millis(1));
                
                // Verify the state is still there
                {
                    let manager = manager_clone.lock().unwrap();
                    assert!(manager.states.contains_key(&label));
                }
            });
            handles.push(handle);
        }

        // Wait for all threads to complete
        for handle in handles {
            handle.join().expect("Thread panicked");
        }

        // Verify all states were stored
        let manager = manager.lock().unwrap();
        assert_eq!(manager.states.len(), 10);
        
        for i in 0..10 {
            let label = format!("thread_window_{}", i);
            assert!(manager.states.contains_key(&label));
        }
    }
}