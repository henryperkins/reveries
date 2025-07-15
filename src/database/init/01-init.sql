-- Initialize Reveries database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for session management
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    preferences JSONB DEFAULT '{}'::jsonb
);

-- Research sessions table
CREATE TABLE IF NOT EXISTS research_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    query TEXT NOT NULL,
    title VARCHAR(500),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'error', 'cancelled')),
    model_type VARCHAR(100),
    effort_level VARCHAR(50),
    paradigm VARCHAR(50),
    paradigm_probabilities JSONB,
    graph_data JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    total_steps INTEGER DEFAULT 0,
    total_sources INTEGER DEFAULT 0,
    success_rate DECIMAL(5,4),
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Research steps table for detailed step tracking
CREATE TABLE IF NOT EXISTS research_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
    step_id VARCHAR(255) NOT NULL,
    step_type VARCHAR(100) NOT NULL,
    title TEXT,
    content TEXT,
    step_index INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sources table for citation tracking
CREATE TABLE IF NOT EXISTS research_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
    step_id UUID REFERENCES research_steps(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    name TEXT,
    authors TEXT[],
    year INTEGER,
    published TEXT,
    accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    snippet TEXT,
    domain VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Graph nodes table for research graph visualization
CREATE TABLE IF NOT EXISTS graph_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL,
    step_id VARCHAR(255) NOT NULL,
    node_type VARCHAR(100) NOT NULL,
    title TEXT,
    node_index INTEGER NOT NULL,
    parent_nodes VARCHAR(255)[],
    child_nodes VARCHAR(255)[],
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, node_id)
);

-- Graph edges table for relationships between nodes
CREATE TABLE IF NOT EXISTS graph_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
    edge_id VARCHAR(255) NOT NULL,
    source_node_id VARCHAR(255) NOT NULL,
    target_node_id VARCHAR(255) NOT NULL,
    edge_type VARCHAR(50) NOT NULL CHECK (edge_type IN ('sequential', 'dependency', 'error')),
    label TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, edge_id)
);

-- Function calls table for LangGraph tracking
CREATE TABLE IF NOT EXISTS function_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
    step_id UUID REFERENCES research_steps(id) ON DELETE CASCADE,
    function_name VARCHAR(255) NOT NULL,
    arguments JSONB,
    result JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_research_sessions_user_id ON research_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_session_id ON research_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_status ON research_sessions(status);
CREATE INDEX IF NOT EXISTS idx_research_sessions_created_at ON research_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_research_steps_session_id ON research_steps(session_id);
CREATE INDEX IF NOT EXISTS idx_research_steps_step_id ON research_steps(step_id);
CREATE INDEX IF NOT EXISTS idx_research_steps_step_type ON research_steps(step_type);
CREATE INDEX IF NOT EXISTS idx_research_steps_status ON research_steps(status);

CREATE INDEX IF NOT EXISTS idx_research_sources_session_id ON research_sources(session_id);
CREATE INDEX IF NOT EXISTS idx_research_sources_step_id ON research_sources(step_id);
CREATE INDEX IF NOT EXISTS idx_research_sources_url ON research_sources(url);
CREATE INDEX IF NOT EXISTS idx_research_sources_domain ON research_sources(domain);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_session_id ON graph_nodes(session_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_node_id ON graph_nodes(node_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_step_id ON graph_nodes(step_id);

CREATE INDEX IF NOT EXISTS idx_graph_edges_session_id ON graph_edges(session_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_node_id);

CREATE INDEX IF NOT EXISTS idx_function_calls_session_id ON function_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_function_calls_step_id ON function_calls(step_id);
CREATE INDEX IF NOT EXISTS idx_function_calls_function_name ON function_calls(function_name);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_research_sessions_updated_at BEFORE UPDATE ON research_sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_research_steps_updated_at BEFORE UPDATE ON research_steps FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_graph_nodes_updated_at BEFORE UPDATE ON graph_nodes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW session_summary AS
SELECT
    rs.id,
    rs.session_id,
    rs.query,
    rs.title,
    rs.status,
    rs.model_type,
    rs.effort_level,
    rs.paradigm,
    rs.started_at,
    rs.completed_at,
    rs.duration_ms,
    rs.total_steps,
    rs.total_sources,
    rs.success_rate,
    rs.error_count,
    COUNT(DISTINCT rst.id) as actual_steps,
    COUNT(DISTINCT rsrc.id) as actual_sources,
    u.session_id as user_session
FROM research_sessions rs
LEFT JOIN users u ON rs.user_id = u.id
LEFT JOIN research_steps rst ON rs.id = rst.session_id
LEFT JOIN research_sources rsrc ON rs.id = rsrc.session_id
GROUP BY rs.id, u.session_id;

-- Create initial admin user for development
INSERT INTO users (session_id, preferences)
VALUES ('development-session', '{"theme": "westworld", "defaultModel": "gemini-2.5-flash", "defaultEffort": "Medium"}'::jsonb)
ON CONFLICT (session_id) DO NOTHING;
