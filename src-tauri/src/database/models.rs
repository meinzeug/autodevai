// AutoDev-AI Neural Bridge Platform - Database Models
//! Data models for database entities

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// User account model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub last_login: Option<chrono::DateTime<chrono::Utc>>,
    pub settings: UserSettings,
}

/// User settings model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    pub theme: String,
    pub language: String,
    pub notifications_enabled: bool,
    pub auto_save_interval: u32, // seconds
    pub privacy_mode: bool,
}

/// Session model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: Uuid,
    pub user_id: Uuid,
    pub session_token: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub expires_at: chrono::DateTime<chrono::Utc>,
    pub ip_address: String,
    pub user_agent: String,
    pub is_active: bool,
}

/// Project model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub owner_id: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub is_archived: bool,
    pub project_type: ProjectType,
    pub settings: ProjectSettings,
}

/// Project type enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProjectType {
    WebApplication,
    MobileApp,
    Desktop,
    Library,
    Microservice,
    MLModel,
    Other(String),
}

/// Project settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSettings {
    pub auto_deploy: bool,
    pub branch_protection: bool,
    pub code_review_required: bool,
    pub ci_cd_enabled: bool,
    pub docker_enabled: bool,
}

/// Claude-Flow swarm model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Swarm {
    pub id: Uuid,
    pub project_id: Uuid,
    pub name: String,
    pub topology: SwarmTopology,
    pub max_agents: u32,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub status: SwarmStatus,
    pub configuration: SwarmConfiguration,
}

/// Swarm topology enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SwarmTopology {
    Hierarchical,
    Mesh,
    Ring,
    Star,
}

/// Swarm status enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SwarmStatus {
    Initializing,
    Active,
    Paused,
    Stopping,
    Stopped,
    Error(String),
}

/// Swarm configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwarmConfiguration {
    pub neural_enabled: bool,
    pub memory_persistence: bool,
    pub auto_scaling: bool,
    pub resource_limits: ResourceLimits,
}

/// Resource limits
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceLimits {
    pub max_memory_mb: u32,
    pub max_cpu_percent: f32,
    pub max_execution_time: u32, // seconds
    pub max_concurrent_tasks: u32,
}

/// Agent model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: Uuid,
    pub swarm_id: Uuid,
    pub agent_type: AgentType,
    pub name: String,
    pub capabilities: Vec<String>,
    pub status: AgentStatus,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_active: chrono::DateTime<chrono::Utc>,
    pub performance_metrics: AgentMetrics,
}

/// Agent type enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentType {
    Coordinator,
    Analyst,
    Optimizer,
    Documenter,
    Monitor,
    Specialist(String),
    Architect,
    TaskOrchestrator,
    CodeAnalyzer,
    PerformanceAnalyzer,
    Researcher,
    Coder,
    Tester,
    Reviewer,
}

/// Agent status enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentStatus {
    Idle,
    Working,
    Blocked,
    Error(String),
    Offline,
}

/// Agent performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMetrics {
    pub tasks_completed: u32,
    pub tasks_failed: u32,
    pub average_execution_time: f32,
    pub cpu_usage: f32,
    pub memory_usage: u32,
    pub success_rate: f32,
}

/// Task model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: Uuid,
    pub project_id: Uuid,
    pub swarm_id: Option<Uuid>,
    pub assigned_agent_id: Option<Uuid>,
    pub title: String,
    pub description: String,
    pub priority: TaskPriority,
    pub status: TaskStatus,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub estimated_duration: Option<u32>, // seconds
    pub actual_duration: Option<u32>,    // seconds
    pub dependencies: Vec<Uuid>,         // task IDs
    pub tags: Vec<String>,
    pub metadata: serde_json::Value,
}

/// Task priority enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaskPriority {
    Low,
    Medium,
    High,
    Critical,
}

/// Task status enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaskStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
    Cancelled,
    Blocked,
}

/// Audit log model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub entity_type: String,
    pub entity_id: Uuid,
    pub action: AuditAction,
    pub details: serde_json::Value,
    pub ip_address: String,
    pub user_agent: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Audit action enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuditAction {
    Create,
    Update,
    Delete,
    Login,
    Logout,
    Access,
    Execute,
    Deploy,
}

/// Configuration model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Configuration {
    pub id: Uuid,
    pub key: String,
    pub value: serde_json::Value,
    pub description: Option<String>,
    pub is_sensitive: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub updated_by: Uuid,
}

/// File storage model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileStorage {
    pub id: Uuid,
    pub project_id: Option<Uuid>,
    pub filename: String,
    pub file_path: String,
    pub file_size: u64,
    pub mime_type: String,
    pub checksum: String,
    pub uploaded_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub is_deleted: bool,
}

/// Performance metrics model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub id: Uuid,
    pub entity_type: String, // swarm, agent, task, etc.
    pub entity_id: Uuid,
    pub metric_name: String,
    pub metric_value: f64,
    pub unit: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub tags: std::collections::HashMap<String, String>,
}

