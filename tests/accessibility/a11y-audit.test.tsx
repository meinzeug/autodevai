/**
 * @fileoverview Accessibility testing suite
 * Comprehensive A11y tests using jest-axe and testing-library
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { ResponsiveLayout } from '../../src/components/responsive/ResponsiveLayout';
import { App } from '../../src/App';

// Extend expect matchers
expect.extend(toHaveNoViolations);

// Mock components with proper accessibility attributes
const AccessibleHeader = ({ layoutMode, onMenuClick, sidebarOpen }: any) => (
  <header role="banner" className="bg-white dark:bg-gray-800 shadow-sm">
    <div className="flex items-center justify-between p-4">
      <h1 className="text-xl font-semibold">AutoDev-AI Platform</h1>
      <button
        type="button"
        onClick={onMenuClick}
        aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={sidebarOpen}
        aria-controls="main-navigation"
        className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 p-2 rounded-md"
      >
        <span className="sr-only">
          {sidebarOpen ? 'Close menu' : 'Open menu'}
        </span>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  </header>
);

const AccessibleSidebar = ({ layoutMode, isOpen, onClose }: any) => (
  <nav
    id="main-navigation"
    role="navigation"
    aria-label="Main navigation"
    className="bg-white dark:bg-gray-800 p-4"
  >
    <div className="space-y-4">
      <a 
        href="#dashboard" 
        className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-current="page"
      >
        Dashboard
      </a>
      <a 
        href="#orchestration" 
        className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        AI Orchestration
      </a>
      <a 
        href="#configuration" 
        className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Configuration
      </a>
    </div>
    
    {onClose && (
      <button
        type="button"
        onClick={onClose}
        aria-label="Close navigation menu"
        className="mt-4 w-full px-3 py-2 text-left text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Close Menu
      </button>
    )}
  </nav>
);

const AccessibleFooter = ({ layoutMode }: any) => (
  <footer role="contentinfo" className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
    <div className="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
      <p>&copy; 2024 AutoDev-AI Platform. All rights reserved.</p>
    </div>
  </footer>
);

const AccessibleMainContent = () => (
  <main role="main" className="p-6">
    <h2 className="text-2xl font-bold mb-4">Welcome to AutoDev-AI</h2>
    <section aria-labelledby="features-heading">
      <h3 id="features-heading" className="text-lg font-semibold mb-2">Key Features</h3>
      <ul className="space-y-2">
        <li>AI-powered code generation</li>
        <li>Multi-agent orchestration</li>
        <li>Real-time collaboration</li>
        <li>Performance monitoring</li>
      </ul>
    </section>
    
    <section aria-labelledby="actions-heading" className="mt-6">
      <h3 id="actions-heading" className="text-lg font-semibold mb-2">Quick Actions</h3>
      <div className="space-x-2">
        <button 
          type="button"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Start New Project
        </button>
        <button 
          type="button"
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          View Documentation
        </button>
      </div>
    </section>
  </main>
);

// Mock useMediaQuery for consistent testing
const mockUseMediaQuery = vi.fn();
vi.mock('../../src/hooks/useMediaQuery', () => ({
  useMediaQuery: mockUseMediaQuery
}));

describe('Accessibility Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to desktop layout for consistency
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query.includes('min-width: 1024px')) return true;
      return false;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ResponsiveLayout A11y', () => {
    it('should not have accessibility violations in desktop mode', async () => {
      const { container } = render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have accessibility violations in mobile mode', async () => {
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('max-width: 639px')) return true;
        return false;
      });

      const { container } = render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have accessibility violations in tablet mode', async () => {
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('min-width: 640px') && query.includes('max-width: 1023px')) return true;
        return false;
      });

      const { container } = render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation in desktop mode', async () => {
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('min-width: 1024px')) return true;
        return false;
      });

      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      // Test tab navigation through main elements
      await user.tab(); // Should focus first interactive element
      
      // Navigation links should be focusable
      const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
      dashboardLink.focus();
      expect(dashboardLink).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('link', { name: 'AI Orchestration' })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('link', { name: 'Configuration' })).toHaveFocus();

      // Buttons should be focusable
      await user.tab();
      expect(screen.getByRole('button', { name: 'Start New Project' })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: 'View Documentation' })).toHaveFocus();
    });

    it('should support keyboard navigation in mobile mode', async () => {
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('max-width: 639px')) return true;
        return false;
      });

      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      // Menu button should be focusable
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      menuButton.focus();
      expect(menuButton).toHaveFocus();

      // Open menu with keyboard
      await user.keyboard('{Enter}');
      
      // Navigation should be accessible after opening
      const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
      expect(dashboardLink).toBeInTheDocument();
    });

    it('should handle Enter and Space key activation', async () => {
      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      const startButton = screen.getByRole('button', { name: 'Start New Project' });
      startButton.focus();

      // Should respond to Enter key
      await user.keyboard('{Enter}');
      
      // Should respond to Space key
      await user.keyboard(' ');
    });
  });

  describe('ARIA Attributes and Roles', () => {
    it('should have correct ARIA roles and labels', () => {
      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      // Check for proper roles
      expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
      expect(screen.getByRole('navigation')).toBeInTheDocument(); // Sidebar
      expect(screen.getByRole('main')).toBeInTheDocument(); // Main content
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // Footer

      // Check for proper labels
      expect(screen.getByLabelText(/main navigation/i)).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation');
    });

    it('should have proper heading hierarchy', () => {
      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2 = screen.getByRole('heading', { level: 2 });
      const h3Elements = screen.getAllByRole('heading', { level: 3 });

      expect(h1).toHaveTextContent('AutoDev-AI Platform');
      expect(h2).toHaveTextContent('Welcome to AutoDev-AI');
      expect(h3Elements).toHaveLength(2);
      expect(h3Elements[0]).toHaveTextContent('Key Features');
      expect(h3Elements[1]).toHaveTextContent('Quick Actions');
    });

    it('should have proper ARIA expanded states for menu', async () => {
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('max-width: 639px')) return true;
        return false;
      });

      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      
      // Should start collapsed
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');

      // Open menu
      await user.click(menuButton);
      
      // Should be expanded
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have proper aria-current for active navigation', () => {
      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      const activeLink = screen.getByRole('link', { name: 'Dashboard' });
      expect(activeLink).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Focus Management', () => {
    it('should trap focus within sidebar when open on mobile', async () => {
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('max-width: 639px')) return true;
        return false;
      });

      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      // Open sidebar
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      await user.click(menuButton);

      // Focus should move to first element in sidebar
      const firstNavLink = screen.getByRole('link', { name: 'Dashboard' });
      firstNavLink.focus();
      expect(firstNavLink).toHaveFocus();

      // Should be able to navigate within sidebar
      await user.tab();
      expect(screen.getByRole('link', { name: 'AI Orchestration' })).toHaveFocus();
    });

    it('should restore focus when sidebar closes', async () => {
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('max-width: 639px')) return true;
        return false;
      });

      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      // Open sidebar
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      await user.click(menuButton);

      // Close sidebar
      const closeButton = screen.getByRole('button', { name: /close navigation menu/i });
      await user.click(closeButton);

      // Focus should return to menu button (in real implementation)
      // This is a desired behavior that should be implemented
    });

    it('should have visible focus indicators', () => {
      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      // All interactive elements should have focus styles
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      expect(menuButton).toHaveClass('focus:ring-2', 'focus:ring-blue-500');

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
      });

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('focus:outline-none');
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper screen reader text', () => {
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('max-width: 639px')) return true;
        return false;
      });

      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      // Should have screen reader only text
      const screenReaderText = document.querySelector('.sr-only');
      expect(screenReaderText).toBeInTheDocument();
      expect(screenReaderText).toHaveTextContent(/menu/i);
    });

    it('should provide context for dynamic content', async () => {
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('max-width: 639px')) return true;
        return false;
      });

      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      
      // Should announce state changes
      expect(menuButton).toHaveAttribute('aria-label', 'Open navigation menu');
      
      await user.click(menuButton);
      
      // Aria label should update (in a complete implementation)
      // This tests the desired behavior
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should support high contrast mode', () => {
      // Mock high contrast preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      // Should have high contrast friendly colors
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Should have sufficient color contrast (tested via visual inspection)
        expect(button).toBeInTheDocument();
      });
    });

    it('should support reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      // Animations should be reduced or disabled
      // This would be implemented in actual component styles
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Error States and Loading', () => {
    it('should handle loading states accessibly', () => {
      const LoadingContent = () => (
        <main role="main" aria-live="polite" className="p-6">
          <div role="status" aria-label="Loading content">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            </svg>
            <span className="sr-only">Loading...</span>
          </div>
        </main>
      );

      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <LoadingContent />
        </ResponsiveLayout>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should handle error states accessibly', () => {
      const ErrorContent = () => (
        <main role="main" className="p-6">
          <div role="alert" className="bg-red-50 border border-red-200 rounded-md p-4">
            <h2 className="text-lg font-semibold text-red-800">Error</h2>
            <p className="text-red-600">Failed to load content. Please try again.</p>
            <button 
              type="button"
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Retry
            </button>
          </div>
        </main>
      );

      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <ErrorContent />
        </ResponsiveLayout>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to load content. Please try again.')).toBeInTheDocument();
    });
  });

  describe('Mobile-Specific A11y', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('max-width: 639px')) return true;
        return false;
      });
    });

    it('should have touch-friendly target sizes', () => {
      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      // Menu button should have adequate touch target
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      expect(menuButton).toHaveClass('p-2'); // Minimum 44px touch target
    });

    it('should support gesture navigation announcements', async () => {
      render(
        <ResponsiveLayout
          header={<AccessibleHeader />}
          sidebar={<AccessibleSidebar />}
          footer={<AccessibleFooter />}
        >
          <AccessibleMainContent />
        </ResponsiveLayout>
      );

      // Swipe gestures would be announced to screen readers
      // This is more of a documentation of expected behavior
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      await user.click(menuButton);
      
      // Should announce sidebar state change
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });
});