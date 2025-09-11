//! Command Validator
//!
//! Comprehensive command validation and whitelisting system for secure IPC operations.
//! Provides fine-grained control over which commands can be executed and under what conditions.

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

/// Command validation result with detailed information
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum CommandValidationResult {
    Allowed {
        command: String,
        sanitized_args: Option<serde_json::Value>,
        risk_score: u8,
        required_permissions: Vec<String>,
    },
    Denied {
        command: String,
        reason: String,
        risk_score: u8,
        violation_type: ViolationType,
    },
    RequiresElevation {
        command: String,
        required_permissions: Vec<String>,
        reason: String,
    },
    ConditionallyAllowed {
        command: String,
        conditions: Vec<String>,
        sanitized_args: serde_json::Value,
    },
}

/// Types of security violations
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ViolationType {
    CommandBlocked,
    InsufficientPermissions,
    MaliciousPattern,
    RateLimited,
    InvalidArguments,
    SecurityPolicyViolation,
    UnknownCommand,
}

/// Command security classification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SecurityClassification {
    Public,         // Safe for all users
    Authenticated,  // Requires authentication
    Privileged,     // Requires specific permissions
    Administrative, // Admin-only operations
    Restricted,     // Heavily restricted operations
    Blocked,        // Never allowed
}

/// Command configuration with security settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandConfig {
    pub name: String,
    pub classification: SecurityClassification,
    pub required_permissions: Vec<String>,
    pub max_rate_per_minute: Option<u32>,
    pub allowed_arg_patterns: Vec<String>,
    pub blocked_arg_patterns: Vec<String>,
    pub risk_score: u8,
    pub requires_mfa: bool,
    pub description: String,
}

/// Command whitelist with validation rules
#[derive(Debug, Clone)]
pub struct CommandWhitelist {
    commands: HashMap<String, CommandConfig>,
    global_blocked_patterns: Vec<Regex>,
    permission_hierarchy: HashMap<String, Vec<String>>,
    command_aliases: HashMap<String, String>,
}

impl Default for CommandWhitelist {
    fn default() -> Self {
        let mut whitelist = Self {
            commands: HashMap::new(),
            global_blocked_patterns: Vec::new(),
            permission_hierarchy: HashMap::new(),
            command_aliases: HashMap::new(),
        };

        whitelist.initialize_default_commands();
        whitelist.initialize_global_patterns();
        whitelist.initialize_permission_hierarchy();
        whitelist
    }
}

impl CommandWhitelist {
    /// Create a new command whitelist
    pub fn new() -> Self {
        Self::default()
    }

