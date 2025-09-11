/**
 * Lazy Loading Components
 * Performance-optimized components with intersection observer and code splitting
 */

import React from 'react';
import { LoadingSkeleton } from './ui/animations';
import { cn } from '../utils/cn';

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLDivElement>, boolean] => {
  const elementRef = React.useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [elementRef, isIntersecting];
};

// Lazy Image Component
interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  placeholder,
  blurDataURL,
  onLoad,
  onError
}) => {
  const [imageRef, isVisible] = useIntersectionObserver();
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  const handleLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setImageError(true);
    onError?.();
  };

  return (
    <div ref={imageRef} className={cn('relative overflow-hidden', className)}>
      {/* Placeholder while loading */}
      {!imageLoaded && !imageError && (
        <div
          className={cn(
            'absolute inset-0 bg-gray-200 dark:bg-gray-700',
            blurDataURL && 'bg-cover bg-center'
          )}
          style={blurDataURL ? { backgroundImage: `url(${blurDataURL})` } : undefined}
        >
          {placeholder && (
            <div className="flex items-center justify-center h-full text-gray-500">
              {placeholder}
            </div>
          )}
        </div>
      )}

      {/* Actual image */}
      {isVisible && (
        <img
          src={src}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}

      {/* Error state */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <span className="text-gray-500">Failed to load image</span>
        </div>
      )}
    </div>
  );
};

// Lazy Video Component
interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
}

