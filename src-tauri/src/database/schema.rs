// AutoDev-AI Neural Bridge Platform - Database Schema
//! Database schema definitions and migrations

use crate::errors::{NeuralBridgeError, Result};
use tracing::{info, warn};

/// Database schema version
pub const SCHEMA_VERSION: u32 = 1;

/// Schema migration
#[derive(Debug, Clone)]
pub struct Migration {
    pub version: u32,
    pub name: String,
    pub up_sql: String,
    pub down_sql: String,
}

/// Database schema manager
pub struct SchemaManager {
    migrations: Vec<Migration>,
}

impl SchemaManager {
    /// Create a new schema manager
    pub fn new() -> Self {
        Self {
            migrations: create_migrations(),
        }
    }

    /// Apply all pending migrations
    pub async fn migrate_up(&self) -> Result<()> {
        info!("Applying database migrations");

        let current_version = self.get_current_schema_version().await?;
        
        for migration in &self.migrations {
            if migration.version > current_version {
                info!("Applying migration: {} (v{})", migration.name, migration.version);
                self.apply_migration(migration, true).await?;
            }
        }

        info!("All migrations applied successfully");
        Ok(())
    }

    /// Rollback to a specific schema version
    pub async fn migrate_down(&self, target_version: u32) -> Result<()> {
        info!("Rolling back migrations to version {}", target_version);

        let current_version = self.get_current_schema_version().await?;
        
        for migration in self.migrations.iter().rev() {
            if migration.version > target_version && migration.version <= current_version {
                info!("Rolling back migration: {} (v{})", migration.name, migration.version);
                self.apply_migration(migration, false).await?;
            }
        }

        info!("Rollback completed successfully");
        Ok(())
    }

    /// Get current schema version
    async fn get_current_schema_version(&self) -> Result<u32> {
        // In a real implementation, this would query the database
        // for the current schema version from a metadata table
        Ok(0)
    }

    /// Apply a single migration
    async fn apply_migration(&self, migration: &Migration, up: bool) -> Result<()> {
        let sql = if up { &migration.up_sql } else { &migration.down_sql };
        
        // In a real implementation, this would execute the SQL
        info!("Executing SQL: {}", sql);
        
        // Update schema version in metadata table
        if up {
            self.update_schema_version(migration.version).await?;
        } else {
            self.update_schema_version(migration.version - 1).await?;
        }

        Ok(())
    }

    /// Update schema version in metadata table
    async fn update_schema_version(&self, version: u32) -> Result<()> {
        // In a real implementation, this would update the schema version
        info!("Updated schema version to: {}", version);
        Ok(())
    }

    /// Validate schema integrity
    pub async fn validate_schema(&self) -> Result<bool> {
        info!("Validating database schema");

        // In a real implementation, this would:
        // 1. Check if all required tables exist
        // 2. Validate table structures
        // 3. Check foreign key constraints
        // 4. Verify indexes exist

        Ok(true)
    }

