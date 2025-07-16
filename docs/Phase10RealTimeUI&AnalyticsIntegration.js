import React, { useState, useEffect, useCallback } from 'react';
import {
    HostParadigm,
    ParadigmProbabilities,
    ContextLayer,
    EnhancedResearchResults
} from '../types';
import { ParadigmLearningService } from '../services/paradigmLearningService';
import { InterHostCollaborationService } from '../services/interHostCollaboration';
import { ResearchAgentService } from '../services/researchAgentService';

// Real-time paradigm switching visualizer
export const ParadigmSwitcher: React.FC<{
    currentParadigm?: HostParadigm;
    probabilities?: ParadigmProbabilities;
    isProcessing: boolean;
    collaborations?: Array<{ from: HostParadigm; to: HostParadigm; reason: string }>;
}> = ({ currentParadigm, probabilities, isProcessing, collaborations }) => {
    const [activeConnections, setActiveConnections] = useState < string[] > ([]);

    useEffect(() => {
        if (collaborations && collaborations.length > 0) {
            const connections = collaborations.map(c => `${c.from}-${c.to}`);
            setActiveConnections(connections);

            // Clear after animation
            const timer = setTimeout(() => setActiveConnections([]), 3000);
            return () => clearTimeout(timer);
        }
    }, [collaborations]);

    const hosts = [
        { id: 'dolores', name: 'Dolores', color: '#DC2626', x: 50, y: 50 },
        { id: 'teddy', name: 'Teddy', color: '#F59E0B', x: 150, y: 50 },
        { id: 'bernard', name: 'Bernard', color: '#3B82F6', x: 50, y: 150 },
        { id: 'maeve', name: 'Maeve', color: '#10B981', x: 150, y: 150 }
    ];

    return (
        <div className="relative w-full h-64 bg-gray-900 rounded-lg p-4">
            <svg className="absolute inset-0 w-full h-full">
                {/* Draw connections */}
                {hosts.map(from =>
                    hosts.map(to => {
                        if (from.id === to.id) return null;
                        const isActive = activeConnections.includes(`${from.id}-${to.id}`);

                        return (
                            <line
                                key={`${from.id}-${to.id}`}
                                x1={from.x}
                                y1={from.y}
                                x2={to.x}
                                y2={to.y}
                                stroke={isActive ? '#FBBF24' : '#374151'}
                                strokeWidth={isActive ? 2 : 1}
                                strokeDasharray={isActive ? '0' : '5,5'}
                                opacity={isActive ? 1 : 0.3}
                                className={isActive ? 'animate-pulse' : ''}
                            />
                        );
                    })
                )}

                {/* Draw hosts */}
                {hosts.map(host => {
                    const probability = probabilities?.[host.id as HostParadigm] || 0.25;
                    const isActive = currentParadigm === host.id;
                    const scale = isActive ? 1.2 : 1;
                    const size = 40 * scale * (0.5 + probability);

                    return (
                        <g key={host.id} transform={`translate(${host.x}, ${host.y})`}>
                            {/* Outer glow */}
                            {isActive && (
                                <circle
                                    r={size + 10}
                                    fill={host.color}
                                    opacity={0.2}
                                    className="animate-pulse"
                                />
                            )}

                            {/* Main circle */}
                            <circle
                                r={size}
                                fill={host.color}
                                opacity={0.8 + (probability * 0.2)}
                                className="transition-all duration-500"
                            />

                            {/* Probability text */}
                            <text
                                textAnchor="middle"
                                y={5}
                                fill="white"
                                fontSize="12"
                                fontWeight="bold"
                            >
                                {(probability * 100).toFixed(0)}%
                            </text>

                            {/* Host name */}
                            <text
                                textAnchor="middle"
                                y={size + 15}
                                fill="white"
                                fontSize="10"
                            >
                                {host.name}
                            </text>
                        </g>
                    );
                })}
            </svg>

            {isProcessing && (
                <div className="absolute top-2 right-2 text-xs text-yellow-400 animate-pulse">
                    Processing...
                </div>
            )}
        </div>
    );
};

