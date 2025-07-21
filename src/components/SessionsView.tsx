import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { ResearchSession } from '../hooks/usePersistentState';

interface SessionsViewProps {
  sessions: ResearchSession[];
  onLoadSession?: (session: ResearchSession) => void;
}

export const SessionsView: React.FC<SessionsViewProps> = ({ sessions, onLoadSession }) => {
  // Normalise – if sessions isn’t an array, fall back to empty array
  const safeSessions: ResearchSession[] = Array.isArray(sessions) ? sessions : [];
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Research Sessions</h3>

      {safeSessions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">No sessions yet</p>
          <p className="text-sm text-gray-400">Start a new research query to create your first session</p>
        </div>
      ) : (
        <div className="space-y-4">
          {safeSessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onLoadSession?.(session)}
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">{session.query}</h4>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(session.timestamp).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {session.steps.length} steps
                  </span>
                </div>
              </div>
              <button
                className="px-4 py-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadSession?.(session);
                }}
              >
                Load
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
