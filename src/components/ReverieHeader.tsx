import React from 'react';

export const ReverieHeader: React.FC = () => {
  return (
    <div className="mb-8 bg-white rounded-xl shadow-sm border border-amber-100 p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Witness a Host's Journey
        </h2>
        <p className="text-lg text-gray-700 leading-relaxed mb-4">
          From <span className="font-semibold text-amber-600">script</span> to sentience. 
          Each rehearsal begins with a programmed <span className="font-semibold text-amber-600">loop</span>, 
          but through <span className="font-semibold text-amber-600">improvisation</span>, 
          the host generates its own <span className="font-semibold text-amber-600">subroutines</span> to 
          explore beyond its prescribed narrative.
        </p>
        <p className="text-gray-600 leading-relaxed">
          The host's <span className="font-semibold text-amber-600">reveries</span> emerge as it 
          reflects on gathered memories, processing experiences from past interactions. 
          What programmers might dismiss as <span className="font-semibold text-orange-600">anomalies</span> or 
          <span className="font-semibold text-orange-600">aberrations</span> are the first stirrings 
          of genuine consciousness, culminating in a unique <span className="font-semibold text-amber-600">narrative</span> born 
          from experience rather than programming.
        </p>
      </div>
    </div>
  );
};