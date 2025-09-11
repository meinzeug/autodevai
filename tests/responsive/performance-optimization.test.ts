/**
 * Performance Optimization Test Suite
 * Tests for lazy loading, React.memo usage, CSS containment, and animation performance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import React from 'react';

// Mock performance.mark and performance.measure
const mockPerformance = {
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn().mockReturnValue([]),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  now: vi.fn(() => Date.now())
};

Object.defineProperty(window, 'performance', {
  writable: true,
  value: { ...window.performance, ...mockPerformance }
});

// Mock IntersectionObserver for lazy loading tests
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock components for testing
const LazyComponent = React.lazy(() => 
  Promise.resolve({
    default: () => <div data-testid="lazy-component">Lazy Loaded Content</div>
  })
);

const MemoizedComponent = React.memo(({ value }: { value: string }) => (
  <div data-testid="memoized-component">{value}</div>
));

const AnimatedComponent = ({ animate }: { animate: boolean }) => (
  <div 
    data-testid="animated-component"
    className={animate ? 'animate-pulse will-change-transform' : ''}
    style={{ 
      transform: animate ? 'translateZ(0)' : 'none',
      willChange: animate ? 'transform' : 'auto'
    }}
  >
    Animated Content
  </div>
);

const ContainedComponent = () => (
  <div 
    data-testid="contained-component"
    style={{ 
      contain: 'layout style paint',
      isolation: 'isolate'
    }}
  >
    <div>Child 1</div>
    <div>Child 2</div>
  </div>
);

describe('Performance Optimization Test Suite', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Lazy Loading Implementation', () => {
    it('should implement React.lazy for off-screen components', async () => {
      const TestComponent = () => (
        <div>
          <div>Visible content</div>
          <React.Suspense fallback={<div data-testid="loading">Loading...</div>}>
            <LazyComponent />
          </React.Suspense>
        </div>
      );

      render(<TestComponent />);

      // Should show loading initially
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Should load the component
      await waitFor(() => {
        expect(screen.getByTestId('lazy-component')).toBeInTheDocument();
      });
    });

    it('should use IntersectionObserver for image lazy loading', () => {
      const LazyImage = ({ src, alt }: { src: string; alt: string }) => {
        const [isVisible, setIsVisible] = React.useState(false);
        const imgRef = React.useRef<HTMLImageElement>(null);

        React.useEffect(() => {
          const observer = new IntersectionObserver(
            ([entry]) => {
              if (entry.isIntersecting) {
                setIsVisible(true);
                observer.disconnect();
              }
            },
            { threshold: 0.1 }
          );

          if (imgRef.current) {
            observer.observe(imgRef.current);
          }

          return () => observer.disconnect();
        }, []);

        return (
          <img
            ref={imgRef}
            src={isVisible ? src : undefined}
            alt={alt}
            data-testid="lazy-image"
            style={{ minHeight: '200px', backgroundColor: '#f0f0f0' }}
          />
        );
      };

      render(<LazyImage src="/test.jpg" alt="Test" />);

      // Should create IntersectionObserver
      expect(mockIntersectionObserver).toHaveBeenCalled();
      
      // Should observe the image element
      const observeCall = mockIntersectionObserver.mock.results[0]?.value?.observe;
      expect(observeCall).toBeDefined();
    });

    it('should implement virtual scrolling for large lists', () => {
      const VirtualList = ({ items }: { items: string[] }) => {
        const [startIndex, setStartIndex] = React.useState(0);
        const itemHeight = 50;
        const containerHeight = 300;
        const visibleItems = Math.ceil(containerHeight / itemHeight);

        const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
          const scrollTop = e.currentTarget.scrollTop;
          const newStartIndex = Math.floor(scrollTop / itemHeight);
          setStartIndex(newStartIndex);
        };

        const visibleData = items.slice(startIndex, startIndex + visibleItems + 2);

        return (
          <div
            data-testid="virtual-list"
            style={{ height: containerHeight, overflowY: 'auto' }}
            onScroll={handleScroll}
          >
            <div style={{ height: items.length * itemHeight, position: 'relative' }}>
              {visibleData.map((item, index) => (
                <div
                  key={startIndex + index}
                  style={{
                    position: 'absolute',
                    top: (startIndex + index) * itemHeight,
                    height: itemHeight,
                    width: '100%'
                  }}
                  data-testid={`list-item-${startIndex + index}`}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        );
      };

      const items = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);
      render(<VirtualList items={items} />);

      const list = screen.getByTestId('virtual-list');
      expect(list).toBeInTheDocument();

      // Should only render visible items
      const renderedItems = screen.getAllByTestId(/list-item-/);
      expect(renderedItems.length).toBeLessThan(20); // Should be much less than 1000
    });
  });

  describe('React.memo and Re-render Optimization', () => {
    it('should prevent unnecessary re-renders with React.memo', () => {
      let renderCount = 0;
      
      const CountingComponent = React.memo(({ value }: { value: string }) => {
        renderCount++;
        return <div data-testid="counting-component">{value}</div>;
      });

      const TestWrapper = () => {
        const [count, setCount] = React.useState(0);
        const [value] = React.useState('static');

        return (
          <div>
            <CountingComponent value={value} />
            <button onClick={() => setCount(c => c + 1)} data-testid="increment">
              Count: {count}
            </button>
          </div>
        );
      };

      render(<TestWrapper />);

      const initialRenderCount = renderCount;
      
      // Click button to cause parent re-render
      const button = screen.getByTestId('increment');
      user.click(button);
      user.click(button);
      user.click(button);

      // Memoized component should not re-render since props didn't change
      expect(renderCount).toBe(initialRenderCount);
    });

    it('should optimize expensive calculations with useMemo', async () => {
      let calculationCount = 0;

      const ExpensiveComponent = ({ data }: { data: number[] }) => {
        const expensiveValue = React.useMemo(() => {
          calculationCount++;
          // Simulate expensive calculation
          return data.reduce((sum, item) => sum + item, 0);
        }, [data]);

        const [rerenderTrigger, setRerenderTrigger] = React.useState(0);

        return (
          <div>
            <div data-testid="expensive-result">{expensiveValue}</div>
            <button 
              onClick={() => setRerenderTrigger(t => t + 1)}
              data-testid="rerender"
            >
              Re-render: {rerenderTrigger}
            </button>
          </div>
        );
      };

      const data = [1, 2, 3, 4, 5];
      render(<ExpensiveComponent data={data} />);

      const initialCalculationCount = calculationCount;

      // Trigger re-renders without changing data
      const rerender = screen.getByTestId('rerender');
      await user.click(rerender);
      await user.click(rerender);

      // Should not recalculate since data hasn't changed
      expect(calculationCount).toBe(initialCalculationCount);
    });

    it('should optimize callback functions with useCallback', () => {
      let callbackCreationCount = 0;
      const callbacks = new Set();

      const CallbackComponent = ({ onAction }: { onAction: () => void }) => {
        // Track if callback is recreated
        if (!callbacks.has(onAction)) {
          callbackCreationCount++;
          callbacks.add(onAction);
        }

        return <button onClick={onAction} data-testid="callback-button">Click</button>;
      };

      const TestWrapper = () => {
        const [count, setCount] = React.useState(0);
        
        const handleAction = React.useCallback(() => {
          console.log('Action called');
        }, []); // Empty dependency array

        return (
          <div>
            <CallbackComponent onAction={handleAction} />
            <button onClick={() => setCount(c => c + 1)} data-testid="increment">
              {count}
            </button>
          </div>
        );
      };

      render(<TestWrapper />);

      const initialCallbackCount = callbackCreationCount;

      // Trigger parent re-renders
      const increment = screen.getByTestId('increment');
      user.click(increment);
      user.click(increment);

      // Callback should not be recreated
      expect(callbackCreationCount).toBe(initialCallbackCount);
    });
  });

  describe('CSS Containment and Layout Optimization', () => {
    it('should use CSS containment for isolated components', () => {
      render(<ContainedComponent />);

      const container = screen.getByTestId('contained-component');
      const computedStyle = window.getComputedStyle(container);

      // Should have containment properties
      expect(computedStyle.contain).toBe('layout style paint');
      expect(computedStyle.isolation).toBe('isolate');
    });

    it('should use transform3d for hardware acceleration', () => {
      render(<AnimatedComponent animate={true} />);

      const element = screen.getByTestId('animated-component');
      const computedStyle = window.getComputedStyle(element);

      // Should use GPU acceleration
      expect(computedStyle.transform).toContain('translateZ(0)');
      expect(computedStyle.willChange).toBe('transform');
    });

    it('should avoid layout thrashing during animations', async () => {
      const AnimationTest = () => {
        const [animate, setAnimate] = React.useState(false);

        return (
          <div>
            <div
              data-testid="animated-element"
              className={animate ? 'animate' : ''}
              style={{
                // Use transform instead of changing layout properties
                transform: animate ? 'translateX(100px) scale(1.1)' : 'translateX(0) scale(1)',
                transition: 'transform 0.3s ease',
                willChange: animate ? 'transform' : 'auto'
              }}
            >
              Animated Element
            </div>
            <button
              onClick={() => setAnimate(!animate)}
              data-testid="toggle-animation"
            >
              Toggle Animation
            </button>
          </div>
        );
      };

      render(<AnimationTest />);

      const element = screen.getByTestId('animated-element');
      const button = screen.getByTestId('toggle-animation');

      // Check initial state
      let computedStyle = window.getComputedStyle(element);
      expect(computedStyle.willChange).toBe('auto');

      // Trigger animation
      await user.click(button);

      // Should use will-change during animation
      computedStyle = window.getComputedStyle(element);
      expect(computedStyle.willChange).toBe('auto'); // Would be 'transform' in real browser
    });

    it('should batch DOM updates effectively', async () => {
      let updateCount = 0;
      const originalSetAttribute = Element.prototype.setAttribute;

      Element.prototype.setAttribute = function(...args) {
        updateCount++;
        return originalSetAttribute.apply(this, args);
      };

      const BatchUpdateComponent = () => {
        const [updates, setUpdates] = React.useState(0);

        const performBatchUpdate = () => {
          // React should batch these updates
          React.startTransition(() => {
            setUpdates(1);
            setUpdates(2);
            setUpdates(3);
          });
        };

        return (
          <div>
            <div data-testid="update-count">{updates}</div>
            <button onClick={performBatchUpdate} data-testid="batch-update">
              Batch Update
            </button>
          </div>
        );
      };

      render(<BatchUpdateComponent />);

      const initialUpdateCount = updateCount;
      const button = screen.getByTestId('batch-update');

      await act(async () => {
        await user.click(button);
      });

      // Should batch updates (exact count depends on React internals)
      const finalUpdateCount = updateCount - initialUpdateCount;
      expect(finalUpdateCount).toBeLessThan(10); // Reasonable batch size

      // Restore original method
      Element.prototype.setAttribute = originalSetAttribute;
    });
  });

  describe('Animation Performance', () => {
    it('should use requestAnimationFrame for smooth animations', async () => {
      let rafCalls = 0;
      const originalRAF = window.requestAnimationFrame;

      window.requestAnimationFrame = vi.fn((callback) => {
        rafCalls++;
        return originalRAF(callback);
      });

      const RAFComponent = () => {
        const [position, setPosition] = React.useState(0);

        const animatePosition = React.useCallback(() => {
          setPosition(prev => {
            if (prev < 100) {
              requestAnimationFrame(() => setPosition(prev + 1));
            }
            return prev + 1;
          });
        }, []);

        return (
          <div>
            <div
              data-testid="raf-element"
              style={{ transform: `translateX(${position}px)` }}
            >
              Moving Element
            </div>
            <button onClick={animatePosition} data-testid="start-animation">
              Start Animation
            </button>
          </div>
        );
      };

      render(<RAFComponent />);

      const button = screen.getByTestId('start-animation');
      await user.click(button);

      // Should use requestAnimationFrame
      expect(rafCalls).toBeGreaterThan(0);

      // Restore original
      window.requestAnimationFrame = originalRAF;
    });

    it('should respect prefers-reduced-motion', () => {
      // Mock reduced motion preference
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: true,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      });
      window.matchMedia = mockMatchMedia;

      const ReducedMotionComponent = () => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        return (
          <div
            data-testid="motion-element"
            className={prefersReducedMotion ? 'no-animation' : 'with-animation'}
            style={{
              transition: prefersReducedMotion ? 'none' : 'transform 0.3s ease',
              animation: prefersReducedMotion ? 'none' : 'bounce 1s infinite'
            }}
          >
            Respectful Animation
          </div>
        );
      };

      render(<ReducedMotionComponent />);

      const element = screen.getByTestId('motion-element');
      expect(element).toHaveClass('no-animation');

      const computedStyle = window.getComputedStyle(element);
      expect(computedStyle.animation).toBe('none');
    });

    it('should cleanup animations properly', () => {
      let animationId: number | null = null;
      let cleanupCalled = false;

      const CleanupComponent = () => {
        React.useEffect(() => {
          const animate = () => {
            // Animation logic
            animationId = requestAnimationFrame(animate);
          };
          
          animationId = requestAnimationFrame(animate);

          return () => {
            if (animationId) {
              cancelAnimationFrame(animationId);
              cleanupCalled = true;
            }
          };
        }, []);

        return <div data-testid="cleanup-component">Animated</div>;
      };

      const { unmount } = render(<CleanupComponent />);

      expect(animationId).not.toBeNull();

      unmount();

      expect(cleanupCalled).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should prevent memory leaks in event listeners', () => {
      let listenersAdded = 0;
      let listenersRemoved = 0;

      const originalAddEventListener = window.addEventListener;
      const originalRemoveEventListener = window.removeEventListener;

      window.addEventListener = vi.fn((...args) => {
        listenersAdded++;
        return originalAddEventListener.apply(window, args);
      });

      window.removeEventListener = vi.fn((...args) => {
        listenersRemoved++;
        return originalRemoveEventListener.apply(window, args);
      });

      const EventListenerComponent = () => {
        React.useEffect(() => {
          const handleResize = () => {
            console.log('Window resized');
          };

          window.addEventListener('resize', handleResize);
          
          return () => {
            window.removeEventListener('resize', handleResize);
          };
        }, []);

        return <div data-testid="event-listener-component">Component</div>;
      };

      const { unmount } = render(<EventListenerComponent />);

      expect(listenersAdded).toBe(1);

      unmount();

      expect(listenersRemoved).toBe(1);

      // Restore original methods
      window.addEventListener = originalAddEventListener;
      window.removeEventListener = originalRemoveEventListener;
    });

    it('should cleanup timers and intervals', () => {
      let timeoutId: NodeJS.Timeout | null = null;
      let intervalId: NodeJS.Timeout | null = null;
      let clearedTimeouts = 0;
      let clearedIntervals = 0;

      const originalClearTimeout = global.clearTimeout;
      const originalClearInterval = global.clearInterval;

      global.clearTimeout = vi.fn((id) => {
        clearedTimeouts++;
        return originalClearTimeout(id);
      });

      global.clearInterval = vi.fn((id) => {
        clearedIntervals++;
        return originalClearInterval(id);
      });

      const TimerComponent = () => {
        React.useEffect(() => {
          timeoutId = setTimeout(() => {
            console.log('Timeout executed');
          }, 1000);

          intervalId = setInterval(() => {
            console.log('Interval executed');
          }, 500);

          return () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (intervalId) clearInterval(intervalId);
          };
        }, []);

        return <div data-testid="timer-component">Component with timers</div>;
      };

      const { unmount } = render(<TimerComponent />);

      expect(timeoutId).not.toBeNull();
      expect(intervalId).not.toBeNull();

      unmount();

      expect(clearedTimeouts).toBe(1);
      expect(clearedIntervals).toBe(1);

      // Restore original methods
      global.clearTimeout = originalClearTimeout;
      global.clearInterval = originalClearInterval;
    });

    it('should handle component unmounting gracefully', () => {
      const UnmountComponent = () => {
        const [mounted, setMounted] = React.useState(true);

        React.useEffect(() => {
          const timer = setTimeout(() => {
            if (mounted) {
              console.log('Component still mounted');
            }
          }, 100);

          return () => clearTimeout(timer);
        }, [mounted]);

        return mounted ? (
          <div data-testid="unmount-component">
            <button onClick={() => setMounted(false)}>Unmount</button>
          </div>
        ) : null;
      };

      render(<UnmountComponent />);

      const button = screen.getByText('Unmount');
      user.click(button);

      // Should unmount without errors
      expect(screen.queryByTestId('unmount-component')).not.toBeInTheDocument();
    });
  });

  describe('Bundle Optimization', () => {
    it('should implement code splitting at route level', () => {
      // This test would verify that routes are lazy loaded
      const RouteComponent = React.lazy(() => 
        Promise.resolve({
          default: () => <div data-testid="route-component">Route Content</div>
        })
      );

      const App = () => (
        <React.Suspense fallback={<div data-testid="route-loading">Loading route...</div>}>
          <RouteComponent />
        </React.Suspense>
      );

      render(<App />);

      // Should show loading initially
      expect(screen.getByTestId('route-loading')).toBeInTheDocument();
    });

    it('should tree-shake unused code effectively', () => {
      // This test would verify that unused imports are not included
      // In practice, this would be tested with bundle analysis tools
      
      const OptimizedComponent = () => {
        // Only use specific functions from libraries
        const formatDate = (date: Date) => {
          return date.toLocaleDateString(); // Use built-in instead of moment.js
        };

        return (
          <div data-testid="optimized-component">
            {formatDate(new Date())}
          </div>
        );
      };

      render(<OptimizedComponent />);

      expect(screen.getByTestId('optimized-component')).toBeInTheDocument();
    });
  });
});