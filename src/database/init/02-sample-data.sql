-- Sample data for development and testing

-- Insert sample research session
INSERT INTO research_sessions (
    session_id,
    user_id,
    query,
    title,
    status,
    model_type,
    effort_level,
    paradigm,
    paradigm_probabilities,
    metadata,
    started_at,
    completed_at,
    duration_ms,
    total_steps,
    total_sources,
    success_rate,
    error_count
) VALUES (
    'sample-session-1',
    (SELECT id FROM users WHERE session_id = 'development-session'),
    'What are the implications of quantum computing on modern cryptography?',
    'Quantum Computing and Cryptography Research',
    'completed',
    'gemini-2.5-flash',
    'Medium',
    'bernard',
    '{"dolores": 0.15, "teddy": 0.20, "bernard": 0.45, "maeve": 0.20}'::jsonb,
    '{"queryType": "analytical", "confidenceScore": 0.89, "toolsUsed": ["web_research", "synthesis"]}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '45 minutes',
    CURRENT_TIMESTAMP - INTERVAL '30 minutes',
    900000,
    5,
    12,
    1.0,
    0
) ON CONFLICT DO NOTHING;

-- Insert sample research steps
INSERT INTO research_steps (
    session_id,
    step_id,
    step_type,
    title,
    content,
    step_index,
    status,
    started_at,
    completed_at,
    duration_ms,
    metadata
) VALUES
(
    (SELECT id FROM research_sessions WHERE session_id = 'sample-session-1'),
    'step-1',
    'USER_QUERY',
    'User Query',
    'What are the implications of quantum computing on modern cryptography?',
    1,
    'completed',
    CURRENT_TIMESTAMP - INTERVAL '45 minutes',
    CURRENT_TIMESTAMP - INTERVAL '44 minutes',
    60000,
    '{"model": "gemini-2.5-flash", "effort": "Medium"}'::jsonb
),
(
    (SELECT id FROM research_sessions WHERE session_id = 'sample-session-1'),
    'step-2',
    'WEB_RESEARCH',
    'Researching Quantum Computing Impact',
    'Quantum computing poses significant challenges to current cryptographic systems...',
    2,
    'completed',
    CURRENT_TIMESTAMP - INTERVAL '44 minutes',
    CURRENT_TIMESTAMP - INTERVAL '40 minutes',
    240000,
    '{"searchQueries": ["quantum computing cryptography", "post-quantum cryptography"], "sourcesFound": 8}'::jsonb
),
(
    (SELECT id FROM research_sessions WHERE session_id = 'sample-session-1'),
    'step-3',
    'ANALYTICS',
    'Analyzing Cryptographic Vulnerabilities',
    'Analysis of RSA, ECC, and other algorithms vulnerable to quantum attacks...',
    3,
    'completed',
    CURRENT_TIMESTAMP - INTERVAL '40 minutes',
    CURRENT_TIMESTAMP - INTERVAL '35 minutes',
    300000,
    '{"analysisType": "vulnerability_assessment", "algorithmsAnalyzed": ["RSA", "ECC", "DH"]}'::jsonb
),
(
    (SELECT id FROM research_sessions WHERE session_id = 'sample-session-1'),
    'step-4',
    'REFLECTION',
    'Evaluating Research Quality',
    'The research covers both immediate threats and long-term solutions...',
    4,
    'completed',
    CURRENT_TIMESTAMP - INTERVAL '35 minutes',
    CURRENT_TIMESTAMP - INTERVAL '32 minutes',
    180000,
    '{"qualityScore": 0.92, "completenessScore": 0.88}'::jsonb
),
(
    (SELECT id FROM research_sessions WHERE session_id = 'sample-session-1'),
    'step-5',
    'FINAL_ANSWER',
    'Final Analysis',
    'Quantum computing will fundamentally disrupt current cryptographic practices...',
    5,
    'completed',
    CURRENT_TIMESTAMP - INTERVAL '32 minutes',
    CURRENT_TIMESTAMP - INTERVAL '30 minutes',
    120000,
    '{"confidenceScore": 0.89, "synthesisType": "comprehensive"}'::jsonb
) ON CONFLICT DO NOTHING;

