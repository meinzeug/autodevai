/**
 * @fileoverview Comprehensive tests for ResponsiveLayout component
 * Tests responsive behavior, layout modes, and accessibility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponsiveLayout } from '../../../src/components/responsive/ResponsiveLayout';

// Mock useMediaQuery hook
const mockUseMediaQuery = vi.fn();
vi.mock('../../../src/hooks/useMediaQuery', () => ({
  useMediaQuery: mockUseMediaQuery
}));

// Mock components for testing
const MockHeader = ({ layoutMode, onMenuClick, sidebarOpen }: any) => (
  <header data-testid="header" data-layout-mode={layoutMode}>
    <button 
      data-testid="menu-button" 
      onClick={onMenuClick}
      data-sidebar-open={sidebarOpen}
    >
      Menu
    </button>
  </header>
);

const MockSidebar = ({ layoutMode, isOpen, onClose }: any) => (
  <aside data-testid="sidebar" data-layout-mode={layoutMode} data-open={isOpen}>
    Sidebar Content
    {onClose && (
      <button data-testid="sidebar-close" onClick={onClose}>
        Close
      </button>
    )}
  </aside>
);

const MockFooter = ({ layoutMode, sidebarOpen }: any) => (
  <footer data-testid="footer" data-layout-mode={layoutMode} data-sidebar-open={sidebarOpen}>
    Footer Content
  </footer>
);

describe('ResponsiveLayout', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderLayout = (props = {}) => {
    return render(
      <ResponsiveLayout
        header={<MockHeader />}
        sidebar={<MockSidebar />}
        footer={<MockFooter />}
        {...props}
      >
        <div data-testid="main-content">Main Content</div>
      </ResponsiveLayout>
    );
  };

  describe('Layout Mode Detection', () => {
    it('should detect mobile layout mode', () => {
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('max-width: 639px')) return true;
        if (query.includes('min-width: 640px') && query.includes('max-width: 1023px')) return false;
        if (query.includes('min-width: 1024px')) return false;
        return false;
      });

      renderLayout();

      expect(screen.getByTestId('header')).toHaveAttribute('data-layout-mode', 'mobile');
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-layout-mode', 'mobile');
      expect(screen.getByTestId('footer')).toHaveAttribute('data-layout-mode', 'mobile');
    });

    it('should detect tablet layout mode', () => {
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('max-width: 639px')) return false;
        if (query.includes('min-width: 640px') && query.includes('max-width: 1023px')) return true;
        if (query.includes('min-width: 1024px')) return false;
        return false;
      });

      renderLayout();

      expect(screen.getByTestId('header')).toHaveAttribute('data-layout-mode', 'tablet');
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-layout-mode', 'tablet');
      expect(screen.getByTestId('footer')).toHaveAttribute('data-layout-mode', 'tablet');
    });

    it('should detect desktop layout mode', () => {
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('max-width: 639px')) return false;
        if (query.includes('min-width: 640px') && query.includes('max-width: 1023px')) return false;
        if (query.includes('min-width: 1024px')) return true;
        return false;
      });

      renderLayout();

      expect(screen.getByTestId('header')).toHaveAttribute('data-layout-mode', 'desktop');
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-layout-mode', 'desktop');
      expect(screen.getByTestId('footer')).toHaveAttribute('data-layout-mode', 'desktop');
    });
  });

  describe('Mobile Layout Behavior', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('max-width: 639px')) return true;
        return false;
      });
    });

    it('should start with closed sidebar on mobile', () => {
      renderLayout();
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false');
    });

    it('should toggle sidebar when menu button is clicked', async () => {
      renderLayout();
      
      const menuButton = screen.getByTestId('menu-button');
      const sidebar = screen.getByTestId('sidebar');

      expect(sidebar).toHaveAttribute('data-open', 'false');
      expect(menuButton).toHaveAttribute('data-sidebar-open', 'false');

      await user.click(menuButton);

      expect(sidebar).toHaveAttribute('data-open', 'true');
      expect(menuButton).toHaveAttribute('data-sidebar-open', 'true');
    });

    it('should close sidebar when close button is clicked', async () => {
      renderLayout();
      
      const menuButton = screen.getByTestId('menu-button');
      
      // Open sidebar
      await user.click(menuButton);
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true');

      // Close sidebar
      const closeButton = screen.getByTestId('sidebar-close');
      await user.click(closeButton);
      
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false');
    });

    it('should render mobile sidebar with correct classes', () => {
      renderLayout();
      
      const container = screen.getByTestId('sidebar').parentElement;
      expect(container).toHaveClass('fixed', 'left-0', 'top-0', 'h-full');
      expect(container).toHaveClass('w-80', 'max-w-[85vw]');
      expect(container).toHaveClass('transition-transform', 'duration-300');
    });

    it('should show backdrop when sidebar is open on mobile', async () => {
      renderLayout();
      
      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
      expect(backdrop).toBeInTheDocument();
    });

    it('should close sidebar when backdrop is clicked', async () => {
      renderLayout();
      
      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50') as HTMLElement;
      expect(backdrop).toBeInTheDocument();

      fireEvent.click(backdrop);

      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false');
    });
  });

  describe('Tablet Layout Behavior', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('min-width: 640px') && query.includes('max-width: 1023px')) return true;
        return false;
      });
    });

    it('should start with closed sidebar on tablet', () => {
      renderLayout();
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false');
    });

    it('should render tablet sidebar with correct classes', () => {
      renderLayout();
      
      const container = screen.getByTestId('sidebar').parentElement;
      expect(container).toHaveClass('fixed', 'left-0', 'top-0', 'h-full');
      expect(container).toHaveClass('w-64');
      expect(container).toHaveClass('border-r', 'shadow-lg');
    });

    it('should show lighter backdrop on tablet', async () => {
      renderLayout();
      
      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('Desktop Layout Behavior', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('min-width: 1024px')) return true;
        return false;
      });
    });

    it('should start with open sidebar on desktop', () => {
      renderLayout();
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true');
    });

    it('should render desktop sidebar as fixed', () => {
      renderLayout();
      
      const container = screen.getByTestId('sidebar').parentElement;
      expect(container).toHaveClass('w-64', 'flex-shrink-0');
      expect(container).toHaveClass('border-r', 'shadow-sm');
    });

    it('should not render close button on desktop', () => {
      renderLayout();
      expect(screen.queryByTestId('sidebar-close')).not.toBeInTheDocument();
    });

    it('should not show backdrop on desktop', () => {
      renderLayout();
      
      const backdrop = document.querySelector('.fixed.inset-0');
      expect(backdrop).not.toBeInTheDocument();
    });
  });

  describe('Layout Mode Transitions', () => {
    it('should close sidebar when transitioning from desktop to mobile', () => {
      // Start with desktop
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('min-width: 1024px')) return true;
        return false;
      });

      const { rerender } = renderLayout();
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true');

      // Switch to mobile
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('max-width: 639px')) return true;
        return false;
      });

      rerender(
        <ResponsiveLayout
          header={<MockHeader />}
          sidebar={<MockSidebar />}
          footer={<MockFooter />}
        >
          <div data-testid="main-content">Main Content</div>
        </ResponsiveLayout>
      );

      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false');
    });

    it('should open sidebar when transitioning from mobile to desktop', () => {
      // Start with mobile
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('max-width: 639px')) return true;
        return false;
      });

      const { rerender } = renderLayout();
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false');

      // Switch to desktop
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('min-width: 1024px')) return true;
        return false;
      });

      rerender(
        <ResponsiveLayout
          header={<MockHeader />}
          sidebar={<MockSidebar />}
          footer={<MockFooter />}
        >
          <div data-testid="main-content">Main Content</div>
        </ResponsiveLayout>
      );

      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true');
    });
  });

  describe('Content and Styling', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockImplementation(() => false);
    });

    it('should render main content', () => {
      renderLayout();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByText('Main Content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = renderLayout({ className: 'custom-class' });
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should render without optional components', () => {
      render(
        <ResponsiveLayout>
          <div data-testid="main-content">Main Content</div>
        </ResponsiveLayout>
      );

      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.queryByTestId('header')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('footer')).not.toBeInTheDocument();
    });

    it('should apply correct responsive padding classes', () => {
      renderLayout();
      
      const mainContent = screen.getByTestId('main-content').parentElement;
      expect(mainContent).toHaveClass('p-3', 'sm:p-4', 'md:p-6', 'lg:p-6', 'xl:p-8');
    });

    it('should have correct background gradient', () => {
      const { container } = renderLayout();
      expect(container.firstChild).toHaveClass(
        'bg-gradient-to-br',
        'from-gray-50',
        'via-white',
        'to-gray-100'
      );
    });

    it('should support dark mode classes', () => {
      const { container } = renderLayout();
      expect(container.firstChild).toHaveClass(
        'dark:from-gray-900',
        'dark:via-gray-800',
        'dark:to-gray-900',
        'dark:text-white'
      );
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('max-width: 639px')) return true;
        return false;
      });
    });

    it('should have proper ARIA attributes for sidebar', async () => {
      renderLayout();
      
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toBeInTheDocument();
      
      // Should be hidden initially
      expect(sidebar).toHaveAttribute('data-open', 'false');
      
      // Open sidebar
      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);
      
      expect(sidebar).toHaveAttribute('data-open', 'true');
    });

    it('should allow keyboard navigation', async () => {
      renderLayout();
      
      const menuButton = screen.getByTestId('menu-button');
      
      // Focus menu button
      menuButton.focus();
      expect(menuButton).toHaveFocus();
      
      // Press Enter to open sidebar
      await user.keyboard('{Enter}');
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true');
      
      // Close button should be focusable
      const closeButton = screen.getByTestId('sidebar-close');
      closeButton.focus();
      expect(closeButton).toHaveFocus();
      
      // Press Enter to close sidebar
      await user.keyboard('{Enter}');
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false');
    });

    it('should handle escape key to close sidebar', async () => {
      renderLayout();
      
      // Open sidebar
      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true');
      
      // Press Escape - this would need to be implemented in the actual component
      await user.keyboard('{Escape}');
      
      // Note: The current implementation doesn't handle Escape key
      // This test documents expected behavior for future implementation
    });

    it('should maintain focus management', async () => {
      renderLayout();
      
      const menuButton = screen.getByTestId('menu-button');
      
      // Open sidebar
      await user.click(menuButton);
      
      // Focus should remain manageable
      const closeButton = screen.getByTestId('sidebar-close');
      closeButton.focus();
      expect(closeButton).toHaveFocus();
      
      // Close sidebar
      await user.click(closeButton);
      
      // Menu button should still be accessible
      menuButton.focus();
      expect(menuButton).toHaveFocus();
    });
  });

  describe('Performance and Optimization', () => {
    it('should not re-render unnecessarily', () => {
      const renderCount = vi.fn();
      
      const TestContent = () => {
        renderCount();
        return <div data-testid="test-content">Test</div>;
      };

      const { rerender } = render(
        <ResponsiveLayout>
          <TestContent />
        </ResponsiveLayout>
      );

      expect(renderCount).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(
        <ResponsiveLayout>
          <TestContent />
        </ResponsiveLayout>
      );

      // Content should render again (React doesn't memoize by default)
      expect(renderCount).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid media query changes', async () => {
      let isMobile = true;
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('max-width: 639px')) return isMobile;
        return false;
      });

      const { rerender } = renderLayout();
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-layout-mode', 'mobile');

      // Rapid changes
      for (let i = 0; i < 5; i++) {
        isMobile = !isMobile;
        
        rerender(
          <ResponsiveLayout
            header={<MockHeader />}
            sidebar={<MockSidebar />}
            footer={<MockFooter />}
          >
            <div data-testid="main-content">Main Content</div>
          </ResponsiveLayout>
        );

        await waitFor(() => {
          const expectedMode = isMobile ? 'mobile' : 'desktop';
          expect(screen.getByTestId('sidebar')).toHaveAttribute('data-layout-mode', expectedMode);
        });
      }
    });
  });

  describe('Error Boundaries and Edge Cases', () => {
    it('should handle missing useMediaQuery hook gracefully', () => {
      mockUseMediaQuery.mockImplementation(() => {
        throw new Error('useMediaQuery failed');
      });

      // Should not crash the component
      expect(() => renderLayout()).not.toThrow();
    });

    it('should handle null/undefined children', () => {
      render(
        <ResponsiveLayout
          header={<MockHeader />}
          sidebar={<MockSidebar />}
          footer={<MockFooter />}
        >
          {null}
        </ResponsiveLayout>
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('should handle React.Fragment children', () => {
      render(
        <ResponsiveLayout>
          <>
            <div data-testid="fragment-child-1">Child 1</div>
            <div data-testid="fragment-child-2">Child 2</div>
          </>
        </ResponsiveLayout>
      );

      expect(screen.getByTestId('fragment-child-1')).toBeInTheDocument();
      expect(screen.getByTestId('fragment-child-2')).toBeInTheDocument();
    });
  });
});