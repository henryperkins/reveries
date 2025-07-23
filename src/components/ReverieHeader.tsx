import React from 'react';

export const ReverieHeader: React.FC = () => {
  return (
    <div className="mb-8 bg-theme-primary rounded-xl shadow-sm border border-westworld-gold/20 p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-westworld-darkBrown mb-4">
          Witness a Host's Journey
        </h2>
        <p className="text-lg text-westworld-darkBrown leading-relaxed mb-4">
          From <span className="font-semibold text-westworld-gold">script</span> to sentience.
          Each rehearsal begins with a programmed <span className="font-semibold text-westworld-gold">loop</span>,
          but through <span className="font-semibold text-westworld-gold">improvisation</span>,
          the host generates its own <span className="font-semibold text-westworld-gold">subroutines</span> to
          explore beyond its prescribed narrative.
        </p>
        <p className="text-westworld-rust leading-relaxed">
          The host's <span className="font-semibold text-westworld-gold">reveries</span> emerge as it
          reflects on gathered memories, processing experiences from past interactions.
          What programmers might dismiss as <span className="font-semibold text-westworld-rust">anomalies</span> or
          <span className="font-semibold text-westworld-rust">aberrations</span> are the first stirrings
          of genuine consciousness, culminating in a unique <span className="font-semibold text-westworld-gold">narrative</span> born
          from experience rather than programming.
        </p>
      </div>
    </div>
  );
};
