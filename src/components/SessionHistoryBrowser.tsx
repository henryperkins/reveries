import React, { useState } from 'react';
import { ResearchSession } from '../hooks/useEnhancedPersistedState';
import { 
  ClockIcon, 
  XMarkIcon, 
  TrashIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface SessionHistoryBrowserProps {
  sessions: ResearchSession[];
  onLoadSession: (session: ResearchSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onClose: () => void;
  isVisible: boolean;
}

export const SessionHistoryBrowser: React.FC<SessionHistoryBrowserProps> = ({
  sessions,
  onLoadSession,
  onDeleteSession,
  onClose,
  isVisible
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState<ResearchSession | null>(null);

  // Filter sessions based on search query
  const filteredSessions = sessions.filter(session =>
    session.query.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const handleLoadSession = (session: ResearchSession) => {
    onLoadSession(session);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Research Session History</h2>
            <span className="text-sm text-gray-500">({sessions.length} sessions)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[70vh]">
          {/* Session List */}
          <div className="w-1/2 border-r">
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sessions..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Session List */}
            <div className="overflow-y-auto h-full">
              {filteredSessions.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchQuery ? 'No sessions match your search' : 'No sessions found'}
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedSession?.id === session.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {session.query}
                        </h3>
                        <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                          <span>{formatDate(session.timestamp)}</span>
                          <span>{session.steps.length} steps</span>
                          <span>{formatDuration(session.duration)}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          {session.model && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {session.model}
                            </span>
                          )}
                          {session.effort && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {session.effort}
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            session.completed 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {session.completed ? 'Completed' : 'In Progress'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Session Details */}
          <div className="w-1/2">
            {selectedSession ? (
              <div className="h-full flex flex-col">
                {/* Session Header */}
                <div className="p-4 border-b">
                  <h3 className="font-medium text-gray-900 mb-2">
                    {selectedSession.query}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <span className="ml-2">{formatDate(selectedSession.timestamp)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <span className="ml-2">{formatDuration(selectedSession.duration)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Steps:</span>
                      <span className="ml-2">{selectedSession.steps.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Sources:</span>
                      <span className="ml-2">
                        {selectedSession.steps.reduce((acc, step) => acc + (step.sources?.length || 0), 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Session Steps Preview */}
                <div className="flex-1 overflow-y-auto p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Research Steps</h4>
                  <div className="space-y-3">
                    {selectedSession.steps.map((step, index) => (
                      <div key={step.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-gray-500">Step {index + 1}</span>
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                            {step.type}
                          </span>
                        </div>
                        <h5 className="text-sm font-medium text-gray-900 mb-1">{step.title}</h5>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {typeof step.content === 'string' 
                            ? step.content.substring(0, 150) + '...'
                            : String(step.content).substring(0, 150) + '...'
                          }
                        </p>
                        {step.sources && step.sources.length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            {step.sources.length} source{step.sources.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t flex gap-2">
                  <button
                    onClick={() => handleLoadSession(selectedSession)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Load Session
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this session?')) {
                        onDeleteSession(selectedSession.id);
                        setSelectedSession(null);
                      }
                    }}
                    className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Select a session to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};