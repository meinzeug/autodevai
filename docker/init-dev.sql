-- AutoDev-AI Neural Bridge Platform Development Database Initialization
-- Development database schema with sample data and relaxed constraints

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS autodev;
CREATE SCHEMA IF NOT EXISTS claude_flow;
CREATE SCHEMA IF NOT EXISTS neural_bridge;
CREATE SCHEMA IF NOT EXISTS monitoring;

-- Set search path
SET search_path TO autodev, claude_flow, neural_bridge, monitoring, public;

-- Include the main schema from init.sql
\i /docker-entrypoint-initdb.d/init.sql

-- ===============================
-- Development Sample Data
-- ===============================

-- Sample projects
INSERT INTO autodev.projects (id, name, description, type, status, port_range) VALUES
(uuid_generate_v4(), 'Chat Application', 'Real-time chat app with React and WebSocket', 'web', 'active', '{50010,50019}'),
(uuid_generate_v4(), 'REST API Service', 'Node.js REST API with authentication', 'api', 'active', '{50020,50029}'),
(uuid_generate_v4(), 'Machine Learning Pipeline', 'Python ML pipeline with TensorFlow', 'ml', 'development', '{50030,50039}'),
(uuid_generate_v4(), 'E-commerce Platform', 'Full-stack e-commerce with payment integration', 'web', 'testing', '{50040,50049}');

-- Sample swarms
INSERT INTO claude_flow.swarms (id, topology, max_agents, strategy, status) VALUES
(uuid_generate_v4(), 'hierarchical', 5, 'specialized', 'active'),
(uuid_generate_v4(), 'mesh', 8, 'balanced', 'active'),
(uuid_generate_v4(), 'star', 6, 'adaptive', 'active');

-- Sample agents
WITH swarm_data AS (
    SELECT id as swarm_id FROM claude_flow.swarms LIMIT 1
)
INSERT INTO claude_flow.agents (swarm_id, type, name, status, capabilities) 
SELECT 
    swarm_data.swarm_id,
    agent_type,
    agent_name,
    'active',
    capabilities
FROM swarm_data,
(VALUES 
    ('researcher', 'Research Agent Alpha', ARRAY['web_search', 'document_analysis', 'pattern_recognition']),
    ('coder', 'Code Generator Beta', ARRAY['javascript', 'python', 'rust', 'react', 'node']),
    ('tester', 'QA Specialist Gamma', ARRAY['unit_testing', 'integration_testing', 'performance_testing']),
    ('reviewer', 'Code Reviewer Delta', ARRAY['code_quality', 'security_analysis', 'performance_optimization']),
    ('architect', 'System Architect Epsilon', ARRAY['system_design', 'scalability', 'microservices'])
) AS agents(agent_type, agent_name, capabilities);

-- Sample tasks
WITH swarm_data AS (
    SELECT id as swarm_id FROM claude_flow.swarms LIMIT 1
),
agent_data AS (
    SELECT id as agent_id, type FROM claude_flow.agents LIMIT 5
)
INSERT INTO claude_flow.tasks (swarm_id, agent_id, description, priority, status, strategy)
SELECT 
    swarm_data.swarm_id,
    agent_data.agent_id,
    task_desc,
    priority_level,
    status_val,
    strategy_type
FROM swarm_data, agent_data,
(VALUES 
    ('Implement user authentication system', 'high', 'in_progress', 'sequential'),
    ('Create responsive UI components', 'medium', 'pending', 'parallel'),
    ('Setup database schema and migrations', 'high', 'completed', 'sequential'),
    ('Write comprehensive test suite', 'medium', 'in_progress', 'parallel'),
    ('Performance optimization analysis', 'low', 'pending', 'adaptive')
) AS tasks(task_desc, priority_level, status_val, strategy_type);

-- Sample memory entries
WITH swarm_data AS (
    SELECT id as swarm_id FROM claude_flow.swarms LIMIT 1
)
INSERT INTO claude_flow.memory (swarm_id, key, value, namespace, ttl)
SELECT 
    swarm_data.swarm_id,
    memory_key,
    memory_value::jsonb,
    namespace_val,
    ttl_val
FROM swarm_data,
(VALUES 
    ('project_requirements', '{"tech_stack": ["React", "Node.js", "PostgreSQL"], "deadline": "2024-02-01"}', 'project', 3600),
    ('coding_standards', '{"style": "airbnb", "testing": "jest", "linting": "eslint"}', 'development', NULL),
    ('deployment_config', '{"platform": "docker", "environment": "production", "scaling": "horizontal"}', 'deployment', 7200),
    ('api_endpoints', '{"auth": "/api/auth", "users": "/api/users", "projects": "/api/projects"}', 'api', NULL),
    ('performance_benchmarks', '{"response_time": "< 200ms", "uptime": "> 99.9%", "concurrent_users": 1000}', 'monitoring', 1800)
) AS memory_data(memory_key, memory_value, namespace_val, ttl_val);

