/**
 * Animation Components and Utilities
 * Smooth transitions with reduced motion support and performance optimization
 */

import React from 'react';
import { cn } from '../../utils/cn';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';

// Animation duration constants
export const ANIMATION_DURATIONS = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

// Easing functions
export const EASING = {
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// Base transition classes
const baseTransitionClasses = {
  colors: 'transition-colors duration-200 ease-out',
  transform: 'transition-transform duration-300 ease-out',
  opacity: 'transition-opacity duration-200 ease-out',
  all: 'transition-all duration-300 ease-out',
  size: 'transition-[width,height] duration-300 ease-out',
};

interface AnimationProps {
  children: React.ReactNode;
  className?: string | undefined;
  delay?: number;
  duration?: keyof typeof ANIMATION_DURATIONS;
  easing?: keyof typeof EASING;
}

// Fade animations
export const FadeIn: React.FC<
  AnimationProps & { direction?: 'up' | 'down' | 'left' | 'right' }
> = ({ children, className, direction, delay = 0, duration = 'normal' }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const getTransformClasses = (): string => {
    if (prefersReducedMotion) return '';

    const baseTransform = isVisible ? 'translate-x-0 translate-y-0 opacity-100' : 'opacity-0';

    switch (direction) {
      case 'up':
        return isVisible ? baseTransform : 'translate-y-4 opacity-0';
      case 'down':
        return isVisible ? baseTransform : '-translate-y-4 opacity-0';
      case 'left':
        return isVisible ? baseTransform : 'translate-x-4 opacity-0';
      case 'right':
        return isVisible ? baseTransform : '-translate-x-4 opacity-0';
      default:
        return baseTransform;
    }
  };

  return (
    <div
      className={cn(
        'transition-all',
        `duration-${ANIMATION_DURATIONS[duration]}`,
        getTransformClasses(),
        prefersReducedMotion && 'motion-reduce:transition-none',
        className
      )}
      style={{
        willChange: isVisible && !prefersReducedMotion ? 'transform, opacity' : 'auto',
      }}
    >
      {children}
    </div>
  );
};

// Scale animations
export const ScaleIn: React.FC<AnimationProps> = ({
  children,
  className,
  delay = 0,
  duration = 'normal',
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        'transition-transform',
        `duration-${ANIMATION_DURATIONS[duration]}`,
        isVisible && !prefersReducedMotion ? 'scale-100' : 'scale-95',
        prefersReducedMotion ? 'motion-reduce:scale-100' : '',
        className
      )}
      style={{
        willChange: isVisible && !prefersReducedMotion ? 'transform' : 'auto',
      }}
    >
      {children}
    </div>
  );
};

// Slide animations
export const SlideIn: React.FC<
  AnimationProps & { direction: 'up' | 'down' | 'left' | 'right' }
> = ({ children, className, direction, delay = 0, duration = 'normal' }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const getTransformClasses = (): string => {
    if (prefersReducedMotion) return 'transform-none';

    const baseTransform = 'translate-x-0 translate-y-0';

    if (!isVisible) {
      switch (direction) {
        case 'up':
          return 'translate-y-full';
        case 'down':
          return '-translate-y-full';
        case 'left':
          return 'translate-x-full';
        case 'right':
          return '-translate-x-full';
        default:
          return baseTransform;
      }
    }

    return baseTransform;
  };

  return (
    <div
      className={cn(
        'transition-transform overflow-hidden',
        `duration-${ANIMATION_DURATIONS[duration]}`,
        getTransformClasses(),
        className
      )}
      style={{
        willChange: !prefersReducedMotion ? 'transform' : 'auto',
      }}
    >
      {children}
    </div>
  );
};

// Stagger animations for lists
export const StaggeredList: React.FC<{
  children: React.ReactNode[];
  className?: string;
  staggerDelay?: number;
  itemClassName?: string;
}> = ({ children, className, staggerDelay = 50, itemClassName }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <FadeIn
          key={index}
          direction="up"
          delay={prefersReducedMotion ? 0 : index * staggerDelay}
          className={itemClassName ?? undefined}
        >
          {child}
        </FadeIn>
      ))}
    </div>
  );
};

// Loading skeleton with shimmer effect
export const LoadingSkeleton: React.FC<{
  className?: string;
  lines?: number;
  avatar?: boolean;
}> = ({ className, lines = 3, avatar = false }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const shimmerClasses = prefersReducedMotion
    ? 'bg-gray-200 dark:bg-gray-700'
    : 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-shimmer';

  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading">
      {avatar && <div className={cn('h-12 w-12 rounded-full', shimmerClasses)} />}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn('h-4 rounded', i === lines - 1 ? 'w-3/4' : 'w-full', shimmerClasses)}
        />
      ))}
      <span className="sr-only">Loading content...</span>
    </div>
  );
};

