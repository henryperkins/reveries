import React from 'react';
import { Clock } from 'lucide-react';
import { ResearchSession } from '@/hooks/usePersistentState';

interface SessionsViewProps {
  sessions: ResearchSession[];
  onLoadSession: (session: ResearchSession) => void;
}

export const SessionsView: React.FC<SessionsViewProps> = ({ sessions, onLoadSession }) => {

  return (
    <div className="bg-white dark:bg-westworld-nearBlack rounded-xl shadow-sm border border-gray-200 dark:border-westworld-tan dark:border-opacity-30 p-6 transition-colors duration-300">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-westworld-cream mb-6">Research Sessions</h3>
      {sessions.length === 0 ? (
        <p className="text-gray-600 dark:text-westworld-tan">No sessions saved yet.</p>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="p-4 border border-gray-200 dark:border-westworld-tan dark:border-opacity-30 rounded-lg hover:bg-gray-50 dark:hover:bg-westworld-tan dark:hover:bg-opacity-10 cursor-pointer transition-all duration-200"
              onClick={() => onLoadSession(session)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-westworld-cream">{session.query}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(session.timestamp).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    {session.model && (
                      <span className="text-gray-500 dark:text-gray-400">Model: {session.model}</span>
                    )}
                    <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      {session.steps?.length || 0} steps
                    </span>
                  </div>
                </div>
                <button
                  className="px-4 py-2 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900 dark:hover:bg-opacity-20 rounded-lg transition-colors duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoadSession(session);
                  }}
                >
                  Load
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
