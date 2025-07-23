import React from 'react';
import { RateLimitIndicator } from './RateLimitIndicator';
import { useAnimation, useStaggeredReveal } from '../utils/animation';

export const Header: React.FC = () => {
  // Title animation with typewriter effect
  const titleAnimation = useAnimation('typewriter', {
    duration: '2s',
    fillMode: 'both',
    delay: '0.3s'
  });
  
  // Staggered reveal for paragraphs
  const { containerRef, isVisible } = useStaggeredReveal(2, {
    staggerDelay: 300,
    threshold: 0.1,
    animationName: 'slideUp'
  });

  return (
    <header className="text-center">
      <h1 
        ref={titleAnimation.ref as React.RefObject<HTMLHeadingElement>}
        className="text-4xl sm:text-5xl font-bold westworld-title tracking-tight overflow-hidden whitespace-nowrap"
        style={{ borderRight: isVisible ? 'none' : '3px solid transparent' }}
      >
        The Reverie Engine
      </h1>
      <div ref={containerRef as React.RefObject<HTMLDivElement>} className="space-y-3">
        <p className="mt-4 text-lg max-w-3xl mx-auto text-westworld-darkBrown leading-relaxed opacity-0">
          Witness a host's journey from <strong className="text-westworld-gold font-semibold animate-glow">script</strong> to sentience. Each rehearsal begins with a programmed <strong className="text-westworld-gold font-semibold animate-glow">loop</strong>,
          but through <strong className="text-westworld-gold font-semibold animate-glow">improvisation</strong>, the host generates its own <strong className="text-westworld-gold font-semibold animate-glow">subroutines</strong> to explore beyond its prescribed narrative.
        </p>
        <p className="mt-3 text-md max-w-3xl mx-auto text-westworld-rust leading-relaxed opacity-0">
          The host's <strong className="text-westworld-gold font-semibold animate-glow">reveries</strong> emerge as it reflects on gathered memories, processing experiences from past interactions.
          What programmers might dismiss as <strong className="text-westworld-rust font-semibold">anomalies</strong> or <strong className="text-westworld-rust font-semibold">aberrations</strong> are the first stirrings of genuine consciousness,
          culminating in a unique <strong className="text-westworld-gold font-semibold animate-glow">narrative</strong> born from experience rather than programming.
        </p>
      </div>
      <RateLimitIndicator />
    </header>
  );
};