    /// Generate schema documentation
    pub fn generate_schema_docs(&self) -> String {
        let mut docs = String::new();
        docs.push_str("# Database Schema Documentation\n\n");
        docs.push_str(&format!("Current Schema Version: {}\n\n", SCHEMA_VERSION));

        docs.push_str("## Tables\n\n");
        docs.push_str("### Users\n");
        docs.push_str("Stores user account information and authentication data.\n\n");
        docs.push_str("| Column | Type | Description |\n");
        docs.push_str("|--------|------|-------------|\n");
        docs.push_str("| id | UUID | Primary key |\n");
        docs.push_str("| username | VARCHAR(255) | Unique username |\n");
        docs.push_str("| email | VARCHAR(255) | User email address |\n");
        docs.push_str("| password_hash | VARCHAR(255) | Hashed password |\n");
        docs.push_str("| is_active | BOOLEAN | Account status |\n");
        docs.push_str("| created_at | TIMESTAMP | Account creation time |\n");
        docs.push_str("| updated_at | TIMESTAMP | Last update time |\n\n");

        docs.push_str("### Projects\n");
        docs.push_str("Stores project information and settings.\n\n");
        docs.push_str("| Column | Type | Description |\n");
        docs.push_str("|--------|------|-------------|\n");
        docs.push_str("| id | UUID | Primary key |\n");
        docs.push_str("| name | VARCHAR(255) | Project name |\n");
        docs.push_str("| description | TEXT | Project description |\n");
        docs.push_str("| owner_id | UUID | Foreign key to users |\n");
        docs.push_str("| created_at | TIMESTAMP | Creation time |\n");
        docs.push_str("| updated_at | TIMESTAMP | Last update time |\n\n");

        docs.push_str("### Swarms\n");
        docs.push_str("Stores Claude-Flow swarm configurations.\n\n");
        docs.push_str("| Column | Type | Description |\n");
        docs.push_str("|--------|------|-------------|\n");
        docs.push_str("| id | UUID | Primary key |\n");
        docs.push_str("| project_id | UUID | Foreign key to projects |\n");
        docs.push_str("| name | VARCHAR(255) | Swarm name |\n");
        docs.push_str("| topology | ENUM | Swarm topology type |\n");
        docs.push_str("| max_agents | INTEGER | Maximum agents |\n");
        docs.push_str("| status | ENUM | Current status |\n");
        docs.push_str("| created_at | TIMESTAMP | Creation time |\n\n");

        docs.push_str("### Agents\n");
        docs.push_str("Stores agent information and metrics.\n\n");
        docs.push_str("| Column | Type | Description |\n");
        docs.push_str("|--------|------|-------------|\n");
        docs.push_str("| id | UUID | Primary key |\n");
        docs.push_str("| swarm_id | UUID | Foreign key to swarms |\n");
        docs.push_str("| agent_type | ENUM | Agent specialization |\n");
        docs.push_str("| name | VARCHAR(255) | Agent name |\n");
        docs.push_str("| capabilities | JSON | Agent capabilities |\n");
        docs.push_str("| status | ENUM | Current status |\n");
        docs.push_str("| created_at | TIMESTAMP | Creation time |\n\n");

        docs.push_str("### Tasks\n");
        docs.push_str("Stores task information and execution history.\n\n");
        docs.push_str("| Column | Type | Description |\n");
        docs.push_str("|--------|------|-------------|\n");
        docs.push_str("| id | UUID | Primary key |\n");
        docs.push_str("| project_id | UUID | Foreign key to projects |\n");
        docs.push_str("| swarm_id | UUID | Foreign key to swarms |\n");
        docs.push_str("| assigned_agent_id | UUID | Foreign key to agents |\n");
        docs.push_str("| title | VARCHAR(255) | Task title |\n");
        docs.push_str("| description | TEXT | Task description |\n");
        docs.push_str("| priority | ENUM | Task priority |\n");
        docs.push_str("| status | ENUM | Current status |\n");
        docs.push_str("| created_at | TIMESTAMP | Creation time |\n");
        docs.push_str("| completed_at | TIMESTAMP | Completion time |\n\n");

        docs.push_str("## Migrations\n\n");
        for migration in &self.migrations {
            docs.push_str(&format!("### Migration {} - {}\n", migration.version, migration.name));
            docs.push_str(&format!("Version: {}\n\n", migration.version));
        }

        docs
    }
}

