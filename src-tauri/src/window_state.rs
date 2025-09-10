// Window state management for AutoDev-AI Neural Bridge Platform

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{AppHandle, LogicalSize, Manager, Runtime, Window};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub width: f64,
    pub height: f64,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub maximized: bool,
    pub fullscreen: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            width: 1200.0,
            height: 800.0,
            x: None,
            y: None,
            maximized: false,
            fullscreen: false,
        }
    }
}

pub struct WindowStateManager {
    states: HashMap<String, WindowState>,
}

impl WindowStateManager {
    pub fn new() -> Self {
        Self {
            states: HashMap::new(),
        }
    }

    pub fn save_window_state(&mut self, label: &str, window: &Window) {
        if let Ok(size) = window.inner_size() {
            if let Ok(position) = window.outer_position() {
                let state = WindowState {
                    width: size.width as f64,
                    height: size.height as f64,
                    x: Some(position.x as f64),
                    y: Some(position.y as f64),
                    maximized: window.is_maximized().unwrap_or(false),
                    fullscreen: window.is_fullscreen().unwrap_or(false),
                };
                
                self.states.insert(label.to_string(), state);
                
                // Persist to file system
                self.persist_state(label, &state);
            }
        }
    }

    pub fn restore_window_state(&mut self, label: &str, window: &Window) {
        // Load persisted state
        if let Some(state) = self.load_state(label) {
            self.states.insert(label.to_string(), state.clone());
            self.apply_window_state(window, &state);
        }
    }

    fn apply_window_state(&self, window: &Window, state: &WindowState) {
        let _ = window.set_size(LogicalSize {
            width: state.width,
            height: state.height,
        });

        if let (Some(x), Some(y)) = (state.x, state.y) {
            let _ = window.set_position(tauri::LogicalPosition { x, y });
        }

        if state.maximized {
            let _ = window.maximize();
        }

        if state.fullscreen {
            let _ = window.set_fullscreen(true);
        }
    }

    fn persist_state(&self, _label: &str, _state: &WindowState) {
        // In production, this would save to a config file
        // For now, we'll skip file I/O
    }

    fn load_state(&self, _label: &str) -> Option<WindowState> {
        // In production, this would load from a config file
        // For now, return default state
        Some(WindowState::default())
    }
}

pub fn setup_window_state<R: Runtime>(app: &AppHandle<R>) {
    println!("Window state management initialized");
}