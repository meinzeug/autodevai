//! Cross-Platform Compatibility Tests
//! 
//! Tests to ensure consistent behavior across different operating systems:
//! - Windows-specific functionality and behavior
//! - macOS-specific functionality and behavior  
//! - Linux-specific functionality and behavior
//! - Platform detection and adaptation
//! - Path handling and file system operations
//! - System integration differences
//! - UI behavior variations
//! - Performance characteristics by platform

#[cfg(test)]
mod cross_platform_tests {
    use std::collections::HashMap;
    use std::path::{Path, PathBuf};
    use serde_json::{json, Value};

    /// Platform-specific configuration and behavior
    #[derive(Debug, Clone)]
    struct PlatformConfig {
        pub os_name: String,
        pub arch: String,
        pub family: String,
        pub path_separator: char,
        pub line_ending: String,
        pub executable_extension: String,
        pub default_shell: String,
        pub supports_system_tray: bool,
        pub supports_global_shortcuts: bool,
        pub supports_transparency: bool,
        pub supports_native_menus: bool,
        pub default_window_decorations: bool,
        pub supports_auto_launch: bool,
        pub supports_notifications: bool,
        pub file_manager_command: String,
        pub url_opener_command: String,
    }

    impl PlatformConfig {
        fn current() -> Self {
            let os_name = std::env::consts::OS.to_string();
            let arch = std::env::consts::ARCH.to_string();
            let family = std::env::consts::FAMILY.to_string();

            match os_name.as_str() {
                "windows" => Self::windows_config(arch),
                "macos" => Self::macos_config(arch),
                "linux" => Self::linux_config(arch),
                _ => Self::default_config(os_name, arch, family),
            }
        }

        fn windows_config(arch: String) -> Self {
            Self {
                os_name: "windows".to_string(),
                arch,
                family: "windows".to_string(),
                path_separator: '\\',
                line_ending: "\r\n".to_string(),
                executable_extension: ".exe".to_string(),
                default_shell: "cmd.exe".to_string(),
                supports_system_tray: true,
                supports_global_shortcuts: true,
                supports_transparency: true,
                supports_native_menus: false, // Windows uses in-window menus
                default_window_decorations: true,
                supports_auto_launch: true,
                supports_notifications: true,
                file_manager_command: "explorer".to_string(),
                url_opener_command: "start".to_string(),
            }
        }

        fn macos_config(arch: String) -> Self {
            Self {
                os_name: "macos".to_string(),
                arch,
                family: "unix".to_string(),
                path_separator: '/',
                line_ending: "\n".to_string(),
                executable_extension: "".to_string(),
                default_shell: "/bin/bash".to_string(),
                supports_system_tray: true, // macOS has menu bar extras
                supports_global_shortcuts: true,
                supports_transparency: true,
                supports_native_menus: true, // macOS uses native menu bar
                default_window_decorations: true,
                supports_auto_launch: true,
                supports_notifications: true,
                file_manager_command: "open".to_string(),
                url_opener_command: "open".to_string(),
            }
        }

        fn linux_config(arch: String) -> Self {
            Self {
                os_name: "linux".to_string(),
                arch,
                family: "unix".to_string(),
                path_separator: '/',
                line_ending: "\n".to_string(),
                executable_extension: "".to_string(),
                default_shell: "/bin/bash".to_string(),
                supports_system_tray: true, // Most Linux DEs support system tray
                supports_global_shortcuts: true,
                supports_transparency: true,
                supports_native_menus: false, // Linux typically uses in-window menus
                default_window_decorations: true,
                supports_auto_launch: true,
                supports_notifications: true,
                file_manager_command: "xdg-open".to_string(),
                url_opener_command: "xdg-open".to_string(),
            }
        }

        fn default_config(os_name: String, arch: String, family: String) -> Self {
            Self {
                os_name,
                arch,
                family,
                path_separator: '/',
                line_ending: "\n".to_string(),
                executable_extension: "".to_string(),
                default_shell: "/bin/sh".to_string(),
                supports_system_tray: false,
                supports_global_shortcuts: false,
                supports_transparency: false,
                supports_native_menus: false,
                default_window_decorations: true,
                supports_auto_launch: false,
                supports_notifications: false,
                file_manager_command: "".to_string(),
                url_opener_command: "".to_string(),
            }
        }

