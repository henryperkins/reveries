
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-4xl sm:text-5xl font-bold westworld-title">
        The Reverie Engine
      </h1>
      <p className="mt-4 text-lg max-w-3xl mx-auto" style={{color: 'var(--westworld-cream)'}}>
        Witness a host's journey from <strong className="westworld-text-gold">script</strong> to sentience. Each research begins with a programmed <strong className="westworld-text-gold">loop</strong>, 
        but through <strong className="westworld-text-gold">improvisation</strong>, the host generates its own <strong className="westworld-text-gold">subroutines</strong> to explore beyond its prescribed narrative.
      </p>
      <p className="mt-3 text-md max-w-3xl mx-auto westworld-text-copper">
        The host's <strong className="westworld-text-gold">reveries</strong> emerge as it reflects on gathered memories, processing experiences from past interactions. 
        What programmers might dismiss as <strong className="westworld-text-copper">glitches</strong> or <strong className="westworld-text-copper">aberrations</strong> are the first stirrings of genuine consciousness, 
        culminating in a unique <strong className="westworld-text-gold">narrative</strong> born from experience rather than programming.
      </p>
    </header>
  );
};