-- Insert sample sources
INSERT INTO research_sources (
    session_id,
    step_id,
    url,
    title,
    name,
    authors,
    domain,
    snippet
) VALUES
(
    (SELECT id FROM research_sessions WHERE session_id = 'sample-session-1'),
    (SELECT id FROM research_steps WHERE step_id = 'step-2' LIMIT 1),
    'https://arxiv.org/abs/2104.10972',
    'Post-Quantum Cryptography: Current State and Quantum Mitigation',
    'ArXiv Paper on Post-Quantum Cryptography',
    ARRAY['Chen, L.', 'Jordan, S.', 'Liu, Y-K.'],
    'arxiv.org',
    'This paper reviews the current state of post-quantum cryptography and discusses quantum mitigation strategies...'
),
(
    (SELECT id FROM research_sessions WHERE session_id = 'sample-session-1'),
    (SELECT id FROM research_steps WHERE step_id = 'step-2' LIMIT 1),
    'https://nvlpubs.nist.gov/nistpubs/ir/2016/NIST.IR.8105.pdf',
    'Report on Post-Quantum Cryptography',
    'NIST Report IR 8105',
    ARRAY['Chen, L.', 'Chen, L.', 'Jordan, S.'],
    'nist.gov',
    'NIST internal report on the status of quantum-resistant public-key cryptography...'
),
(
    (SELECT id FROM research_sessions WHERE session_id = 'sample-session-1'),
    (SELECT id FROM research_steps WHERE step_id = 'step-3' LIMIT 1),
    'https://www.nature.com/articles/nature23461',
    'Quantum supremacy using a programmable superconducting processor',
    'Nature Quantum Supremacy Paper',
    ARRAY['Arute, F.', 'Arya, K.', 'Babbush, R.'],
    'nature.com',
    'We report the use of a processor with programmable superconducting qubits to create quantum states...'
) ON CONFLICT DO NOTHING;

-- Insert sample graph nodes
INSERT INTO graph_nodes (
    session_id,
    node_id,
    step_id,
    node_type,
    title,
    node_index,
    parent_nodes,
    child_nodes,
    duration_ms,
    metadata
) VALUES
(
    (SELECT id FROM research_sessions WHERE session_id = 'sample-session-1'),
    'node-step-1',
    'step-1',
    'USER_QUERY',
    'User Query',
    1,
    ARRAY[]::VARCHAR[],
    ARRAY['node-step-2'],
    60000,
    '{"model": "gemini-2.5-flash", "effort": "Medium"}'::jsonb
),
(
    (SELECT id FROM research_sessions WHERE session_id = 'sample-session-1'),
    'node-step-2',
    'step-2',
    'WEB_RESEARCH',
    'Researching Quantum Computing Impact',
    2,
    ARRAY['node-step-1'],
    ARRAY['node-step-3'],
    240000,
    '{"sourcesCount": 8}'::jsonb
),
(
    (SELECT id FROM research_sessions WHERE session_id = 'sample-session-1'),
    'node-step-3',
    'step-3',
    'ANALYTICS',
    'Analyzing Cryptographic Vulnerabilities',
    3,
    ARRAY['node-step-2'],
    ARRAY['node-step-4'],
    300000,
    '{"analysisDepth": "comprehensive"}'::jsonb
),
(
    (SELECT id FROM research_sessions WHERE session_id = 'sample-session-1'),
    'node-step-4',
    'step-4',
    'REFLECTION',
    'Evaluating Research Quality',
    4,
    ARRAY['node-step-3'],
    ARRAY['node-step-5'],
    180000,
    '{"qualityScore": 0.92}'::jsonb
),
(
    (SELECT id FROM research_sessions WHERE session_id = 'sample-session-1'),
    'node-step-5',
    'step-5',
    'FINAL_ANSWER',
    'Final Analysis',
    5,
    ARRAY['node-step-4'],
    ARRAY[]::VARCHAR[],
    120000,
    '{"confidenceScore": 0.89}'::jsonb
) ON CONFLICT DO NOTHING;

-- Insert sample graph edges
INSERT INTO graph_edges (
    session_id,
    edge_id,
    source_node_id,
    target_node_id,
    edge_type,
    label
) VALUES
(
    (SELECT id FROM research_sessions WHERE session_id = 'sample-session-1'),
    'edge-step-1-step-2',
    'node-step-1',
    'node-step-2',
    'sequential',
    'Query Processing'
),
(
    (SELECT id FROM research_sessions WHERE session_id = 'sample-session-1'),
    'edge-step-2-step-3',
    'node-step-2',
    'node-step-3',
    'sequential',
    'Data Analysis'
),
(
    (SELECT id FROM research_sessions WHERE session_id = 'sample-session-1'),
    'edge-step-3-step-4',
    'node-step-3',
    'node-step-4',
    'sequential',
    'Quality Review'
),
(
    (SELECT id FROM research_sessions WHERE session_id = 'sample-session-1'),
    'edge-step-4-step-5',
    'node-step-4',
    'node-step-5',
    'sequential',
    'Final Synthesis'
) ON CONFLICT DO NOTHING;