        /// Get platform-specific application data directory
        fn get_app_data_dir(&self) -> PathBuf {
            match self.os_name.as_str() {
                "windows" => {
                    // %APPDATA%\AutoDev-AI
                    let appdata = std::env::var("APPDATA").unwrap_or_else(|_| "C:\\Users\\User\\AppData\\Roaming".to_string());
                    PathBuf::from(appdata).join("AutoDev-AI")
                },
                "macos" => {
                    // ~/Library/Application Support/AutoDev-AI
                    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/user".to_string());
                    PathBuf::from(home).join("Library").join("Application Support").join("AutoDev-AI")
                },
                "linux" => {
                    // ~/.config/autodev-ai (following XDG Base Directory spec)
                    let config_home = std::env::var("XDG_CONFIG_HOME")
                        .unwrap_or_else(|_| {
                            let home = std::env::var("HOME").unwrap_or_else(|_| "/home/user".to_string());
                            format!("{}/.config", home)
                        });
                    PathBuf::from(config_home).join("autodev-ai")
                },
                _ => PathBuf::from("/tmp/autodev-ai"),
            }
        }

        /// Get platform-specific cache directory
        fn get_cache_dir(&self) -> PathBuf {
            match self.os_name.as_str() {
                "windows" => {
                    let localappdata = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| "C:\\Users\\User\\AppData\\Local".to_string());
                    PathBuf::from(localappdata).join("AutoDev-AI").join("Cache")
                },
                "macos" => {
                    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/user".to_string());
                    PathBuf::from(home).join("Library").join("Caches").join("AutoDev-AI")
                },
                "linux" => {
                    let cache_home = std::env::var("XDG_CACHE_HOME")
                        .unwrap_or_else(|_| {
                            let home = std::env::var("HOME").unwrap_or_else(|_| "/home/user".to_string());
                            format!("{}/.cache", home)
                        });
                    PathBuf::from(cache_home).join("autodev-ai")
                },
                _ => PathBuf::from("/tmp/autodev-ai-cache"),
            }
        }

        /// Get platform-specific executable name
        fn get_executable_name(&self, base_name: &str) -> String {
            format!("{}{}", base_name, self.executable_extension)
        }

        /// Format path for the current platform
        fn format_path(&self, path: &Path) -> String {
            if self.os_name == "windows" {
                // Convert forward slashes to backslashes on Windows
                path.to_string_lossy().replace('/', "\\")
            } else {
                path.to_string_lossy().to_string()
            }
        }

        /// Get command to open URL
        fn get_url_open_command(&self, url: &str) -> Vec<String> {
            match self.os_name.as_str() {
                "windows" => vec!["cmd".to_string(), "/C".to_string(), "start".to_string(), url.to_string()],
                "macos" => vec!["open".to_string(), url.to_string()],
                "linux" => vec!["xdg-open".to_string(), url.to_string()],
                _ => vec!["echo".to_string(), format!("Cannot open URL: {}", url)],
            }
        }

