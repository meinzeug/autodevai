-- AutoDev-AI Neural Bridge Platform Database Initialization
-- Production database schema and initial data

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS autodev;
CREATE SCHEMA IF NOT EXISTS claude_flow;
CREATE SCHEMA IF NOT EXISTS neural_bridge;
CREATE SCHEMA IF NOT EXISTS monitoring;

-- Set search path
SET search_path TO autodev, claude_flow, neural_bridge, monitoring, public;

-- ===============================
-- AutoDev Core Tables
-- ===============================

-- Projects table
CREATE TABLE autodev.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'web',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    port_range INTEGER[] NOT NULL DEFAULT '{50010,50089}',
    docker_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Sandboxes table
CREATE TABLE autodev.sandboxes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES autodev.projects(id) ON DELETE CASCADE,
    container_id VARCHAR(255) UNIQUE,
    port INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'creating',
    environment JSONB DEFAULT '{}'::jsonb,
    volumes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===============================
-- Claude Flow Tables
-- ===============================

-- Swarms table
CREATE TABLE claude_flow.swarms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topology VARCHAR(20) NOT NULL,
    max_agents INTEGER NOT NULL DEFAULT 8,
    strategy VARCHAR(20) NOT NULL DEFAULT 'balanced',
    status VARCHAR(20) NOT NULL DEFAULT 'initializing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Agents table
CREATE TABLE claude_flow.agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    swarm_id UUID REFERENCES claude_flow.swarms(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'idle',
    capabilities TEXT[] DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE claude_flow.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    swarm_id UUID REFERENCES claude_flow.swarms(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES claude_flow.agents(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    strategy VARCHAR(20) NOT NULL DEFAULT 'adaptive',
    input_data JSONB,
    output_data JSONB,
    metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Memory table for swarm coordination
CREATE TABLE claude_flow.memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    swarm_id UUID REFERENCES claude_flow.swarms(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    namespace VARCHAR(100) NOT NULL DEFAULT 'default',
    ttl INTEGER, -- TTL in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(swarm_id, namespace, key)
);

-- ===============================
-- Neural Bridge Tables
-- ===============================

-- Neural models table
CREATE TABLE neural_bridge.models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    architecture JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'training',
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Training sessions table
CREATE TABLE neural_bridge.training_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES neural_bridge.models(id) ON DELETE CASCADE,
    config JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    progress DECIMAL(5,2) DEFAULT 0.0,
    metrics JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ===============================
-- Monitoring Tables
-- ===============================

-- System metrics table
CREATE TABLE monitoring.system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    value DECIMAL(15,6) NOT NULL,
    unit VARCHAR(20),
    labels JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Container metrics table
CREATE TABLE monitoring.container_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    container_id VARCHAR(255) NOT NULL,
    sandbox_id UUID REFERENCES autodev.sandboxes(id) ON DELETE CASCADE,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(10,2),
    memory_limit DECIMAL(10,2),
    network_rx BIGINT,
    network_tx BIGINT,
    disk_usage DECIMAL(10,2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit log table
CREATE TABLE monitoring.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    user_id VARCHAR(255),
    resource_type VARCHAR(50),
    resource_id UUID,
    action VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===============================
-- Indexes for Performance
-- ===============================

-- Projects indexes
CREATE INDEX idx_projects_status ON autodev.projects(status);
CREATE INDEX idx_projects_type ON autodev.projects(type);
CREATE INDEX idx_projects_created_at ON autodev.projects(created_at);

-- Sandboxes indexes
CREATE INDEX idx_sandboxes_project_id ON autodev.sandboxes(project_id);
CREATE INDEX idx_sandboxes_status ON autodev.sandboxes(status);
CREATE INDEX idx_sandboxes_port ON autodev.sandboxes(port);
CREATE INDEX idx_sandboxes_last_activity ON autodev.sandboxes(last_activity);

-- Swarms indexes
CREATE INDEX idx_swarms_status ON claude_flow.swarms(status);
CREATE INDEX idx_swarms_topology ON claude_flow.swarms(topology);

-- Agents indexes
CREATE INDEX idx_agents_swarm_id ON claude_flow.agents(swarm_id);
CREATE INDEX idx_agents_type ON claude_flow.agents(type);
CREATE INDEX idx_agents_status ON claude_flow.agents(status);

-- Tasks indexes
CREATE INDEX idx_tasks_swarm_id ON claude_flow.tasks(swarm_id);
CREATE INDEX idx_tasks_agent_id ON claude_flow.tasks(agent_id);
CREATE INDEX idx_tasks_status ON claude_flow.tasks(status);
CREATE INDEX idx_tasks_priority ON claude_flow.tasks(priority);
CREATE INDEX idx_tasks_created_at ON claude_flow.tasks(created_at);

-- Memory indexes
CREATE INDEX idx_memory_swarm_id ON claude_flow.memory(swarm_id);
CREATE INDEX idx_memory_namespace ON claude_flow.memory(namespace);
CREATE INDEX idx_memory_key ON claude_flow.memory(key);
CREATE INDEX idx_memory_expires_at ON claude_flow.memory(expires_at);

-- Monitoring indexes
CREATE INDEX idx_system_metrics_type_name ON monitoring.system_metrics(metric_type, metric_name);
CREATE INDEX idx_system_metrics_timestamp ON monitoring.system_metrics(timestamp);
CREATE INDEX idx_container_metrics_container_id ON monitoring.container_metrics(container_id);
CREATE INDEX idx_container_metrics_sandbox_id ON monitoring.container_metrics(sandbox_id);
CREATE INDEX idx_container_metrics_timestamp ON monitoring.container_metrics(timestamp);
CREATE INDEX idx_audit_log_event_type ON monitoring.audit_log(event_type);
CREATE INDEX idx_audit_log_timestamp ON monitoring.audit_log(timestamp);

-- ===============================
-- Triggers for Automatic Updates
-- ===============================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON autodev.projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sandboxes_updated_at BEFORE UPDATE ON autodev.sandboxes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_swarms_updated_at BEFORE UPDATE ON claude_flow.swarms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON claude_flow.agents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON claude_flow.tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- TTL cleanup function for memory table
CREATE OR REPLACE FUNCTION cleanup_expired_memory()
RETURNS void AS $$
BEGIN
    DELETE FROM claude_flow.memory 
    WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;
END;
$$ language 'plpgsql';

-- ===============================
-- Initial Data
-- ===============================

-- Insert default swarm configuration
INSERT INTO claude_flow.swarms (id, topology, max_agents, strategy, status) 
VALUES (
    uuid_generate_v4(),
    'mesh',
    8,
    'balanced',
    'active'
) ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA autodev TO autodev_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA claude_flow TO autodev_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA neural_bridge TO autodev_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA monitoring TO autodev_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA autodev TO autodev_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA claude_flow TO autodev_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA neural_bridge TO autodev_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA monitoring TO autodev_user;

-- Create a cleanup job for expired memory entries (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-memory', '*/5 * * * *', 'SELECT cleanup_expired_memory();');

COMMIT;