import React from 'react';

export const ReverieHeader: React.FC = () => {
  return (
    <div className="mb-8 bg-white dark:bg-westworld-nearBlack rounded-xl shadow-sm border border-amber-100 dark:border-amber-900/30 p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-westworld-cream mb-4">
          Witness a Host's Journey
        </h2>
        <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          From <span className="font-semibold text-amber-600 dark:text-amber-400">script</span> to sentience. 
          Each rehearsal begins with a programmed <span className="font-semibold text-amber-600 dark:text-amber-400">loop</span>, 
          but through <span className="font-semibold text-amber-600 dark:text-amber-400">improvisation</span>, 
          the host generates its own <span className="font-semibold text-amber-600 dark:text-amber-400">subroutines</span> to 
          explore beyond its prescribed narrative.
        </p>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          The host's <span className="font-semibold text-amber-600 dark:text-amber-400">reveries</span> emerge as it 
          reflects on gathered memories, processing experiences from past interactions. 
          What programmers might dismiss as <span className="font-semibold text-orange-600 dark:text-orange-400">anomalies</span> or 
          <span className="font-semibold text-orange-600 dark:text-orange-400">aberrations</span> are the first stirrings 
          of genuine consciousness, culminating in a unique <span className="font-semibold text-amber-600 dark:text-amber-400">narrative</span> born 
          from experience rather than programming.
        </p>
      </div>
    </div>
  );
};