/// Memory store model for swarm coordination
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryStore {
    pub id: Uuid,
    pub namespace: String,
    pub key: String,
    pub value: serde_json::Value,
    pub ttl: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub access_count: u32,
}

// Default implementations
impl Default for UserSettings {
    fn default() -> Self {
        Self {
            theme: "auto".to_string(),
            language: "en".to_string(),
            notifications_enabled: true,
            auto_save_interval: 300, // 5 minutes
            privacy_mode: false,
        }
    }
}

impl Default for ProjectSettings {
    fn default() -> Self {
        Self {
            auto_deploy: false,
            branch_protection: true,
            code_review_required: true,
            ci_cd_enabled: true,
            docker_enabled: false,
        }
    }
}

impl Default for SwarmConfiguration {
    fn default() -> Self {
        Self {
            neural_enabled: false,
            memory_persistence: true,
            auto_scaling: false,
            resource_limits: ResourceLimits::default(),
        }
    }
}

impl Default for ResourceLimits {
    fn default() -> Self {
        Self {
            max_memory_mb: 1024,
            max_cpu_percent: 80.0,
            max_execution_time: 3600, // 1 hour
            max_concurrent_tasks: 10,
        }
    }
}

impl Default for AgentMetrics {
    fn default() -> Self {
        Self {
            tasks_completed: 0,
            tasks_failed: 0,
            average_execution_time: 0.0,
            cpu_usage: 0.0,
            memory_usage: 0,
            success_rate: 0.0,
        }
    }
}

// Helper implementations
impl User {
    pub fn new(username: String, email: String, password_hash: String) -> Self {
        let now = chrono::Utc::now();
        Self {
            id: Uuid::new_v4(),
            username,
            email,
            password_hash,
            is_active: true,
            created_at: now,
            updated_at: now,
            last_login: None,
            settings: UserSettings::default(),
        }
    }
}

impl Project {
    pub fn new(name: String, description: Option<String>, owner_id: Uuid) -> Self {
        let now = chrono::Utc::now();
        Self {
            id: Uuid::new_v4(),
            name,
            description,
            owner_id,
            created_at: now,
            updated_at: now,
            is_archived: false,
            project_type: ProjectType::Other("Unknown".to_string()),
            settings: ProjectSettings::default(),
        }
    }
}

impl Task {
    pub fn new(project_id: Uuid, title: String, description: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            project_id,
            swarm_id: None,
            assigned_agent_id: None,
            title,
            description,
            priority: TaskPriority::Medium,
            status: TaskStatus::Pending,
            created_at: chrono::Utc::now(),
            started_at: None,
            completed_at: None,
            estimated_duration: None,
            actual_duration: None,
            dependencies: Vec::new(),
            tags: Vec::new(),
            metadata: serde_json::Value::Null,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_creation() {
        let user = User::new(
            "testuser".to_string(),
            "test@example.com".to_string(),
            "hashed_password".to_string(),
        );
        
        assert_eq!(user.username, "testuser");
        assert_eq!(user.email, "test@example.com");
        assert!(user.is_active);
    }

    #[test]
    fn test_project_creation() {
        let owner_id = Uuid::new_v4();
        let project = Project::new(
            "Test Project".to_string(),
            Some("A test project".to_string()),
            owner_id,
        );
        
        assert_eq!(project.name, "Test Project");
        assert_eq!(project.owner_id, owner_id);
        assert!(!project.is_archived);
    }

    #[test]
    fn test_task_creation() {
        let project_id = Uuid::new_v4();
        let task = Task::new(
            project_id,
            "Test Task".to_string(),
            "A test task".to_string(),
        );
        
        assert_eq!(task.title, "Test Task");
        assert_eq!(task.project_id, project_id);
        assert!(matches!(task.status, TaskStatus::Pending));
        assert!(matches!(task.priority, TaskPriority::Medium));
    }

    #[test]
    fn test_serialization() {
        let user = User::new(
            "testuser".to_string(),
            "test@example.com".to_string(),
            "hashed_password".to_string(),
        );
        
        let json = serde_json::to_string(&user).unwrap();
        let deserialized: User = serde_json::from_str(&json).unwrap();
        
        assert_eq!(user.username, deserialized.username);
        assert_eq!(user.email, deserialized.email);
    }

    #[test]
    fn test_agent_type_serialization() {
        let agent_types = vec![
            AgentType::Coordinator,
            AgentType::Specialist("Rust".to_string()),
            AgentType::Coder,
        ];
        
        for agent_type in agent_types {
            let json = serde_json::to_string(&agent_type).unwrap();
            let deserialized: AgentType = serde_json::from_str(&json).unwrap();
            
            // Compare string representations since enum variants may not implement PartialEq
            assert_eq!(
                format!("{:?}", agent_type),
                format!("{:?}", deserialized)
            );
        }
    }
}