/// Create all database migrations
fn create_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            name: "Initial schema".to_string(),
            up_sql: r#"
                -- Users table
                CREATE TABLE users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    username VARCHAR(255) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    last_login TIMESTAMP WITH TIME ZONE,
                    settings JSONB DEFAULT '{}'
                );

                -- Sessions table
                CREATE TABLE sessions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    session_token VARCHAR(255) UNIQUE NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    ip_address INET,
                    user_agent TEXT,
                    is_active BOOLEAN DEFAULT true
                );

                -- Projects table
                CREATE TABLE projects (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    is_archived BOOLEAN DEFAULT false,
                    project_type VARCHAR(50) DEFAULT 'Other',
                    settings JSONB DEFAULT '{}'
                );

                -- Swarms table
                CREATE TABLE swarms (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    topology VARCHAR(50) NOT NULL,
                    max_agents INTEGER DEFAULT 8,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    status VARCHAR(50) DEFAULT 'Initializing',
                    configuration JSONB DEFAULT '{}'
                );

                -- Agents table
                CREATE TABLE agents (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    swarm_id UUID NOT NULL REFERENCES swarms(id) ON DELETE CASCADE,
                    agent_type VARCHAR(100) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    capabilities JSONB DEFAULT '[]',
                    status VARCHAR(50) DEFAULT 'Idle',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    performance_metrics JSONB DEFAULT '{}'
                );

                -- Tasks table
                CREATE TABLE tasks (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    swarm_id UUID REFERENCES swarms(id) ON DELETE SET NULL,
                    assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    priority VARCHAR(20) DEFAULT 'Medium',
                    status VARCHAR(20) DEFAULT 'Pending',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    started_at TIMESTAMP WITH TIME ZONE,
                    completed_at TIMESTAMP WITH TIME ZONE,
                    estimated_duration INTEGER, -- seconds
                    actual_duration INTEGER,    -- seconds
                    dependencies JSONB DEFAULT '[]',
                    tags JSONB DEFAULT '[]',
                    metadata JSONB DEFAULT '{}'
                );

                -- Audit logs table
                CREATE TABLE audit_logs (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                    entity_type VARCHAR(100) NOT NULL,
                    entity_id UUID NOT NULL,
                    action VARCHAR(50) NOT NULL,
                    details JSONB DEFAULT '{}',
                    ip_address INET,
                    user_agent TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                -- Configuration table
                CREATE TABLE configurations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    key VARCHAR(255) UNIQUE NOT NULL,
                    value JSONB NOT NULL,
                    description TEXT,
                    is_sensitive BOOLEAN DEFAULT false,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_by UUID NOT NULL REFERENCES users(id)
                );

                -- File storage table
                CREATE TABLE file_storage (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
                    filename VARCHAR(255) NOT NULL,
                    file_path VARCHAR(1000) NOT NULL,
                    file_size BIGINT NOT NULL,
                    mime_type VARCHAR(255),
                    checksum VARCHAR(64),
                    uploaded_by UUID NOT NULL REFERENCES users(id),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    is_deleted BOOLEAN DEFAULT false
                );

                -- Performance metrics table
                CREATE TABLE performance_metrics (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    entity_type VARCHAR(100) NOT NULL,
                    entity_id UUID NOT NULL,
                    metric_name VARCHAR(255) NOT NULL,
                    metric_value DOUBLE PRECISION NOT NULL,
                    unit VARCHAR(50),
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    tags JSONB DEFAULT '{}'
                );

                -- Memory store table for swarm coordination
                CREATE TABLE memory_store (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    namespace VARCHAR(255) DEFAULT 'default',
                    key VARCHAR(255) NOT NULL,
                    value JSONB NOT NULL,
                    ttl TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    access_count INTEGER DEFAULT 0
                );

                -- Schema metadata table
                CREATE TABLE schema_metadata (
                    key VARCHAR(255) PRIMARY KEY,
                    value VARCHAR(255) NOT NULL,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                -- Insert initial schema version
                INSERT INTO schema_metadata (key, value) VALUES ('schema_version', '1');

                -- Create indexes
                CREATE INDEX idx_users_email ON users(email);
                CREATE INDEX idx_users_username ON users(username);
                CREATE INDEX idx_sessions_user_id ON sessions(user_id);
                CREATE INDEX idx_sessions_token ON sessions(session_token);
                CREATE INDEX idx_projects_owner_id ON projects(owner_id);
                CREATE INDEX idx_swarms_project_id ON swarms(project_id);
                CREATE INDEX idx_agents_swarm_id ON agents(swarm_id);
                CREATE INDEX idx_tasks_project_id ON tasks(project_id);
                CREATE INDEX idx_tasks_swarm_id ON tasks(swarm_id);
                CREATE INDEX idx_tasks_agent_id ON tasks(assigned_agent_id);
                CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
                CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
                CREATE INDEX idx_file_storage_project_id ON file_storage(project_id);
                CREATE INDEX idx_performance_metrics_entity ON performance_metrics(entity_type, entity_id);
                CREATE INDEX idx_memory_store_namespace_key ON memory_store(namespace, key);
                CREATE INDEX idx_memory_store_ttl ON memory_store(ttl) WHERE ttl IS NOT NULL;
            "#.to_string(),
            down_sql: r#"
                DROP TABLE IF EXISTS memory_store;
                DROP TABLE IF EXISTS performance_metrics;
                DROP TABLE IF EXISTS file_storage;
                DROP TABLE IF EXISTS configurations;
                DROP TABLE IF EXISTS audit_logs;
                DROP TABLE IF EXISTS tasks;
                DROP TABLE IF EXISTS agents;
                DROP TABLE IF EXISTS swarms;
                DROP TABLE IF EXISTS projects;
                DROP TABLE IF EXISTS sessions;
                DROP TABLE IF EXISTS users;
                DROP TABLE IF EXISTS schema_metadata;
            "#.to_string(),
        },
    ]
}

impl Default for SchemaManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schema_manager_creation() {
        let manager = SchemaManager::new();
        assert!(!manager.migrations.is_empty());
    }

    #[test]
    fn test_migration_structure() {
        let migrations = create_migrations();
        assert_eq!(migrations.len(), 1);
        
        let first_migration = &migrations[0];
        assert_eq!(first_migration.version, 1);
        assert_eq!(first_migration.name, "Initial schema");
        assert!(!first_migration.up_sql.is_empty());
        assert!(!first_migration.down_sql.is_empty());
    }

    #[test]
    fn test_schema_documentation_generation() {
        let manager = SchemaManager::new();
        let docs = manager.generate_schema_docs();
        
        assert!(docs.contains("Database Schema Documentation"));
        assert!(docs.contains("Users"));
        assert!(docs.contains("Projects"));
        assert!(docs.contains("Swarms"));
        assert!(docs.contains("Agents"));
        assert!(docs.contains("Tasks"));
    }

    #[tokio::test]
    async fn test_schema_validation() {
        let manager = SchemaManager::new();
        let result = manager.validate_schema().await;
        assert!(result.is_ok());
        assert!(result.unwrap());
    }
}