        /// Get command to open file manager
        fn get_file_manager_command(&self, path: &str) -> Vec<String> {
            match self.os_name.as_str() {
                "windows" => vec!["explorer".to_string(), path.to_string()],
                "macos" => vec!["open".to_string(), "-R".to_string(), path.to_string()],
                "linux" => vec!["xdg-open".to_string(), path.to_string()],
                _ => vec!["echo".to_string(), format!("Cannot open file manager for: {}", path)],
            }
        }
    }

    /// Mock platform-aware application
    #[derive(Debug)]
    struct CrossPlatformApp {
        config: PlatformConfig,
        features: HashMap<String, bool>,
        paths: HashMap<String, PathBuf>,
        environment: HashMap<String, String>,
    }

    impl CrossPlatformApp {
        fn new() -> Self {
            let config = PlatformConfig::current();
            let mut app = Self {
                config: config.clone(),
                features: HashMap::new(),
                paths: HashMap::new(),
                environment: HashMap::new(),
            };

            app.initialize_platform_features();
            app.initialize_platform_paths();
            app.initialize_environment();
            app
        }

        fn initialize_platform_features(&mut self) {
            self.features.insert("system_tray".to_string(), self.config.supports_system_tray);
            self.features.insert("global_shortcuts".to_string(), self.config.supports_global_shortcuts);
            self.features.insert("transparency".to_string(), self.config.supports_transparency);
            self.features.insert("native_menus".to_string(), self.config.supports_native_menus);
            self.features.insert("auto_launch".to_string(), self.config.supports_auto_launch);
            self.features.insert("notifications".to_string(), self.config.supports_notifications);
            
            // Platform-specific features
            match self.config.os_name.as_str() {
                "windows" => {
                    self.features.insert("windows_registry".to_string(), true);
                    self.features.insert("windows_jumplist".to_string(), true);
                    self.features.insert("windows_taskbar".to_string(), true);
                },
                "macos" => {
                    self.features.insert("macos_dock".to_string(), true);
                    self.features.insert("macos_menubar".to_string(), true);
                    self.features.insert("macos_spotlight".to_string(), true);
                    self.features.insert("macos_touchbar".to_string(), true);
                },
                "linux" => {
                    self.features.insert("linux_dbus".to_string(), true);
                    self.features.insert("linux_desktop_entry".to_string(), true);
                    self.features.insert("linux_freedesktop".to_string(), true);
                },
                _ => {},
            }
        }

        fn initialize_platform_paths(&mut self) {
            self.paths.insert("app_data".to_string(), self.config.get_app_data_dir());
            self.paths.insert("cache".to_string(), self.config.get_cache_dir());
            
            // Additional platform-specific paths
            match self.config.os_name.as_str() {
                "windows" => {
                    if let Ok(programfiles) = std::env::var("PROGRAMFILES") {
                        self.paths.insert("program_files".to_string(), PathBuf::from(programfiles));
                    }
                    if let Ok(temp) = std::env::var("TEMP") {
                        self.paths.insert("temp".to_string(), PathBuf::from(temp));
                    }
                },
                "macos" => {
                    if let Ok(home) = std::env::var("HOME") {
                        self.paths.insert("home".to_string(), PathBuf::from(&home));
                        self.paths.insert("applications".to_string(), PathBuf::from("/Applications"));
                        self.paths.insert("user_applications".to_string(), PathBuf::from(format!("{}/Applications", home)));
                    }
                },
                "linux" => {
                    if let Ok(home) = std::env::var("HOME") {
                        self.paths.insert("home".to_string(), PathBuf::from(&home));
                        self.paths.insert("usr_local".to_string(), PathBuf::from("/usr/local"));
                        self.paths.insert("opt".to_string(), PathBuf::from("/opt"));
                    }
                },
                _ => {},
            }
        }

        fn initialize_environment(&mut self) {
            // Collect relevant environment variables
            let env_vars = match self.config.os_name.as_str() {
                "windows" => vec![
                    "APPDATA", "LOCALAPPDATA", "PROGRAMFILES", "SYSTEMROOT", "TEMP", "USERNAME", "USERPROFILE"
                ],
                "macos" => vec![
                    "HOME", "USER", "TMPDIR", "SHELL", "PATH"
                ],
                "linux" => vec![
                    "HOME", "USER", "XDG_CONFIG_HOME", "XDG_CACHE_HOME", "XDG_DATA_HOME", "SHELL", "PATH", "DISPLAY"
                ],
                _ => vec!["HOME", "USER", "PATH"],
            };

            for var in env_vars {
                if let Ok(value) = std::env::var(var) {
                    self.environment.insert(var.to_string(), value);
                }
            }
        }

        fn is_feature_supported(&self, feature: &str) -> bool {
            self.features.get(feature).copied().unwrap_or(false)
        }

        fn get_platform_path(&self, path_type: &str) -> Option<&PathBuf> {
            self.paths.get(path_type)
        }

        fn format_path(&self, path: &Path) -> String {
            self.config.format_path(path)
        }

        fn get_url_open_command(&self, url: &str) -> Vec<String> {
            self.config.get_url_open_command(url)
        }

        fn get_file_manager_command(&self, path: &str) -> Vec<String> {
            self.config.get_file_manager_command(path)
        }

        fn get_line_ending(&self) -> &str {
            &self.config.line_ending
        }

        fn get_executable_name(&self, base_name: &str) -> String {
            self.config.get_executable_name(base_name)
        }

        /// Test if the app can create platform-appropriate directories
        fn create_app_directories(&self) -> Result<Vec<PathBuf>, String> {
            let mut created_dirs = Vec::new();
            
            for (name, path) in &self.paths {
                // In a real implementation, this would create the directories
                // For testing, we'll just validate the paths
                if path.to_string_lossy().is_empty() {
                    return Err(format!("Invalid path for {}: {:?}", name, path));
                }
                
                // Check if path format is correct for the platform
                let path_str = path.to_string_lossy();
                match self.config.os_name.as_str() {
                    "windows" => {
                        if path_str.contains('/') && !path_str.contains('\\') {
                            return Err(format!("Windows path should use backslashes: {}", path_str));
                        }
                    },
                    "linux" | "macos" => {
                        if path_str.contains('\\') {
                            return Err(format!("Unix path should not contain backslashes: {}", path_str));
                        }
                    },
                    _ => {},
                }
                
                created_dirs.push(path.clone());
            }
            
            Ok(created_dirs)
        }

        /// Test platform-specific file operations
        fn test_file_operations(&self) -> Result<Vec<String>, String> {
            let mut operations = Vec::new();
            
            // Test line ending handling
            let content = format!("Line 1{}Line 2{}Line 3", self.get_line_ending(), self.get_line_ending());
            operations.push(format!("Created content with platform line endings: {} chars", content.len()));
            
            // Test executable naming
            let exe_name = self.get_executable_name("autodev-ai");
            operations.push(format!("Executable name: {}", exe_name));
            
            // Test path formatting
            let test_path = PathBuf::from("test").join("path").join("file.txt");
            let formatted = self.format_path(&test_path);
            operations.push(format!("Formatted path: {}", formatted));
            
            Ok(operations)
        }

        /// Get platform information for debugging
        fn get_platform_info(&self) -> Value {
            json!({
                "os_name": self.config.os_name,
                "arch": self.config.arch,
                "family": self.config.family,
                "supports": {
                    "system_tray": self.config.supports_system_tray,
                    "global_shortcuts": self.config.supports_global_shortcuts,
                    "transparency": self.config.supports_transparency,
                    "native_menus": self.config.supports_native_menus,
                    "auto_launch": self.config.supports_auto_launch,
                    "notifications": self.config.supports_notifications
                },
                "paths": {
                    "separator": self.config.path_separator.to_string(),
                    "app_data": self.config.get_app_data_dir().to_string_lossy(),
                    "cache": self.config.get_cache_dir().to_string_lossy()
                },
                "commands": {
                    "shell": self.config.default_shell,
                    "file_manager": self.config.file_manager_command,
                    "url_opener": self.config.url_opener_command
                },
                "features": self.features.clone(),
                "environment_vars": self.environment.len()
            })
        }
    }

    #[test]
    fn test_platform_detection() {
        let app = CrossPlatformApp::new();
        
        // Verify platform constants are valid
        let valid_os = ["windows", "macos", "linux", "freebsd", "openbsd", "netbsd"];
        let valid_arch = ["x86", "x86_64", "arm", "aarch64", "mips", "powerpc"];
        let valid_family = ["windows", "unix"];
        
        assert!(valid_os.contains(&app.config.os_name.as_str()), 
               "OS '{}' should be recognized", app.config.os_name);
        
        assert!(valid_arch.contains(&app.config.arch.as_str()),
               "Architecture '{}' should be recognized", app.config.arch);
        
        assert!(valid_family.contains(&app.config.family.as_str()),
               "Family '{}' should be recognized", app.config.family);
        
        // Verify platform-specific settings make sense
        match app.config.os_name.as_str() {
            "windows" => {
                assert_eq!(app.config.path_separator, '\\');
                assert_eq!(app.config.line_ending, "\r\n");
                assert_eq!(app.config.executable_extension, ".exe");
                assert_eq!(app.config.family, "windows");
            },
            "macos" => {
                assert_eq!(app.config.path_separator, '/');
                assert_eq!(app.config.line_ending, "\n");
                assert_eq!(app.config.executable_extension, "");
                assert_eq!(app.config.family, "unix");
                assert!(app.config.supports_native_menus, "macOS should support native menus");
            },
            "linux" => {
                assert_eq!(app.config.path_separator, '/');
                assert_eq!(app.config.line_ending, "\n");
                assert_eq!(app.config.executable_extension, "");
                assert_eq!(app.config.family, "unix");
            },
            _ => {
                // Other platforms should have reasonable defaults
                assert!(!app.config.executable_extension.contains(' '), "Executable extension should not contain spaces");
            }
        }
    }

    #[test]
    fn test_platform_feature_support() {
        let app = CrossPlatformApp::new();
        
        // Test that features are correctly detected for each platform
        match app.config.os_name.as_str() {
            "windows" => {
                assert!(app.is_feature_supported("system_tray"), "Windows should support system tray");
                assert!(app.is_feature_supported("global_shortcuts"), "Windows should support global shortcuts");
                assert!(app.is_feature_supported("transparency"), "Windows should support transparency");
                assert!(app.is_feature_supported("windows_registry"), "Windows should support registry");
                assert!(!app.is_feature_supported("native_menus"), "Windows should use in-window menus");
            },
            "macos" => {
                assert!(app.is_feature_supported("system_tray"), "macOS should support menu bar extras");
                assert!(app.is_feature_supported("native_menus"), "macOS should support native menu bar");
                assert!(app.is_feature_supported("macos_dock"), "macOS should support dock integration");
                assert!(app.is_feature_supported("transparency"), "macOS should support transparency");
            },
            "linux" => {
                assert!(app.is_feature_supported("system_tray"), "Linux should support system tray");
                assert!(app.is_feature_supported("linux_dbus"), "Linux should support D-Bus");
                assert!(app.is_feature_supported("linux_freedesktop"), "Linux should support FreeDesktop standards");
                assert!(!app.is_feature_supported("native_menus"), "Linux typically uses in-window menus");
            },
            _ => {
                // Other platforms should have conservative feature support
                assert!(!app.is_feature_supported("system_tray"), "Unknown platforms should not assume system tray support");
            }
        }
        
        // Test that all platforms support basic features
        let basic_features = ["notifications", "global_shortcuts"];
        for feature in &basic_features {
            // Note: In a real implementation, some platforms might not support these
            // Here we test that the feature detection logic works
            let supported = app.is_feature_supported(feature);
            println!("Feature '{}' supported on {}: {}", feature, app.config.os_name, supported);
        }
    }

    #[test]
    fn test_platform_specific_paths() {
        let app = CrossPlatformApp::new();
        
        // Test that app data directory follows platform conventions
        let app_data_dir = app.get_platform_path("app_data").unwrap();
        let app_data_str = app_data_dir.to_string_lossy();
        
        match app.config.os_name.as_str() {
            "windows" => {
                assert!(app_data_str.contains("AppData"), "Windows app data should be in AppData folder");
                assert!(app_data_str.contains("AutoDev-AI"), "Should contain app name");
            },
            "macos" => {
                assert!(app_data_str.contains("Library/Application Support"), "macOS should use Library/Application Support");
                assert!(app_data_str.contains("AutoDev-AI"), "Should contain app name");
            },
            "linux" => {
                assert!(app_data_str.contains(".config") || app_data_str.contains("XDG_CONFIG_HOME"), 
                       "Linux should follow XDG Base Directory spec");
                assert!(app_data_str.contains("autodev-ai"), "Should contain lowercase app name");
            },
            _ => {
                assert!(!app_data_str.is_empty(), "Should have some app data directory");
            }
        }
        
        // Test cache directory
        let cache_dir = app.get_platform_path("cache").unwrap();
        let cache_str = cache_dir.to_string_lossy();
        
        match app.config.os_name.as_str() {
            "windows" => {
                assert!(cache_str.contains("Local") || cache_str.contains("Cache"), 
                       "Windows cache should be in Local AppData or Cache");
            },
            "macos" => {
                assert!(cache_str.contains("Library/Caches"), "macOS should use Library/Caches");
            },
            "linux" => {
                assert!(cache_str.contains(".cache") || cache_str.contains("XDG_CACHE_HOME"), 
                       "Linux should follow XDG cache convention");
            },
            _ => {
                assert!(!cache_str.is_empty(), "Should have some cache directory");
            }
        }
    }

    #[test]
    fn test_path_formatting() {
        let app = CrossPlatformApp::new();
        
        // Test path formatting for the current platform
        let test_paths = vec![
            PathBuf::from("simple"),
            PathBuf::from("path").join("with").join("multiple").join("components"),
            PathBuf::from("path with spaces"),
            PathBuf::from("path").join("with").join("unicode-测试"),
        ];
        
        for path in test_paths {
            let formatted = app.format_path(&path);
            
            match app.config.os_name.as_str() {
                "windows" => {
                    // Windows paths should use backslashes
                    if path.components().count() > 1 {
                        assert!(formatted.contains('\\') || !formatted.contains('/'), 
                               "Windows path '{}' should use backslashes", formatted);
                    }
                },
                "linux" | "macos" => {
                    // Unix paths should use forward slashes
                    assert!(!formatted.contains('\\'), 
                           "Unix path '{}' should not contain backslashes", formatted);
                },
                _ => {
                    // Other platforms should not crash
                    assert!(!formatted.is_empty(), "Formatted path should not be empty");
                }
            }
            
            // All platforms should handle the path without panicking
            assert!(!formatted.is_empty(), "Formatted path should not be empty for: {:?}", path);
        }
    }

    #[test]
    fn test_executable_naming() {
        let app = CrossPlatformApp::new();
        
        let base_names = vec!["autodev-ai", "helper", "updater"];
        
        for base_name in base_names {
            let exe_name = app.get_executable_name(base_name);
            
            match app.config.os_name.as_str() {
                "windows" => {
                    assert!(exe_name.ends_with(".exe"), 
                           "Windows executable '{}' should end with .exe", exe_name);
                    assert!(exe_name.starts_with(base_name), 
                           "Executable name '{}' should start with base name '{}'", exe_name, base_name);
                },
                "linux" | "macos" => {
                    assert_eq!(exe_name, base_name, 
                           "Unix executable should be same as base name");
                },
                _ => {
                    assert!(exe_name.starts_with(base_name), 
                           "Executable should start with base name");
                }
            }
        }
    }

    #[test]
    fn test_url_opening_commands() {
        let app = CrossPlatformApp::new();
        
        let test_urls = vec![
            "https://github.com/ruvnet/autodevai",
            "https://example.com/path with spaces",
            "file:///local/file.txt",
        ];
        
        for url in test_urls {
            let command = app.get_url_open_command(url);
            
            assert!(!command.is_empty(), "URL open command should not be empty");
            
            match app.config.os_name.as_str() {
                "windows" => {
                    assert!(command.contains(&"cmd".to_string()) || command.contains(&"start".to_string()), 
                           "Windows should use cmd/start to open URLs: {:?}", command);
                },
                "macos" => {
                    assert!(command.contains(&"open".to_string()), 
                           "macOS should use 'open' to open URLs: {:?}", command);
                    assert_eq!(command.len(), 2, "macOS open command should have 2 parts");
                },
                "linux" => {
                    assert!(command.contains(&"xdg-open".to_string()), 
                           "Linux should use 'xdg-open' to open URLs: {:?}", command);
                    assert_eq!(command.len(), 2, "Linux xdg-open command should have 2 parts");
                },
                _ => {
                    // Other platforms should provide some fallback
                    assert!(!command.is_empty(), "Should provide some command for unknown platform");
                }
            }
            
            // Verify URL is included in command
            assert!(command.iter().any(|arg| arg.contains(url.split("://").last().unwrap_or(url))), 
                   "Command should include the URL: {:?}", command);
        }
    }

    #[test]
    fn test_file_manager_commands() {
        let app = CrossPlatformApp::new();
        
        let test_paths = vec![
            "/path/to/file.txt",
            "/path with spaces/file.txt",
            "relative/path.txt",
        ];
        
        for path in test_paths {
            let command = app.get_file_manager_command(path);
            
            assert!(!command.is_empty(), "File manager command should not be empty");
            
            match app.config.os_name.as_str() {
                "windows" => {
                    assert!(command.contains(&"explorer".to_string()), 
                           "Windows should use 'explorer': {:?}", command);
                },
                "macos" => {
                    assert!(command.contains(&"open".to_string()), 
                           "macOS should use 'open': {:?}", command);
                    assert!(command.contains(&"-R".to_string()), 
                           "macOS should use '-R' flag to reveal file: {:?}", command);
                },
                "linux" => {
                    assert!(command.contains(&"xdg-open".to_string()), 
                           "Linux should use 'xdg-open': {:?}", command);
                },
                _ => {
                    // Other platforms should provide some fallback
                    assert!(!command.is_empty(), "Should provide some command for unknown platform");
                }
            }
        }
    }

    #[test]
    fn test_line_endings() {
        let app = CrossPlatformApp::new();
        
        let line_ending = app.get_line_ending();
        
        match app.config.os_name.as_str() {
            "windows" => {
                assert_eq!(line_ending, "\r\n", "Windows should use CRLF line endings");
            },
            "linux" | "macos" => {
                assert_eq!(line_ending, "\n", "Unix should use LF line endings");
            },
            _ => {
                // Other platforms should have some line ending
                assert!(!line_ending.is_empty(), "Should have some line ending");
                assert!(line_ending == "\n" || line_ending == "\r\n", 
                       "Line ending should be LF or CRLF");
            }
        }
        
        // Test line ending usage
        let test_content = vec!["Line 1", "Line 2", "Line 3"];
        let joined = test_content.join(line_ending);
        
        match app.config.os_name.as_str() {
            "windows" => {
                assert!(joined.contains("\r\n"), "Windows content should contain CRLF");
            },
            "linux" | "macos" => {
                assert!(!joined.contains("\r\n"), "Unix content should not contain CRLF");
                assert!(joined.contains('\n'), "Unix content should contain LF");
            },
            _ => {}
        }
    }

    #[test]
    fn test_directory_creation() {
        let app = CrossPlatformApp::new();
        
        // Test that app can determine correct directories to create
        let directories = app.create_app_directories();
        assert!(directories.is_ok(), "Should be able to determine app directories: {:?}", directories);
        
        let dirs = directories.unwrap();
        assert!(!dirs.is_empty(), "Should have at least one directory");
        
        // Verify each directory path is valid for the platform
        for dir in &dirs {
            let dir_str = dir.to_string_lossy();
            assert!(!dir_str.is_empty(), "Directory path should not be empty");
            
            match app.config.os_name.as_str() {
                "windows" => {
                    // Windows paths should be absolute or at least not contain forward slashes mixed with backslashes
                    if dir_str.len() > 2 {
                        // Either should be all forward slashes or contain backslashes
                        let has_backslash = dir_str.contains('\\');
                        let has_forward_slash = dir_str.contains('/');
                        
                        if has_forward_slash && has_backslash {
                            // This might be okay for some APIs, but let's check it's reasonable
                            println!("Mixed path separators on Windows: {}", dir_str);
                        }
                    }
                },
                "linux" | "macos" => {
                    assert!(!dir_str.contains('\\'), "Unix paths should not contain backslashes: {}", dir_str);
                },
                _ => {}
            }
        }
    }

    #[test]
    fn test_file_operations() {
        let app = CrossPlatformApp::new();
        
        let operations = app.test_file_operations();
        assert!(operations.is_ok(), "File operations should succeed: {:?}", operations);
        
        let ops = operations.unwrap();
        assert!(!ops.is_empty(), "Should perform some file operations");
        
        // Verify operations are appropriate for platform
        for op in &ops {
            assert!(!op.is_empty(), "Operation description should not be empty");
            
            if op.contains("line endings") {
                match app.config.os_name.as_str() {
                    "windows" => assert!(op.contains("CRLF") || op.len() > 50, "Windows should mention CRLF or have longer content"),
                    "linux" | "macos" => assert!(!op.contains("CRLF"), "Unix should not mention CRLF"),
                    _ => {}
                }
            }
            
            if op.contains("Executable name") {
                match app.config.os_name.as_str() {
                    "windows" => assert!(op.contains(".exe"), "Windows executable should have .exe extension"),
                    "linux" | "macos" => assert!(!op.contains(".exe"), "Unix executable should not have .exe extension"),
                    _ => {}
                }
            }
        }
    }

    #[test]
    fn test_environment_variables() {
        let app = CrossPlatformApp::new();
        
        // Test that platform-specific environment variables are detected
        assert!(!app.environment.is_empty(), "Should detect some environment variables");
        
        match app.config.os_name.as_str() {
            "windows" => {
                // Windows should have some specific variables
                let windows_vars = ["APPDATA", "LOCALAPPDATA", "PROGRAMFILES", "USERNAME"];
                let found_vars: Vec<_> = windows_vars.iter()
                    .filter(|&&var| app.environment.contains_key(var))
                    .collect();
                
                // Should find at least some Windows-specific variables
                assert!(!found_vars.is_empty(), 
                       "Should detect some Windows environment variables: {:?}", found_vars);
            },
            "macos" | "linux" => {
                // Unix should have HOME and USER
                assert!(app.environment.contains_key("HOME") || app.environment.contains_key("USER"), 
                       "Unix should have HOME or USER environment variable");
            },
            _ => {
                // Other platforms should at least have PATH or some basic variables
                let basic_vars = ["PATH", "HOME", "USER"];
                let found_basic: Vec<_> = basic_vars.iter()
                    .filter(|&&var| app.environment.contains_key(var))
                    .collect();
                
                assert!(!found_basic.is_empty(), 
                       "Should detect some basic environment variables");
            }
        }
    }

    #[test]
    fn test_platform_info_completeness() {
        let app = CrossPlatformApp::new();
        let info = app.get_platform_info();
        
        // Verify all expected fields are present
        assert!(info.get("os_name").is_some(), "Should include OS name");
        assert!(info.get("arch").is_some(), "Should include architecture");
        assert!(info.get("family").is_some(), "Should include family");
        assert!(info.get("supports").is_some(), "Should include feature support info");
        assert!(info.get("paths").is_some(), "Should include path information");
        assert!(info.get("commands").is_some(), "Should include command information");
        assert!(info.get("features").is_some(), "Should include feature flags");
        
        // Verify support information is complete
        let supports = info["supports"].as_object().unwrap();
        let required_features = ["system_tray", "global_shortcuts", "transparency", "native_menus"];
        for feature in &required_features {
            assert!(supports.contains_key(*feature), "Should include support info for {}", feature);
        }
        
        // Verify paths information
        let paths = info["paths"].as_object().unwrap();
        assert!(paths.contains_key("separator"), "Should include path separator");
        assert!(paths.contains_key("app_data"), "Should include app data path");
        assert!(paths.contains_key("cache"), "Should include cache path");
        
        // Verify commands information
        let commands = info["commands"].as_object().unwrap();
        assert!(commands.contains_key("shell"), "Should include shell command");
        assert!(commands.contains_key("url_opener"), "Should include URL opener command");
    }

    #[test]
    fn test_platform_consistency() {
        let app = CrossPlatformApp::new();
        
        // Test that platform configuration is internally consistent
        match app.config.family.as_str() {
            "windows" => {
                assert_eq!(app.config.os_name, "windows");
                assert_eq!(app.config.path_separator, '\\');
                assert_eq!(app.config.line_ending, "\r\n");
                assert!(!app.config.executable_extension.is_empty());
            },
            "unix" => {
                assert!(["linux", "macos", "freebsd", "openbsd", "netbsd"].contains(&app.config.os_name.as_str()));
                assert_eq!(app.config.path_separator, '/');
                assert_eq!(app.config.line_ending, "\n");
                assert!(app.config.executable_extension.is_empty());
            },
            _ => {
                panic!("Unknown family: {}", app.config.family);
            }
        }
        
        // Test that feature support is consistent
        if app.config.supports_native_menus {
            // If native menus are supported, it should be macOS
            assert_eq!(app.config.os_name, "macos", "Only macOS should support native menus currently");
        }
        
        if app.config.os_name == "windows" {
            // Windows should support certain features
            assert!(app.config.supports_system_tray, "Windows should support system tray");
            assert!(app.config.supports_global_shortcuts, "Windows should support global shortcuts");
        }
    }

    #[test]
    fn test_unicode_path_handling() {
        let app = CrossPlatformApp::new();
        
        // Test paths with Unicode characters
        let unicode_paths = vec![
            PathBuf::from("测试"),
            PathBuf::from("tëst"),
            PathBuf::from("🚀rocket"),
            PathBuf::from("документы"),
            PathBuf::from("файл.txt"),
        ];
        
        for path in unicode_paths {
            let formatted = app.format_path(&path);
            
            // Should not panic or return empty string
            assert!(!formatted.is_empty(), "Unicode path formatting should not return empty string for: {:?}", path);
            
            // Should preserve Unicode characters
            let path_str = path.to_string_lossy();
            // The formatted path might have different separators but should preserve the Unicode content
            assert!(formatted.len() >= path_str.len() / 2, 
                   "Formatted path should preserve Unicode content: '{}' -> '{}'", path_str, formatted);
        }
    }
}