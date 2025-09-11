-- AutoDev-AI Database Initialization Script
-- This script creates the necessary database structures

-- Create databases
CREATE DATABASE autodevai_grafana;

-- Connect to the main database
\c autodevai;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS projects;
CREATE SCHEMA IF NOT EXISTS sandboxes;
CREATE SCHEMA IF NOT EXISTS monitoring;

-- Users table
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    repository_url VARCHAR(500),
    branch VARCHAR(100) DEFAULT 'main',
    status VARCHAR(50) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sandboxes table
CREATE TABLE IF NOT EXISTS sandboxes.sandboxes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    port INTEGER,
    status VARCHAR(50) DEFAULT 'stopped',
    container_id VARCHAR(255),
    environment JSONB DEFAULT '{}',
    resources JSONB DEFAULT '{"cpu": "1", "memory": "512m"}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS auth.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Metrics table
CREATE TABLE IF NOT EXISTS monitoring.metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    tags JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS monitoring.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users(role);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects.projects(status);
CREATE INDEX IF NOT EXISTS idx_sandboxes_project_id ON sandboxes.sandboxes(project_id);
CREATE INDEX IF NOT EXISTS idx_sandboxes_status ON sandboxes.sandboxes(status);
CREATE INDEX IF NOT EXISTS idx_sandboxes_port ON sandboxes.sandboxes(port);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON auth.sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_metrics_name_time ON monitoring.metrics(metric_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_time ON monitoring.audit_log(user_id, timestamp);

-- Create functions for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sandboxes_updated_at BEFORE UPDATE ON sandboxes.sandboxes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123!)
INSERT INTO auth.users (email, password_hash, full_name, role) VALUES 
('admin@autodev.ai', crypt('admin123!', gen_salt('bf')), 'System Administrator', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA auth TO autodevai;
GRANT USAGE ON SCHEMA projects TO autodevai;
GRANT USAGE ON SCHEMA sandboxes TO autodevai;
GRANT USAGE ON SCHEMA monitoring TO autodevai;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO autodevai;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA projects TO autodevai;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA sandboxes TO autodevai;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA monitoring TO autodevai;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO autodevai;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA projects TO autodevai;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA sandboxes TO autodevai;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA monitoring TO autodevai;

-- Connect to Grafana database
\c autodevai_grafana;

-- Grant permissions for Grafana
GRANT ALL PRIVILEGES ON DATABASE autodevai_grafana TO autodevai;