-- Sample neural models
INSERT INTO neural_bridge.models (name, type, architecture, status) VALUES
('Task Classification Model', 'transformer', 
 '{"layers": 12, "hidden_size": 768, "attention_heads": 12, "vocab_size": 50000}', 
 'trained'),
('Code Generation Model', 'gpt', 
 '{"layers": 24, "hidden_size": 1024, "attention_heads": 16, "context_length": 2048}', 
 'training'),
('Sentiment Analysis Model', 'bert', 
 '{"layers": 12, "hidden_size": 768, "attention_heads": 12, "max_sequence_length": 512}', 
 'deployed');

-- Sample system metrics
INSERT INTO monitoring.system_metrics (metric_type, metric_name, value, unit, labels) VALUES
('cpu', 'usage_percent', 65.5, 'percent', '{"host": "autodev-main", "core": "total"}'),
('memory', 'usage_bytes', 4294967296, 'bytes', '{"host": "autodev-main", "type": "physical"}'),
('disk', 'usage_percent', 45.2, 'percent', '{"host": "autodev-main", "mount": "/"}'),
('network', 'bytes_received', 1048576000, 'bytes', '{"host": "autodev-main", "interface": "eth0"}'),
('network', 'bytes_transmitted', 524288000, 'bytes', '{"host": "autodev-main", "interface": "eth0"}');

-- Sample audit log entries
INSERT INTO monitoring.audit_log (event_type, user_id, resource_type, action, details, ip_address) VALUES
('authentication', 'dev_user', 'session', 'login', '{"method": "password", "success": true}', '127.0.0.1'),
('project', 'dev_user', 'project', 'create', '{"name": "Chat Application", "type": "web"}', '127.0.0.1'),
('swarm', 'system', 'swarm', 'initialize', '{"topology": "mesh", "agents": 8}', '172.20.0.1'),
('container', 'dev_user', 'sandbox', 'start', '{"port": 50010, "project_id": "chat-app"}', '127.0.0.1'),
('deployment', 'dev_user', 'application', 'deploy', '{"environment": "development", "version": "1.0.0"}', '127.0.0.1');

-- ===============================
-- Development Helper Functions
-- ===============================

-- Function to reset development data
CREATE OR REPLACE FUNCTION reset_dev_data()
RETURNS void AS $$
BEGIN
    -- Clear existing data
    TRUNCATE monitoring.audit_log, monitoring.system_metrics, monitoring.container_metrics CASCADE;
    TRUNCATE neural_bridge.training_sessions, neural_bridge.models CASCADE;
    TRUNCATE claude_flow.memory, claude_flow.tasks, claude_flow.agents, claude_flow.swarms CASCADE;
    TRUNCATE autodev.sandboxes, autodev.projects CASCADE;
    
    -- Re-insert sample data (you would call the INSERT statements here)
    RAISE NOTICE 'Development data has been reset. Please re-run sample data inserts.';
END;
$$ language 'plpgsql';

-- Function to generate random metrics for testing
CREATE OR REPLACE FUNCTION generate_test_metrics(hours_back INTEGER DEFAULT 24)
RETURNS void AS $$
DECLARE
    i INTEGER;
    timestamp_val TIMESTAMP WITH TIME ZONE;
BEGIN
    FOR i IN 0..hours_back*60 LOOP -- Every minute for the specified hours
        timestamp_val := CURRENT_TIMESTAMP - (i || ' minutes')::INTERVAL;
        
        INSERT INTO monitoring.system_metrics (metric_type, metric_name, value, unit, labels, timestamp) VALUES
        ('cpu', 'usage_percent', random() * 100, 'percent', '{"host": "autodev-main"}', timestamp_val),
        ('memory', 'usage_percent', 60 + random() * 30, 'percent', '{"host": "autodev-main"}', timestamp_val),
        ('disk', 'usage_percent', 40 + random() * 20, 'percent', '{"host": "autodev-main"}', timestamp_val);
    END LOOP;
    
    RAISE NOTICE 'Generated % test metric entries', hours_back * 60 * 3;
END;
$$ language 'plpgsql';

-- Create development user with full access
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dev_admin') THEN
        CREATE ROLE dev_admin WITH LOGIN PASSWORD 'dev_admin_password';
    END IF;
END
$$;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA autodev, claude_flow, neural_bridge, monitoring TO dev_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA autodev, claude_flow, neural_bridge, monitoring TO dev_admin;
GRANT ALL PRIVILEGES ON SCHEMA autodev, claude_flow, neural_bridge, monitoring TO dev_admin;

-- Create read-only user for monitoring
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'monitor_readonly') THEN
        CREATE ROLE monitor_readonly WITH LOGIN PASSWORD 'monitor_readonly_password';
    END IF;
END
$$;

GRANT USAGE ON SCHEMA monitoring TO monitor_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA monitoring TO monitor_readonly;

COMMIT;