    /// Initialize default safe commands
    fn initialize_default_commands(&mut self) {
        // Public commands - safe for all users
        self.add_command(CommandConfig {
            name: "get_app_info".to_string(),
            classification: SecurityClassification::Public,
            required_permissions: vec![],
            max_rate_per_minute: Some(60),
            allowed_arg_patterns: vec![],
            blocked_arg_patterns: vec![],
            risk_score: 0,
            requires_mfa: false,
            description: "Get application information".to_string(),
        });

        self.add_command(CommandConfig {
            name: "get_system_info".to_string(),
            classification: SecurityClassification::Public,
            required_permissions: vec![],
            max_rate_per_minute: Some(30),
            allowed_arg_patterns: vec![],
            blocked_arg_patterns: vec![],
            risk_score: 5,
            requires_mfa: false,
            description: "Get basic system information".to_string(),
        });

        // Authenticated commands
        self.add_command(CommandConfig {
            name: "get_settings".to_string(),
            classification: SecurityClassification::Authenticated,
            required_permissions: vec!["settings.read".to_string()],
            max_rate_per_minute: Some(120),
            allowed_arg_patterns: vec![r"^[a-zA-Z0-9._-]+$".to_string()],
            blocked_arg_patterns: vec![r"\.\.".to_string(), r"\/".to_string()],
            risk_score: 10,
            requires_mfa: false,
            description: "Get user settings".to_string(),
        });

        self.add_command(CommandConfig {
            name: "save_settings".to_string(),
            classification: SecurityClassification::Authenticated,
            required_permissions: vec!["settings.write".to_string()],
            max_rate_per_minute: Some(30),
            allowed_arg_patterns: vec![],
            blocked_arg_patterns: vec![
                r"<script".to_string(),
                r"javascript:".to_string(),
                r"eval\(".to_string(),
            ],
            risk_score: 20,
            requires_mfa: false,
            description: "Save user settings".to_string(),
        });

        // Privileged commands
        self.add_command(CommandConfig {
            name: "create_project".to_string(),
            classification: SecurityClassification::Privileged,
            required_permissions: vec!["project.create".to_string()],
            max_rate_per_minute: Some(10),
            allowed_arg_patterns: vec![r"^[a-zA-Z0-9._-]+$".to_string()],
            blocked_arg_patterns: vec![
                r"\.\.".to_string(),
                r"\/etc\/".to_string(),
                r"\/root\/".to_string(),
                r"\.exe$".to_string(),
            ],
            risk_score: 40,
            requires_mfa: false,
            description: "Create new project".to_string(),
        });

        self.add_command(CommandConfig {
            name: "run_command".to_string(),
            classification: SecurityClassification::Privileged,
            required_permissions: vec!["system.execute".to_string()],
            max_rate_per_minute: Some(5),
            allowed_arg_patterns: vec![
                r"^npm ".to_string(),
                r"^yarn ".to_string(),
                r"^git ".to_string(),
            ],
            blocked_arg_patterns: vec![
                r"rm -rf".to_string(),
                r"sudo ".to_string(),
                r"chmod ".to_string(),
                r"\.sh$".to_string(),
                r"\.exe$".to_string(),
                r"powershell".to_string(),
                r"cmd\.exe".to_string(),
            ],
            risk_score: 70,
            requires_mfa: false,
            description: "Execute allowed system commands".to_string(),
        });

        // Administrative commands
        self.add_command(CommandConfig {
            name: "update_app".to_string(),
            classification: SecurityClassification::Administrative,
            required_permissions: vec!["app.update".to_string(), "admin".to_string()],
            max_rate_per_minute: Some(2),
            allowed_arg_patterns: vec![],
            blocked_arg_patterns: vec![],
            risk_score: 60,
            requires_mfa: true,
            description: "Update application".to_string(),
        });

        self.add_command(CommandConfig {
            name: "install_extension".to_string(),
            classification: SecurityClassification::Administrative,
            required_permissions: vec!["extension.install".to_string(), "admin".to_string()],
            max_rate_per_minute: Some(3),
            allowed_arg_patterns: vec![r"^https://[a-zA-Z0-9.-]+/".to_string()],
            blocked_arg_patterns: vec![
                r"javascript:".to_string(),
                r"data:".to_string(),
                r"file://".to_string(),
            ],
            risk_score: 80,
            requires_mfa: true,
            description: "Install application extension".to_string(),
        });

        // Blocked commands - never allowed
        self.add_command(CommandConfig {
            name: "execute_system_command".to_string(),
            classification: SecurityClassification::Blocked,
            required_permissions: vec![],
            max_rate_per_minute: None,
            allowed_arg_patterns: vec![],
            blocked_arg_patterns: vec![],
            risk_score: 100,
            requires_mfa: false,
            description: "Direct system command execution - BLOCKED".to_string(),
        });

        self.add_command(CommandConfig {
            name: "read_sensitive_files".to_string(),
            classification: SecurityClassification::Blocked,
            required_permissions: vec![],
            max_rate_per_minute: None,
            allowed_arg_patterns: vec![],
            blocked_arg_patterns: vec![],
            risk_score: 100,
            requires_mfa: false,
            description: "Read sensitive system files - BLOCKED".to_string(),
        });
    }

    /// Initialize global blocked patterns
    fn initialize_global_patterns(&mut self) {
        let patterns = vec![
            r"<script[\s\S]*?</script>", // Script tags
            r"javascript:",              // JavaScript URLs
            r"data:text/html",           // HTML data URLs
            r"eval\s*\(",                // eval() calls
            r"Function\s*\(",            // Function constructor
            r"setTimeout\s*\(",          // setTimeout calls
            r"setInterval\s*\(",         // setInterval calls
            r"\.\./",                    // Path traversal
            r"\.\.\\",                   // Windows path traversal
            r"/etc/passwd",              // System files
            r"/etc/shadow",
            r"C:\\Windows\\System32", // Windows system dir
            r"rm\s+-rf\s+/",          // Dangerous rm commands
            r"sudo\s+rm",             // Sudo rm
            r">\s*/dev/null\s+2>&1",  // Output redirection
            r"\|\s*sh",               // Pipe to shell
            r"\|\s*bash",             // Pipe to bash
            r"\$\([^)]+\)",           // Command substitution
            r"`[^`]+`",               // Backtick command substitution
        ];

        for pattern_str in patterns {
            if let Ok(pattern) = Regex::new(pattern_str) {
                self.global_blocked_patterns.push(pattern);
            }
        }
    }