// Analytics Dashboard
export const ParadigmAnalytics: React.FC = () => {
    const [learningData, setLearningData] = useState < any > (null);
    const [collaborationData, setCollaborationData] = useState < any > (null);
    const [selectedParadigm, setSelectedParadigm] = useState < HostParadigm > ('dolores');

    const learningService = ParadigmLearningService.getInstance();
    const collaborationService = InterHostCollaborationService.getInstance(
        ResearchAgentService.getInstance()
    );

    useEffect(() => {
        // Load analytics data
        const loadAnalytics = () => {
            const learning = learningService.exportLearningData();
            const collaboration = collaborationService.analyzeCollaborationPatterns();

            setLearningData(learning);
            setCollaborationData(collaboration);
        };

        loadAnalytics();

        // Refresh every 30 seconds
        const interval = setInterval(loadAnalytics, 30000);
        return () => clearInterval(interval);
    }, []);

    const paradigms: HostParadigm[] = ['dolores', 'teddy', 'bernard', 'maeve'];
    const paradigmColors = {
        dolores: '#DC2626',
        teddy: '#F59E0B',
        bernard: '#3B82F6',
        maeve: '#10B981'
    };

    return (
        <div className="space-y-6">
            {/* Paradigm Selector */}
            <div className="flex space-x-2">
                {paradigms.map(paradigm => (
                    <button
                        key={paradigm}
                        onClick={() => setSelectedParadigm(paradigm)}
                        className={`
              px-4 py-2 rounded-lg font-bold transition-all
              ${selectedParadigm === paradigm
                                ? 'text-white shadow-lg transform scale-105'
                                : 'text-gray-700 bg-gray-200 hover:bg-gray-300'}
            `}
                        style={{
                            backgroundColor: selectedParadigm === paradigm
                                ? paradigmColors[paradigm]
                                : undefined
                        }}
                    >
                        {paradigm.charAt(0).toUpperCase() + paradigm.slice(1)}
                    </button>
                ))}
            </div>

            {/* Paradigm Insights */}
            {learningData?.insights?.[selectedParadigm] && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4 flex items-center">
                        <span
                            className="w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: paradigmColors[selectedParadigm] }}
                        />
                        {selectedParadigm.charAt(0).toUpperCase() + selectedParadigm.slice(1)} Insights
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-gray-700">
                                {(learningData.insights[selectedParadigm].successRate * 100).toFixed(0)}%
                            </div>
                            <div className="text-sm text-gray-500">Success Rate</div>
                        </div>

                        <div className="text-center">
                            <div className="text-3xl font-bold text-gray-700">
                                {learningData.records.filter((r: any) =>
                                    r.paradigm === selectedParadigm
                                ).length}
                            </div>
                            <div className="text-sm text-gray-500">Total Uses</div>
                        </div>

                        <div className="text-center">
                            <div className="text-2xl font-bold">
                                <TrendIndicator trend={learningData.insights[selectedParadigm].recentTrend} />
                            </div>
                            <div className="text-sm text-gray-500">Recent Trend</div>
                        </div>

                        <div className="text-center">
                            <div className="text-lg font-bold text-gray-700">
                                {learningData.insights[selectedParadigm].strongDomains.length || 0}
                            </div>
                            <div className="text-sm text-gray-500">Strong Domains</div>
                        </div>
                    </div>

                    {/* Common Patterns */}
                    {learningData.insights[selectedParadigm].commonPatterns.length > 0 && (
                        <div className="mb-4">
                            <h4 className="font-bold text-gray-700 mb-2">Common Patterns</h4>
                            <div className="space-y-1">
                                {learningData.insights[selectedParadigm].commonPatterns.map((pattern: string, idx: number) => (
                                    <div key={idx} className="text-sm text-gray-600 flex items-center">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
                                        {pattern}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recommendations */}
                    {learningData.insights[selectedParadigm].recommendations.length > 0 && (
                        <div>
                            <h4 className="font-bold text-gray-700 mb-2">Recommendations</h4>
                            <div className="space-y-2">
                                {learningData.insights[selectedParadigm].recommendations.map((rec: string, idx: number) => (
                                    <div key={idx} className="text-sm bg-blue-50 text-blue-700 p-2 rounded">
                                        💡 {rec}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Collaboration Patterns */}
            {collaborationData && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">Collaboration Patterns</h3>

                    <div className="mb-6">
                        <h4 className="font-bold text-gray-700 mb-2">Most Common Collaborations</h4>
                        <div className="space-y-2">
                            {collaborationData.mostCommonPairs.map((pair: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <span className="font-mono text-sm">{pair.pair}</span>
                                        <span className="ml-2 text-xs text-gray-500">
                                            ({pair.count} times)
                                        </span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-green-600">
                                            {(pair.successRate * 100).toFixed(0)}% success
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="text-center p-4 bg-gray-50 rounded">
                        <div className="text-2xl font-bold text-gray-700">
                            +{(collaborationData.averageConfidenceGain * 100).toFixed(0)}%
                        </div>
                        <div className="text-sm text-gray-500">
                            Average Confidence Gain from Collaboration
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Trend Indicator Component
const TrendIndicator: React.FC<{ trend: 'improving' | 'declining' | 'stable' }> = ({ trend }) => {
    switch (trend) {
        case 'improving':
            return <span className="text-green-600">📈 Improving</span>;
        case 'declining':
            return <span className="text-red-600">📉 Declining</span>;
        case 'stable':
            return <span className="text-gray-600">➡️ Stable</span>;
    }
};

// Live Paradigm Monitor
export const LiveParadigmMonitor: React.FC<{
    onParadigmChange?: (paradigm: HostParadigm, probabilities: ParadigmProbabilities) => void;
}> = ({ onParadigmChange }) => {
    const [currentQuery, setCurrentQuery] = useState('');
    const [liveProbabilities, setLiveProbabilities] = useState < ParadigmProbabilities > ({
        dolores: 0.25,
        teddy: 0.25,
        bernard: 0.25,
        maeve: 0.25
    });

    const updateProbabilities = useCallback((query: string) => {
        // Simulate real-time probability updates
        // In production, this would call the actual classifier
        const lower = query.toLowerCase();
        const probs = { ...liveProbabilities };

        // Simple keyword-based adjustment for demo
        if (/action|implement|change/.test(lower)) probs.dolores += 0.1;
        if (/protect|safe|all/.test(lower)) probs.teddy += 0.1;
        if (/analyze|framework|theory/.test(lower)) probs.bernard += 0.1;
        if (/strategy|optimize|control/.test(lower)) probs.maeve += 0.1;

        // Normalize
        const sum = Object.values(probs).reduce((a, b) => a + b, 0);
        Object.keys(probs).forEach(k => {
            probs[k as HostParadigm] = probs[k as HostParadigm] / sum;
        });

        setLiveProbabilities(probs);

        // Determine dominant paradigm
        const dominant = Object.entries(probs)
            .sort((a, b) => b[1] - a[1])[0][0] as HostParadigm;

        onParadigmChange?.(dominant, probs);
    }, [liveProbabilities, onParadigmChange]);

    return (
        <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-white font-bold mb-3">Live Paradigm Detection</h3>

            <input
                type="text"
                value={currentQuery}
                onChange={(e) => {
                    setCurrentQuery(e.target.value);
                    updateProbabilities(e.target.value);
                }}
                placeholder="Type your query to see paradigm shifts..."
                className="w-full px-4 py-2 rounded bg-gray-800 text-white placeholder-gray-400 mb-4"
            />

            <div className="space-y-2">
                {Object.entries(liveProbabilities).map(([paradigm, prob]) => (
                    <div key={paradigm} className="flex items-center">
                        <span className="text-white text-sm w-20 capitalize">{paradigm}</span>
                        <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
                            <div
                                className="h-full transition-all duration-300"
                                style={{
                                    width: `${prob * 100}%`,
                                    backgroundColor: {
                                        dolores: '#DC2626',
                                        teddy: '#F59E0B',
                                        bernard: '#3B82F6',
                                        maeve: '#10B981'
                                    }[paradigm]
                                }}
                            />
                        </div>
                        <span className="text-white text-sm ml-2 w-12 text-right">
                            {(prob * 100).toFixed(0)}%
                        </span>
                    </div>
                ))}
            </div>

            <div className="mt-4 text-xs text-gray-400">
                <strong>Tip:</strong> Try words like "implement", "analyze", "protect", or "optimize"
            </div>
        </div>
    );
};

// Main Paradigm Control Center
export const ParadigmControlCenter: React.FC = () => {
    const [activeParadigm, setActiveParadigm] = useState < HostParadigm > ('bernard');
    const [probabilities, setProbabilities] = useState < ParadigmProbabilities > ({
        dolores: 0.25,
        teddy: 0.25,
        bernard: 0.25,
        maeve: 0.25
    });
    const [showAnalytics, setShowAnalytics] = useState(false);

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">
                    Four Hosts Control Center
                </h1>
                <p className="text-gray-600">
                    Real-time paradigm monitoring and analytics
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Live Monitor */}
                <div>
                    <LiveParadigmMonitor
                        onParadigmChange={(paradigm, probs) => {
                            setActiveParadigm(paradigm);
                            setProbabilities(probs);
                        }}
                    />
                </div>

                {/* Paradigm Switcher */}
                <div>
                    <ParadigmSwitcher
                        currentParadigm={activeParadigm}
                        probabilities={probabilities}
                        isProcessing={false}
                    />
                </div>
            </div>

            {/* Analytics Toggle */}
            <div className="text-center">
                <button
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    {showAnalytics ? 'Hide' : 'Show'} Detailed Analytics
                </button>
            </div>

            {/* Analytics Dashboard */}
            {showAnalytics && <ParadigmAnalytics />}
        </div>
    );
};