// Pulse animation for notifications
export const PulseIndicator: React.FC<{
  children: React.ReactNode;
  className?: string;
  color?: 'red' | 'yellow' | 'green' | 'blue';
}> = ({ children, className, color = 'blue' }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const colorClasses = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
  };

  return (
    <div className={cn('relative inline-flex', className)}>
      {children}
      {!prefersReducedMotion && (
        <span className={cn('absolute -top-1 -right-1 h-3 w-3 rounded-full', colorClasses[color])}>
          <span
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              colorClasses[color]
            )}
          />
        </span>
      )}
    </div>
  );
};

// Hover animations
export const HoverLift: React.FC<{
  children: React.ReactNode;
  className?: string;
  intensity?: 'subtle' | 'medium' | 'strong';
}> = ({ children, className, intensity = 'medium' }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const intensityClasses = {
    subtle: 'hover:scale-[1.02] hover:shadow-md',
    medium: 'hover:scale-105 hover:shadow-lg',
    strong: 'hover:scale-110 hover:shadow-xl',
  };

  return (
    <div
      className={cn(
        baseTransitionClasses.transform,
        !prefersReducedMotion && intensityClasses[intensity],
        'motion-reduce:transform-none motion-reduce:hover:shadow-none',
        className
      )}
      style={{
        willChange: !prefersReducedMotion ? 'transform' : 'auto',
      }}
    >
      {children}
    </div>
  );
};

// Spring animations for buttons
export const SpringButton: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ children, className, onClick, disabled = false }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <button
      className={cn(
        baseTransitionClasses.transform,
        !prefersReducedMotion && 'hover:scale-105 active:scale-95',
        'motion-reduce:transform-none',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={onClick}
      disabled={disabled}
      style={{
        willChange: !prefersReducedMotion && !disabled ? 'transform' : 'auto',
      }}
    >
      {children}
    </button>
  );
};

// Page transition wrapper
export const PageTransition: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <FadeIn direction="up" duration="normal" className={className ?? undefined}>
      {children}
    </FadeIn>
  );
};

// Intersection observer animation trigger
export const AnimateOnScroll: React.FC<{
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
}> = ({ children, className, threshold = 0.1, rootMargin = '0px' }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isVisible, setIsVisible] = React.useState(false);
  const elementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div
      ref={elementRef}
      className={cn(
        'transition-all duration-700 ease-out',
        isVisible && !prefersReducedMotion
          ? 'opacity-100 translate-y-0'
          : prefersReducedMotion
            ? 'opacity-100'
            : 'opacity-0 translate-y-8',
        className
      )}
      style={{
        willChange: isVisible && !prefersReducedMotion ? 'transform, opacity' : 'auto',
      }}
    >
      {children}
    </div>
  );
};

// Export transition utilities
export const transitionClasses = baseTransitionClasses;

// CSS-in-JS styles for complex animations
export const animationStyles = {
  shimmer: `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .animate-shimmer {
      animation: shimmer 1.5s infinite;
    }
  `,

  fadeInUp: `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translate3d(0, 40px, 0);
      }
      to {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.6s ease-out;
    }
  `,

  slideInRight: `
    @keyframes slideInRight {
      from {
        transform: translate3d(100%, 0, 0);
        opacity: 0;
      }
      to {
        transform: translate3d(0, 0, 0);
        opacity: 1;
      }
    }
    .animate-slide-in-right {
      animation: slideInRight 0.5s ease-out;
    }
  `,
};

// Hook for managing animation state
export const useAnimation = (
  triggerCondition: boolean,
  options: {
    delay?: number;
    duration?: number;
    onComplete?: () => void;
  } = {}
) => {
  const { delay = 0, duration = 300, onComplete } = options;
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);

  React.useEffect(() => {
    if (triggerCondition) {
      const startTimer = setTimeout(() => {
        setIsAnimating(true);

        const completeTimer = setTimeout(() => {
          setIsAnimating(false);
          setIsComplete(true);
          onComplete?.();
        }, duration);

        return () => clearTimeout(completeTimer);
      }, delay);

      return () => clearTimeout(startTimer);
    }
    return undefined;
  }, [triggerCondition, delay, duration, onComplete]);

  return { isAnimating, isComplete };
};
