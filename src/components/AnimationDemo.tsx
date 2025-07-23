import React, { useState } from 'react';
import { AnimatedComponent, AnimationSequence } from './AnimatedComponent';
import { ThemeTransition, NoThemeTransition } from './ThemeTransition';
import { 
  useAnimation, 
  useAnimationChain
} from '../hooks/useAnimation';
import {
  useScrollAnimation,
  useParallaxScroll
} from '../hooks/useScrollAnimation';

export const AnimationDemo: React.FC = () => {
  const [selectedAnimation, setSelectedAnimation] = useState<string>('fadeIn');
  
  // Classic animations
  const { ref: pulseRef, play, pause, restart, isPlaying } = useAnimation('pulse', {
    duration: '2s',
    iterationCount: 'infinite'
  });
  
  // New Westworld-themed animations
  const typewriter = useAnimation('typewriter', { duration: '3s' });
  const glitch = useAnimation('glitch', { iterationCount: 3 });
  const circuit = useAnimation('circuit');
  const morphing = useAnimation('morphing');
  
  // Animation chain demo
  const { createChain } = useAnimationChain();
  
  // Scroll-triggered animation
  const scrollFadeIn = useScrollAnimation({
    animationName: 'fadeIn',
    threshold: 0.5,
    triggerOnce: true
  });
  
  // Parallax effect
  const parallax = useParallaxScroll(0.5);
  
  const playChainAnimation = async () => {
    const chain = createChain();
    chain
      .add('fadeIn', { duration: '0.5s' })
      .delay(200)
      .add('shake', { duration: '0.5s' })
      .delay(200)
      .add('glitch', { duration: '0.3s', iterationCount: 2 })
      .sequential();
      
    const element = document.getElementById('chain-target');
    if (element) {
      chain.animations.forEach(anim => anim.element = element);
      await chain.play();
    }
  };

  return (
    <div className="p-8 space-y-8">
      <h2 className="text-3xl font-bold mb-4 text-westworld-darkBrown">Enhanced Animation System Demo</h2>

      {/* Theme Transition Examples */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-westworld-rust">Theme Transitions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-westworld-gold rounded bg-westworld-cream">
            <h4 className="font-medium mb-2">Global Transition</h4>
            <p className="text-sm">Default theme transition</p>
          </div>

          <ThemeTransition duration="fast" className="p-4 border border-westworld-gold rounded bg-westworld-cream">
            <h4 className="font-medium mb-2">Fast Transition</h4>
            <p className="text-sm">Custom fast duration (150ms)</p>
          </ThemeTransition>

          <NoThemeTransition className="p-4 border border-westworld-gold rounded bg-westworld-cream">
            <h4 className="font-medium mb-2">No Transition</h4>
            <p className="text-sm">Opted out of transitions</p>
          </NoThemeTransition>
        </div>
      </section>

      {/* Classic Animation Hooks */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-westworld-rust">Animation Controls</h3>
        
        <div className="flex items-center gap-4">
          <div ref={pulseRef as React.RefObject<HTMLDivElement>} className="w-20 h-20 bg-westworld-gold rounded"></div>
          <div className="space-x-2">
            <button 
              onClick={play}
              className="px-4 py-2 bg-westworld-gold text-westworld-nearBlack rounded hover:bg-westworld-darkGold transition-colors"
              disabled={isPlaying}
            >
              Play
            </button>
            <button 
              onClick={pause}
              className="px-4 py-2 bg-westworld-copper text-white rounded hover:bg-westworld-darkCopper transition-colors"
              disabled={!isPlaying}
            >
              Pause
            </button>
            <button 
              onClick={restart}
              className="px-4 py-2 bg-westworld-rust text-white rounded hover:bg-westworld-darkRust transition-colors"
            >
              Restart
            </button>
          </div>
        </div>
      </section>

      {/* New Westworld Animations */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-westworld-rust">Westworld-Themed Animations</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div 
              ref={typewriter.ref as React.RefObject<HTMLDivElement>} 
              className="p-4 bg-westworld-nearBlack text-westworld-gold rounded font-mono overflow-hidden whitespace-nowrap border-r-4 border-westworld-gold"
            >
              ANALYSIS: These violent delights...
            </div>
            <button 
              onClick={typewriter.restart} 
              className="px-4 py-2 bg-westworld-gold text-westworld-nearBlack rounded hover:bg-westworld-darkGold transition-colors"
            >
              Play Typewriter
            </button>
          </div>

          <div className="space-y-2">
            <div 
              ref={glitch.ref as React.RefObject<HTMLDivElement>} 
              className="p-4 bg-westworld-nearBlack text-westworld-cream rounded"
            >
              SYSTEM MALFUNCTION
            </div>
            <button 
              onClick={glitch.restart} 
              className="px-4 py-2 bg-westworld-rust text-white rounded hover:bg-westworld-darkRust transition-colors"
            >
              Trigger Glitch
            </button>
          </div>

          <div className="space-y-2">
            <svg 
              className="w-full h-20 bg-westworld-nearBlack rounded p-2" 
              viewBox="0 0 200 50"
            >
              <path 
                d="M10,25 L50,25 L50,10 L100,10 L100,25 L150,25 L150,40 L190,40" 
                stroke="#d4af37" 
                strokeWidth="2" 
                fill="none"
                strokeDasharray="1000"
              />
              <circle cx="50" cy="25" r="3" fill="#d4af37" />
              <circle cx="100" cy="25" r="3" fill="#d4af37" />
              <circle cx="150" cy="25" r="3" fill="#d4af37" />
            </svg>
            <button 
              onClick={circuit.restart} 
              className="px-4 py-2 bg-westworld-copper text-white rounded hover:bg-westworld-darkCopper transition-colors"
            >
              Activate Circuit
            </button>
          </div>

          <div className="space-y-2">
            <div 
              ref={morphing.ref as React.RefObject<HTMLDivElement>} 
              className="w-32 h-32 mx-auto bg-gradient-to-br from-westworld-gold to-westworld-copper flex items-center justify-center text-white font-bold"
            >
              MORPH
            </div>
          </div>
        </div>
      </section>

      {/* Animation Triggers */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-westworld-rust">Interactive Animations</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AnimatedComponent 
            animation="fadeIn" 
            trigger="mount"
            className="p-4 bg-westworld-beige rounded border border-westworld-gold/30"
          >
            <p>Fade in on mount</p>
          </AnimatedComponent>

          <AnimatedComponent 
            animation="float" 
            trigger="hover"
            className="p-4 bg-westworld-beige rounded border border-westworld-gold/30 cursor-pointer"
          >
            <p>Float on hover</p>
          </AnimatedComponent>

          <AnimatedComponent 
            animation="ripple" 
            trigger="click"
            className="p-4 bg-westworld-beige rounded border border-westworld-gold/30 cursor-pointer"
          >
            <p>Ripple on click</p>
          </AnimatedComponent>
        </div>

        <AnimatedComponent 
          animation={selectedAnimation as any} 
          trigger="manual" 
          className="p-4 bg-westworld-cream rounded border border-westworld-gold/30"
        >
          Manual Control: {selectedAnimation}
        </AnimatedComponent>

        <select 
          value={selectedAnimation} 
          onChange={(e) => setSelectedAnimation(e.target.value)}
          className="px-4 py-2 border border-westworld-gold/30 rounded bg-westworld-cream text-westworld-darkBrown"
        >
          <option value="fadeIn">Fade In</option>
          <option value="slideUp">Slide Up</option>
          <option value="shimmer">Shimmer</option>
          <option value="pulse">Pulse</option>
          <option value="glow">Glow</option>
          <option value="typewriter">Typewriter</option>
          <option value="glitch">Glitch</option>
          <option value="circuit">Circuit</option>
          <option value="float">Float</option>
          <option value="ripple">Ripple</option>
          <option value="shake">Shake</option>
          <option value="morphing">Morphing</option>
        </select>
      </section>

      {/* Animation Chain */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-westworld-rust">Animation Chains</h3>
        
        <div 
          id="chain-target"
          className="p-8 bg-westworld-beige rounded border border-westworld-gold/30 text-center"
        >
          Chain Animation Target
        </div>
        <button 
          onClick={playChainAnimation}
          className="px-4 py-2 bg-westworld-gold text-westworld-nearBlack rounded hover:bg-westworld-darkGold transition-colors"
        >
          Play Chain (Fade → Shake → Glitch)
        </button>
      </section>

      {/* Scroll-triggered Animation */}
      <section className="space-y-4 mt-16">
        <h3 className="text-xl font-semibold text-westworld-rust">Scroll-Triggered Animation</h3>
        <p className="text-westworld-darkBrown">Scroll down to trigger</p>
        
        <div 
          ref={scrollFadeIn.ref as React.RefObject<HTMLDivElement>} 
          className="p-8 bg-westworld-beige rounded border border-westworld-gold/30 opacity-0 mt-32"
        >
          This element fades in when scrolled into view
        </div>
      </section>

      {/* Parallax Section */}
      <section className="relative h-64 overflow-hidden rounded-lg bg-westworld-nearBlack mt-16">
        <div 
          ref={parallax.ref as React.RefObject<HTMLDivElement>}
          style={{
            backgroundImage: 'linear-gradient(45deg, #d4af37 25%, transparent 25%)',
            backgroundSize: '20px 20px',
            ...parallax.style
          }}
          className="absolute inset-0 opacity-20"
        />
        <div className="relative z-10 flex items-center justify-center h-full">
          <h3 className="text-2xl font-bold text-westworld-gold">Parallax Background</h3>
        </div>
      </section>

      {/* Animation Sequence */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-westworld-rust">Staggered Sequence</h3>
        
        <AnimationSequence 
          animation="slideUp" 
          stagger={150}
          animationOptions={{ duration: '0.5s' }}
        >
          <div className="p-4 bg-westworld-beige rounded border border-westworld-gold/30">Analysis Module 1</div>
          <div className="p-4 bg-westworld-beige rounded border border-westworld-gold/30">Analysis Module 2</div>
          <div className="p-4 bg-westworld-beige rounded border border-westworld-gold/30">Analysis Module 3</div>
          <div className="p-4 bg-westworld-beige rounded border border-westworld-gold/30">Analysis Module 4</div>
        </AnimationSequence>
      </section>

      {/* Custom Property Transitions */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-westworld-rust">Granular Transitions</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="theme-transition-color p-4 bg-westworld-beige rounded border border-westworld-gold/30">
            <p className="text-sm">Color only</p>
          </div>
          <div className="theme-transition-background p-4 bg-westworld-beige rounded border border-westworld-gold/30">
            <p className="text-sm">Background only</p>
          </div>
          <div className="theme-transition-border p-4 border-2 border-westworld-gold rounded">
            <p className="text-sm">Border only</p>
          </div>
          <div className="theme-transition-shadow p-4 bg-westworld-beige rounded shadow-lg">
            <p className="text-sm">Shadow only</p>
          </div>
        </div>
      </section>
    </div>
  );
};