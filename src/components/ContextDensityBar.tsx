import React, { useState, useEffect, useMemo } from 'react'
import { HostParadigm, ResearchPhase } from '@/types'
import { useTheme, useParadigmTheme, getParadigmClasses } from '@/theme'
import { ProgressMeter } from '@/components/atoms'
import { useAnimation, useAnimationChain } from '@/hooks/useAnimation'
import { useThemeAnimation, themeAnimationVariants } from '@/theme/animations'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { cn } from '@/utils/cn'

// Icon components to replace emojis
const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const StarIcon = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
)

const BeakerIcon = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
)

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const BoltIcon = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)

const DominantStarIcon = ({ className }: { className?: string }) => (
  <svg className={cn("w-4 h-4", className)} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

interface ContextDensityBarProps {
  densities: {
    narrative: number
    analytical: number
    memory: number
    adaptive: number
  }
  phase?: ResearchPhase | string
  showLabels?: boolean
  paradigm?: HostParadigm
  showHostColors?: boolean
  isLoading?: boolean
}

export const ContextDensityBar: React.FC<ContextDensityBarProps> = ({
  densities,
  phase = 'synthesis',
  showLabels = true,
  paradigm,
  showHostColors = false,
  isLoading = false
}) => {
  const { getCSSVariable } = useTheme();
  const getParadigmTheme = useParadigmTheme();
  const [hoveredContext, setHoveredContext] = useState<string | null>(null);
  const [prevDensities, setPrevDensities] = useState(densities);
  const [isUpdating, setIsUpdating] = useState(false);

  // Get paradigm theme and classes
  const paradigmTheme = paradigm ? getParadigmTheme(paradigm) : null;
  const paradigmClasses = paradigm ? getParadigmClasses(paradigm) : null;

  // Get theme-aware colors using design system
  const themeColors = {
    textSecondary: getCSSVariable('--colors-semantic-text-muted'),
    surface: getCSSVariable('--colors-semantic-surface'),
    border: getCSSVariable('--colors-semantic-border'),
    gold: getCSSVariable('--colors-westworld-gold'),
    copper: getCSSVariable('--colors-westworld-copper'),
    rust: getCSSVariable('--colors-westworld-rust'),
  };

  // Auto-detect dominant context
  const calculatedDominantContext = useMemo(() =>
    Object.entries(densities)
      .sort(([,a], [,b]) => b - a)[0][0],
    [densities]
  );

  // Use paradigm styling if enabled
  const useParadigmStyle = paradigm && showHostColors && paradigmTheme;

  // Phase icon mapping
  const phaseIcons = {
    discovery: SearchIcon,
    exploration: StarIcon,
    synthesis: BeakerIcon,
    validation: CheckIcon
  };

  const PhaseIcon = phaseIcons[phase as keyof typeof phaseIcons] || BoltIcon;

  // Theme-aware animations
  const { getThemeAnimationOptions } = useThemeAnimation();
  
  // Entrance animation with theme
  const entranceAnimation = useAnimation(
    'slideUp',
    getThemeAnimationOptions(themeAnimationVariants.entrance.slideUp, paradigm)
  );

  // Scroll trigger animation
  const scrollAnimation = useScrollAnimation({
    animationName: 'fadeIn',
    threshold: 0.3,
    triggerOnce: true,
    duration: '0.8s'
  });

  // Animation chain for updates
  const { createChain } = useAnimationChain();

  // Detect density changes
  useEffect(() => {
    const hasChanged = Object.entries(densities).some(
      ([key, value]) => prevDensities[key as keyof typeof prevDensities] !== value
    );

    if (hasChanged && !isLoading) {
      setIsUpdating(true);
      setPrevDensities(densities);

      // Trigger update animation with theme awareness
      const updateChain = createChain()
        .add('pulse', getThemeAnimationOptions(themeAnimationVariants.feedback.pulse, paradigm))
        .add('glow', getThemeAnimationOptions(themeAnimationVariants.feedback.glow, paradigm))
        .sequential();

      const element = document.getElementById('context-density-container');
      if (element) {
        updateChain.animations.forEach(anim => anim.element = element);
        updateChain.play();
      }

      setTimeout(() => setIsUpdating(false), 800);
    }
  }, [densities, prevDensities, isLoading, createChain]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={cn("bg-theme-surface rounded-lg border border-theme-border p-4", "animate-pulse")}>
        <div className="flex items-center justify-between mb-2">
          <div className="h-6 w-32 rounded animate-shimmer bg-theme-border/40"></div>
          <div className="h-5 w-24 rounded animate-shimmer bg-theme-border/40"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <div className="h-4 w-20 rounded animate-shimmer bg-theme-border/40"></div>
                <div className="h-4 w-12 rounded animate-shimmer bg-theme-border/40"></div>
              </div>
              <div className="h-2 w-full rounded animate-shimmer bg-theme-border/40"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={(el) => {
        if (el) {
          entranceAnimation.ref.current = el;
          scrollAnimation.ref.current = el;
        }
      }}
      id="context-density-container"
      className={cn(
        "bg-theme-surface rounded-lg border border-theme-border p-4",
        "relative overflow-hidden",
        "transition-all duration-300",
        isUpdating && "ring-2 ring-westworld-gold/50",
        "hover:shadow-lg"
      )}
    >
      {/* Westworld-themed background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0 bg-circuit-pattern"></div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <PhaseIcon className={cn(
              "transition-all duration-300",
              isUpdating && "animate-pulse",
              isUpdating && "text-westworld-gold"
            )} />
            <span className="animate-typewriter">Context Analysis</span>
          </h3>
          <div className="flex items-center gap-2">
            {paradigm && showHostColors && (
              <span className={cn(
                "text-xs px-2 py-1 rounded-full transition-all duration-300",
                paradigmClasses?.badge || 'bg-theme-secondary',
                "hover:scale-105"
              )}>
                {paradigm.charAt(0).toUpperCase() + paradigm.slice(1)} Mode
              </span>
            )}
            <span
              className={cn(
                "text-sm capitalize transition-all duration-300",
                isUpdating && `animate-glow ${paradigm ? `animate-paradigm-${paradigm}` : ''}`
              )}
              style={{ color: themeColors.textSecondary }}
            >
              {phase}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {Object.entries(densities).map(([context, density], index) => {
            const isDominant = context === calculatedDominantContext;
            const isHovered = hoveredContext === context;

            return (
              <div
                key={context}
                className={cn(
                  "group transition-all duration-300",
                  isHovered && "transform scale-[1.02]"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
                onMouseEnter={() => setHoveredContext(context)}
                onMouseLeave={() => setHoveredContext(null)}
              >
                {showLabels && (
                  <div className="flex justify-between text-sm mb-1">
                    <span className={cn(
                      "capitalize flex items-center gap-1 transition-all duration-300",
                      isDominant && `font-semibold animate-glow ${paradigm ? `animate-paradigm-${paradigm}` : ''}`,
                      isHovered && "transform translateX-1",
                      isDominant && !useParadigmStyle && "text-westworld-gold",
                      isDominant && useParadigmStyle && paradigmClasses?.text
                    )}
                    >
                      {context}
                      {isDominant && (
                        <DominantStarIcon className={cn(
                          "inline-block transition-all duration-300",
                          isHovered && "rotate-180",
                          useParadigmStyle && paradigmClasses ? paradigmClasses.text : "text-westworld-gold"
                        )} />
                      )}
                    </span>
                    <span className={cn(
                      "transition-all duration-300",
                      isHovered && "font-semibold",
                      isDominant && "text-westworld-gold"
                    )}>
                      {density}%
                    </span>
                  </div>
                )}
                <div className="relative">
                  <ProgressMeter
                    value={density}
                    variant={useParadigmStyle && isDominant ? 'paradigm' : (isDominant ? 'gradient' : 'default')}
                    paradigm={useParadigmStyle && isDominant ? paradigm : undefined}
                    showPercentage={false}
                    label=""
                    gradientClass={isDominant && !useParadigmStyle ? 'bg-gradient-to-r from-westworld-gold to-westworld-copper' : undefined}
                    colorClass={!isDominant ? 'bg-westworld-copper/70' : undefined}
                  />
                  {/* Hover effect overlay */}
                  {isHovered && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Circuit animation on update */}
      {isUpdating && (
        <div className="absolute inset-0 pointer-events-none">
          <svg className="w-full h-full opacity-20">
            <path
              d="M0,50 L100,50"
              stroke="rgb(var(--colors-westworld-gold) / 1)"
              strokeWidth="2"
              strokeDasharray="5,5"
              className="animate-circuit"
            />
          </svg>
        </div>
      )}
    </div>
  )
}