    /// Initialize permission hierarchy
    fn initialize_permission_hierarchy(&mut self) {
        // Admin inherits all permissions
        self.permission_hierarchy.insert(
            "admin".to_string(),
            vec![
                "settings.read".to_string(),
                "settings.write".to_string(),
                "project.create".to_string(),
                "project.delete".to_string(),
                "system.execute".to_string(),
                "app.update".to_string(),
                "extension.install".to_string(),
                "user.manage".to_string(),
            ],
        );

        // Power user permissions
        self.permission_hierarchy.insert(
            "poweruser".to_string(),
            vec![
                "settings.read".to_string(),
                "settings.write".to_string(),
                "project.create".to_string(),
                "system.execute".to_string(),
            ],
        );

        // Basic user permissions
        self.permission_hierarchy.insert(
            "user".to_string(),
            vec!["settings.read".to_string(), "settings.write".to_string()],
        );
    }

    /// Add a command to the whitelist
    pub fn add_command(&mut self, config: CommandConfig) {
        self.commands.insert(config.name.clone(), config);
    }

    /// Add command alias
    pub fn add_alias(&mut self, alias: String, target: String) {
        self.command_aliases.insert(alias, target);
    }

    /// Validate a command and its arguments
    pub fn validate_command(
        &self,
        command: &str,
        args: &serde_json::Value,
        user_permissions: &HashSet<String>,
        requires_mfa: bool,
    ) -> CommandValidationResult {
        // Resolve aliases
        let resolved_command = self.resolve_alias(command);

        // Get command configuration
        let config = match self.commands.get(&resolved_command) {
            Some(config) => config,
            None => {
                return CommandValidationResult::Denied {
                    command: command.to_string(),
                    reason: "Unknown command".to_string(),
                    risk_score: 50,
                    violation_type: ViolationType::UnknownCommand,
                };
            }
        };

        // Check if command is blocked
        if config.classification == SecurityClassification::Blocked {
            return CommandValidationResult::Denied {
                command: command.to_string(),
                reason: "Command is permanently blocked".to_string(),
                risk_score: config.risk_score,
                violation_type: ViolationType::CommandBlocked,
            };
        }

        // Check global blocked patterns
        if let Some(violation) = self.check_global_patterns(command, args) {
            return CommandValidationResult::Denied {
                command: command.to_string(),
                reason: format!("Contains blocked pattern: {}", violation),
                risk_score: 90,
                violation_type: ViolationType::MaliciousPattern,
            };
        }

        // Check permissions
        let expanded_permissions = self.expand_permissions(user_permissions);
        if !self.check_permissions(config, &expanded_permissions) {
            return CommandValidationResult::RequiresElevation {
                command: command.to_string(),
                required_permissions: config.required_permissions.clone(),
                reason: "Insufficient permissions".to_string(),
            };
        }

        // Check MFA requirement
        if config.requires_mfa && !requires_mfa {
            return CommandValidationResult::RequiresElevation {
                command: command.to_string(),
                required_permissions: vec!["mfa.verified".to_string()],
                reason: "Multi-factor authentication required".to_string(),
            };
        }

        // Validate and sanitize arguments
        match self.validate_arguments(config, args) {
            Ok(sanitized_args) => CommandValidationResult::Allowed {
                command: resolved_command,
                sanitized_args: sanitized_args,
                risk_score: config.risk_score,
                required_permissions: config.required_permissions.clone(),
            },
            Err(reason) => CommandValidationResult::Denied {
                command: command.to_string(),
                reason,
                risk_score: config.risk_score + 20,
                violation_type: ViolationType::InvalidArguments,
            },
        }
    }

    /// Resolve command aliases
    fn resolve_alias(&self, command: &str) -> String {
        self.command_aliases
            .get(command)
            .cloned()
            .unwrap_or_else(|| command.to_string())
    }

    /// Check global blocked patterns
    fn check_global_patterns(&self, command: &str, args: &serde_json::Value) -> Option<String> {
        let full_text = format!(
            "{} {}",
            command,
            serde_json::to_string(args).unwrap_or_default()
        );

        for pattern in &self.global_blocked_patterns {
            if pattern.is_match(&full_text) {
                return Some(pattern.as_str().to_string());
            }
        }
        None
    }