export const LazyVideo: React.FC<LazyVideoProps> = ({
  src,
  poster,
  className,
  autoPlay = false,
  loop = false,
  muted = true,
  controls = true
}) => {
  const [videoRef, isVisible] = useIntersectionObserver();
  const [isLoaded, setIsLoaded] = React.useState(false);

  return (
    <div ref={videoRef} className={cn('relative', className)}>
      {isVisible ? (
        <video
          className={cn(
            'w-full h-auto transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          poster={poster}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          controls={controls}
          onLoadedData={() => setIsLoaded(true)}
        >
          <source src={src} />
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <span className="text-gray-500">Video will load when visible</span>
        </div>
      )}
    </div>
  );
};

// Lazy Component Wrapper for Code Splitting
interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  delay?: number;
}

export const LazyComponent: React.FC<LazyComponentProps> = ({
  children,
  fallback = <LoadingSkeleton />,
  className,
  delay = 0
}) => {
  const [componentRef, isVisible] = useIntersectionObserver();
  const [shouldRender, setShouldRender] = React.useState(false);

  React.useEffect(() => {
    if (isVisible) {
      if (delay > 0) {
        const timer = setTimeout(() => {
          setShouldRender(true);
        }, delay);
        return () => clearTimeout(timer);
      } else {
        setShouldRender(true);
      }
    }
  }, [isVisible, delay]);

  return (
    <div ref={componentRef} className={className}>
      <React.Suspense fallback={fallback}>
        {shouldRender ? children : fallback}
      </React.Suspense>
    </div>
  );
};

// Virtual List for Large Datasets
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 3
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const scrollElementRef = React.useRef<HTMLDivElement>(null);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={scrollElementRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      data-testid="virtual-list"
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => {
          const actualIndex = startIndex + index;
          return (
            <div
              key={actualIndex}
              style={{
                position: 'absolute',
                top: actualIndex * itemHeight,
                height: itemHeight,
                width: '100%'
              }}
              data-testid={`list-item-${actualIndex}`}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Infinite Scroll Component
interface InfiniteScrollProps {
  children: React.ReactNode;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  loading?: boolean;
  threshold?: number;
  className?: string;
}

export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  children,
  hasMore,
  loadMore,
  loading = false,
  threshold = 0.8,
  className
}) => {
  const [loadingRef, isLoadingVisible] = useIntersectionObserver({
    threshold,
    rootMargin: '100px'
  });

  React.useEffect(() => {
    if (isLoadingVisible && hasMore && !loading) {
      loadMore();
    }
  }, [isLoadingVisible, hasMore, loading, loadMore]);

  return (
    <div className={className}>
      {children}
      {hasMore && (
        <div ref={loadingRef} className="py-4 text-center">
          {loading ? (
            <LoadingSkeleton lines={3} />
          ) : (
            <span className="text-gray-500">Load more...</span>
          )}
        </div>
      )}
    </div>
  );
};

// Progressive Image Enhancement
interface ProgressiveImageProps {
  lowQualitySrc: string;
  highQualitySrc: string;
  alt: string;
  className?: string;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  lowQualitySrc,
  highQualitySrc,
  alt,
  className
}) => {
  const [imageRef, isVisible] = useIntersectionObserver();
  const [highQualityLoaded, setHighQualityLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!isVisible) return;

    const img = new Image();
    img.onload = () => setHighQualityLoaded(true);
    img.src = highQualitySrc;
  }, [isVisible, highQualitySrc]);

  return (
    <div ref={imageRef} className={cn('relative', className)}>
      {/* Low quality image (always loaded first) */}
      <img
        src={lowQualitySrc}
        alt={alt}
        className={cn(
          'w-full h-auto transition-opacity duration-500',
          highQualityLoaded ? 'opacity-0' : 'opacity-100'
        )}
        style={{ filter: 'blur(2px)' }}
      />

      {/* High quality image */}
      {isVisible && (
        <img
          src={highQualitySrc}
          alt={alt}
          className={cn(
            'absolute inset-0 w-full h-auto transition-opacity duration-500',
            highQualityLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  );
};

// Lazy Route Component
interface LazyRouteProps {
  component: React.ComponentType;
  fallback?: React.ReactNode;
  preload?: boolean;
}

export const LazyRoute: React.FC<LazyRouteProps> = ({
  component: Component,
  fallback = <LoadingSkeleton lines={5} />,
  preload = false
}) => {
  const [isPreloaded, setIsPreloaded] = React.useState(preload);

  React.useEffect(() => {
    if (preload && !isPreloaded) {
      // Preload the component
      const timer = setTimeout(() => {
        setIsPreloaded(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [preload, isPreloaded]);

  if (!isPreloaded && !preload) {
    return <>{fallback}</>;
  }

  return (
    <React.Suspense fallback={fallback}>
      <Component />
    </React.Suspense>
  );
};

// Lazy Content Based on Media Queries
interface ResponsiveLazyProps {
  mobile?: React.ComponentType;
  tablet?: React.ComponentType;
  desktop: React.ComponentType;
  fallback?: React.ReactNode;
}

export const ResponsiveLazy: React.FC<ResponsiveLazyProps> = ({
  mobile,
  tablet,
  desktop: Desktop,
  fallback = <LoadingSkeleton />
}) => {
  const [currentComponent, setCurrentComponent] = React.useState<React.ComponentType | null>(null);

  React.useEffect(() => {
    const updateComponent = () => {
      const width = window.innerWidth;
      
      if (width < 768 && mobile) {
        setCurrentComponent(mobile);
      } else if (width < 1024 && tablet) {
        setCurrentComponent(tablet);
      } else {
        setCurrentComponent(Desktop);
      }
    };

    updateComponent();
    window.addEventListener('resize', updateComponent);
    return () => window.removeEventListener('resize', updateComponent);
  }, [mobile, tablet, Desktop]);

  if (!currentComponent) {
    return <>{fallback}</>;
  }

  const Component = currentComponent;
  return (
    <React.Suspense fallback={fallback}>
      <Component />
    </React.Suspense>
  );
};

// Prefetch Component for Performance
interface PrefetchProps {
  href: string;
  as?: 'script' | 'style' | 'image' | 'font';
  crossorigin?: 'anonymous' | 'use-credentials';
}

export const Prefetch: React.FC<PrefetchProps> = ({ href, as, crossorigin }) => {
  React.useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    if (as) link.as = as;
    if (crossorigin) link.crossOrigin = crossorigin;

    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, [href, as, crossorigin]);

  return null;
};

// Preload Component for Critical Resources
export const Preload: React.FC<PrefetchProps> = ({ href, as, crossorigin }) => {
  React.useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    if (as) link.as = as;
    if (crossorigin) link.crossOrigin = crossorigin;

    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, [href, as, crossorigin]);

  return null;
};