
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-4xl sm:text-5xl font-bold westworld-title">
        The Reverie Engine
      </h1>
      <p className="mt-4 text-lg max-w-3xl mx-auto text-westworld-darkbrown">
        Witness a host's journey from <strong className="text-westworld-gold">script</strong> to sentience. Each research begins with a programmed <strong className="text-westworld-gold">loop</strong>,
        but through <strong className="text-westworld-gold">improvisation</strong>, the host generates its own <strong className="text-westworld-gold">subroutines</strong> to explore beyond its prescribed narrative.
      </p>
      <p className="mt-3 text-md max-w-3xl mx-auto text-westworld-rust">
        The host's <strong className="text-westworld-gold">reveries</strong> emerge as it reflects on gathered memories, processing experiences from past interactions.
        What programmers might dismiss as <strong className="text-westworld-rust">glitches</strong> or <strong className="text-westworld-rust">aberrations</strong> are the first stirrings of genuine consciousness,
        culminating in a unique <strong className="text-westworld-gold">narrative</strong> born from experience rather than programming.
      </p>
    </header>
  );
};