    /// Check if user has required permissions
    fn check_permissions(
        &self,
        config: &CommandConfig,
        user_permissions: &HashSet<String>,
    ) -> bool {
        if config.required_permissions.is_empty() {
            return true;
        }

        config
            .required_permissions
            .iter()
            .all(|perm| user_permissions.contains(perm))
    }

    /// Expand permissions based on hierarchy
    fn expand_permissions(&self, base_permissions: &HashSet<String>) -> HashSet<String> {
        let mut expanded = base_permissions.clone();

        for permission in base_permissions {
            if let Some(inherited) = self.permission_hierarchy.get(permission) {
                for inherited_perm in inherited {
                    expanded.insert(inherited_perm.clone());
                }
            }
        }

        expanded
    }

    /// Validate and sanitize command arguments
    fn validate_arguments(
        &self,
        config: &CommandConfig,
        args: &serde_json::Value,
    ) -> Result<Option<serde_json::Value>, String> {
        let args_str = serde_json::to_string(args).map_err(|e| format!("Invalid JSON: {}", e))?;

        // Check blocked patterns specific to this command
        for blocked_pattern in &config.blocked_arg_patterns {
            if let Ok(regex) = Regex::new(blocked_pattern) {
                if regex.is_match(&args_str) {
                    return Err(format!(
                        "Arguments contain blocked pattern: {}",
                        blocked_pattern
                    ));
                }
            }
        }

        // Check allowed patterns if specified
        if !config.allowed_arg_patterns.is_empty() {
            let matches_allowed = config.allowed_arg_patterns.iter().any(|allowed_pattern| {
                if let Ok(regex) = Regex::new(allowed_pattern) {
                    regex.is_match(&args_str)
                } else {
                    false
                }
            });

            if !matches_allowed {
                return Err("Arguments do not match any allowed patterns".to_string());
            }
        }

        // For now, return original args (in a real system, you might sanitize them)
        Ok(Some(args.clone()))
    }

    /// Get command configuration
    pub fn get_command_config(&self, command: &str) -> Option<&CommandConfig> {
        let resolved = self.resolve_alias(command);
        self.commands.get(&resolved)
    }

    /// List all available commands for user
    pub fn list_available_commands(
        &self,
        user_permissions: &HashSet<String>,
    ) -> Vec<CommandConfig> {
        let expanded_permissions = self.expand_permissions(user_permissions);

        self.commands
            .values()
            .filter(|config| {
                config.classification != SecurityClassification::Blocked
                    && self.check_permissions(config, &expanded_permissions)
            })
            .cloned()
            .collect()
    }

    /// Get security statistics
    pub fn get_security_stats(&self) -> HashMap<String, serde_json::Value> {
        let mut stats = HashMap::new();

        // Count by classification
        let mut by_classification = HashMap::new();
        for config in self.commands.values() {
            let key = format!("{:?}", config.classification);
            *by_classification.entry(key).or_insert(0) += 1;
        }
        stats.insert(
            "commands_by_classification".to_string(),
            serde_json::Value::Object(
                by_classification
                    .into_iter()
                    .map(|(k, v)| (k, serde_json::Value::Number(v.into())))
                    .collect(),
            ),
        );

        stats.insert(
            "total_commands".to_string(),
            serde_json::Value::Number(self.commands.len().into()),
        );

        stats.insert(
            "blocked_patterns".to_string(),
            serde_json::Value::Number(self.global_blocked_patterns.len().into()),
        );

        stats.insert(
            "aliases".to_string(),
            serde_json::Value::Number(self.command_aliases.len().into()),
        );

        // High-risk commands
        let high_risk_count = self
            .commands
            .values()
            .filter(|c| c.risk_score >= 70)
            .count();
        stats.insert(
            "high_risk_commands".to_string(),
            serde_json::Value::Number(high_risk_count.into()),
        );

        stats
    }

    /// Update command configuration
    pub fn update_command(&mut self, config: CommandConfig) -> bool {
        if self.commands.contains_key(&config.name) {
            self.commands.insert(config.name.clone(), config);
            true
        } else {
            false
        }
    }

