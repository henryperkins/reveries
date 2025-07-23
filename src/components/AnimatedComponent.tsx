import React, { ReactNode } from 'react';
import { useAnimation, AnimationName, AnimationOptions } from '../hooks/useAnimation';

interface AnimatedComponentProps extends AnimationOptions {
  children: ReactNode;
  animation: AnimationName;
  className?: string;
  as?: React.ElementType;
  trigger?: 'mount' | 'hover' | 'click' | 'manual';
}

export const AnimatedComponent: React.FC<AnimatedComponentProps> = ({
  children,
  animation,
  className = '',
  as: Component = 'div',
  trigger = 'mount',
  ...animationOptions
}) => {
  const { ref, play, restart, isPlaying } = useAnimation(animation, {
    ...animationOptions,
    playState: trigger === 'manual' ? 'paused' : 'running'
  });

  const handleInteraction = () => {
    if (trigger === 'click') {
      restart();
    }
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      play();
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover' && animationOptions.iterationCount !== 'infinite') {
      restart();
    }
  };

  return React.createElement(
    Component,
    {
      ref,
      className: `${className} ${isPlaying ? 'animating' : ''}`,
      onClick: trigger === 'click' ? handleInteraction : undefined,
      onMouseEnter: trigger === 'hover' ? handleMouseEnter : undefined,
      onMouseLeave: trigger === 'hover' ? handleMouseLeave : undefined,
    },
    children
  );
};

interface AnimationSequenceProps {
  children: ReactNode[];
  stagger?: number;
  animation: AnimationName;
  animationOptions?: AnimationOptions;
}

export const AnimationSequence: React.FC<AnimationSequenceProps> = ({
  children,
  stagger = 100,
  animation,
  animationOptions = {}
}) => {
  return (
    <>
      {React.Children.map(children, (child, index) => (
        <AnimatedComponent
          key={index}
          animation={animation}
          {...animationOptions}
          delay={`${((typeof animationOptions.delay === 'number' ? animationOptions.delay : parseInt(animationOptions.delay || '0')) || 0) + (index * stagger)}ms`}
        >
          {child}
        </AnimatedComponent>
      ))}
    </>
  );
};