    /// Remove command from whitelist
    pub fn remove_command(&mut self, command: &str) -> bool {
        self.commands.remove(command).is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_command_validation_allowed() {
        let whitelist = CommandWhitelist::default();
        let mut permissions = HashSet::new();
        permissions.insert("settings.read".to_string());

        let result = whitelist.validate_command(
            "get_settings",
            &serde_json::json!({"key": "theme"}),
            &permissions,
            false,
        );

        match result {
            CommandValidationResult::Allowed { .. } => {}
            _ => panic!("Command should be allowed"),
        }
    }

    #[test]
    fn test_command_validation_blocked() {
        let whitelist = CommandWhitelist::default();
        let permissions = HashSet::new();

        let result = whitelist.validate_command(
            "execute_system_command",
            &serde_json::json!({}),
            &permissions,
            false,
        );

        match result {
            CommandValidationResult::Denied {
                violation_type: ViolationType::CommandBlocked,
                ..
            } => {}
            _ => panic!("Command should be blocked"),
        }
    }

    #[test]
    fn test_insufficient_permissions() {
        let whitelist = CommandWhitelist::default();
        let permissions = HashSet::new(); // No permissions

        let result = whitelist.validate_command(
            "save_settings",
            &serde_json::json!({}),
            &permissions,
            false,
        );

        match result {
            CommandValidationResult::RequiresElevation { .. } => {}
            _ => panic!("Should require elevation for insufficient permissions"),
        }
    }

    #[test]
    fn test_malicious_pattern_detection() {
        let whitelist = CommandWhitelist::default();
        let mut permissions = HashSet::new();
        permissions.insert("settings.write".to_string());

        let result = whitelist.validate_command(
            "save_settings",
            &serde_json::json!({"content": "<script>alert('xss')</script>"}),
            &permissions,
            false,
        );

        match result {
            CommandValidationResult::Denied {
                violation_type: ViolationType::MaliciousPattern,
                ..
            } => {}
            _ => panic!("Should detect malicious pattern"),
        }
    }

    #[test]
    fn test_permission_hierarchy() {
        let whitelist = CommandWhitelist::default();
        let mut permissions = HashSet::new();
        permissions.insert("admin".to_string());

        // Admin should have access to settings.write through hierarchy
        let expanded = whitelist.expand_permissions(&permissions);
        assert!(expanded.contains("settings.write"));
        assert!(expanded.contains("system.execute"));
    }

    #[test]
    fn test_command_aliases() {
        let mut whitelist = CommandWhitelist::default();
        whitelist.add_alias("info".to_string(), "get_app_info".to_string());

        let permissions = HashSet::new();
        let result =
            whitelist.validate_command("info", &serde_json::json!({}), &permissions, false);

        match result {
            CommandValidationResult::Allowed { command, .. } => {
                assert_eq!(command, "get_app_info");
            }
            _ => panic!("Alias should resolve to allowed command"),
        }
    }

    #[test]
    fn test_mfa_requirement() {
        let whitelist = CommandWhitelist::default();
        let mut permissions = HashSet::new();
        permissions.insert("admin".to_string());

        // MFA required command without MFA
        let result = whitelist.validate_command(
            "update_app",
            &serde_json::json!({}),
            &permissions,
            false, // MFA not verified
        );

        match result {
            CommandValidationResult::RequiresElevation { .. } => {}
            _ => panic!("Should require MFA elevation"),
        }

        // Same command with MFA
        let result = whitelist.validate_command(
            "update_app",
            &serde_json::json!({}),
            &permissions,
            true, // MFA verified
        );

        match result {
            CommandValidationResult::Allowed { .. } => {}
            _ => panic!("Should be allowed with MFA"),
        }
    }

    #[test]
    fn test_argument_pattern_validation() {
        let whitelist = CommandWhitelist::default();
        let mut permissions = HashSet::new();
        permissions.insert("system.execute".to_string());

        // Allowed pattern (npm command)
        let result = whitelist.validate_command(
            "run_command",
            &serde_json::json!({"command": "npm install"}),
            &permissions,
            false,
        );

        match result {
            CommandValidationResult::Allowed { .. } => {}
            _ => panic!("npm command should be allowed"),
        }

        // Blocked pattern (sudo command)
        let result = whitelist.validate_command(
            "run_command",
            &serde_json::json!({"command": "sudo rm -rf /"}),
            &permissions,
            false,
        );

        match result {
            CommandValidationResult::Denied { .. } => {}
            _ => panic!("sudo command should be blocked"),
        }
    }
}
