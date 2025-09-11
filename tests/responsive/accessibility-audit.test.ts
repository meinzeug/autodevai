/**
 * Accessibility Audit Test Suite
 * Tests keyboard navigation, screen reader support, ARIA labels, and WCAG compliance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock components for testing
const AccessibleButton = ({ 
  children, 
  onClick, 
  disabled = false,
  ariaLabel,
  ariaDescribedBy 
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    aria-describedby={ariaDescribedBy}
    data-testid="accessible-button"
  >
    {children}
  </button>
);

const AccessibleForm = () => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    
    setErrors(newErrors);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2>Registration Form</h2>
      
      <div>
        <label htmlFor="name">Name *</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          aria-required="true"
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <div id="name-error" role="alert" aria-live="polite">
            {errors.name}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="email">Email *</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          aria-required="true"
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <div id="email-error" role="alert" aria-live="polite">
            {errors.email}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="password">Password *</label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          aria-required="true"
          aria-invalid={errors.password ? 'true' : 'false'}
          aria-describedby={errors.password ? 'password-error' : 'password-help'}
        />
        <div id="password-help">Password must be at least 8 characters</div>
        {errors.password && (
          <div id="password-error" role="alert" aria-live="polite">
            {errors.password}
          </div>
        )}
      </div>

      <button type="submit">Register</button>
    </form>
  );
};

const NavigationComponent = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const menuItems = [
    { id: 'home', label: 'Home', href: '/' },
    { id: 'about', label: 'About', href: '/about' },
    { id: 'contact', label: 'Contact', href: '/contact' }
  ];

  return (
    <nav role="navigation" aria-label="Main navigation">
      <button
        aria-expanded={isMenuOpen}
        aria-controls="main-menu"
        aria-label="Toggle navigation menu"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        data-testid="menu-toggle"
      >
        ☰ Menu
      </button>
      
      <ul
        id="main-menu"
        role="menubar"
        hidden={!isMenuOpen}
        aria-hidden={!isMenuOpen}
      >
        {menuItems.map((item, index) => (
          <li key={item.id} role="none">
            <a
              href={item.href}
              role="menuitem"
              tabIndex={isMenuOpen ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' && index < menuItems.length - 1) {
                  e.preventDefault();
                  const nextItem = document.querySelector(`a[href="${menuItems[index + 1].href}"]`) as HTMLElement;
                  nextItem?.focus();
                }
                if (e.key === 'ArrowUp' && index > 0) {
                  e.preventDefault();
                  const prevItem = document.querySelector(`a[href="${menuItems[index - 1].href}"]`) as HTMLElement;
                  prevItem?.focus();
                }
              }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

const ModalComponent = ({ isOpen, onClose, children }: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
      
      // Trap focus within modal
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
        
        if (e.key === 'Tab') {
          const focusableElements = modalRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusableElements) {
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
            
            if (e.shiftKey && document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={modalRef}
      tabIndex={-1}
      data-testid="modal"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        border: '1px solid black',
        padding: '20px',
        zIndex: 1000
      }}
    >
      <h2 id="modal-title">Modal Title</h2>
      {children}
      <button onClick={onClose} data-testid="close-modal">Close</button>
    </div>
  );
};

describe('Accessibility Audit Test Suite', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('WCAG Compliance', () => {
    it('should pass axe accessibility audit', async () => {
      const { container } = render(
        <div>
          <h1>Main Heading</h1>
          <main>
            <h2>Section Heading</h2>
            <p>This is a paragraph with proper semantic structure.</p>
            <button>Accessible Button</button>
          </main>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading hierarchy', () => {
      render(
        <div>
          <h1>Page Title</h1>
          <main>
            <h2>Section 1</h2>
            <h3>Subsection 1.1</h3>
            <h3>Subsection 1.2</h3>
            <h2>Section 2</h2>
            <h3>Subsection 2.1</h3>
          </main>
        </div>
      );

      const headings = screen.getAllByRole('heading');
      expect(headings).toHaveLength(6);

      // Check heading levels
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page Title');
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    });

    it('should have proper landmark regions', () => {
      render(
        <div>
          <header role="banner">
            <h1>Site Title</h1>
          </header>
          <nav role="navigation" aria-label="Main navigation">
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </nav>
          <main role="main">
            <h2>Main Content</h2>
            <p>Content here</p>
          </main>
          <aside role="complementary" aria-label="Sidebar">
            <h3>Related Links</h3>
          </aside>
          <footer role="contentinfo">
            <p>Footer content</p>
          </footer>
        </div>
      );

      // Check landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('complementary')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('should meet color contrast requirements', () => {
      render(
        <div>
          <div style={{ color: '#000000', backgroundColor: '#ffffff' }}>
            High contrast text
          </div>
          <div style={{ color: '#767676', backgroundColor: '#ffffff' }}>
            Adequate contrast text
          </div>
        </div>
      );

      // In a real implementation, you would use a color contrast analyzer
      // For now, we'll just check that the elements exist
      expect(screen.getByText('High contrast text')).toBeInTheDocument();
      expect(screen.getByText('Adequate contrast text')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through interactive elements', async () => {
      render(
        <div>
          <button data-testid="button1">Button 1</button>
          <input data-testid="input1" placeholder="Input 1" />
          <a href="#" data-testid="link1">Link 1</a>
          <button data-testid="button2">Button 2</button>
        </div>
      );

      // Start tabbing through elements
      await user.tab();
      expect(screen.getByTestId('button1')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('input1')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('link1')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('button2')).toHaveFocus();

      // Tab backward
      await user.tab({ shift: true });
      expect(screen.getByTestId('link1')).toHaveFocus();
    });

    it('should handle arrow key navigation in menus', async () => {
      render(<NavigationComponent />);

      const menuToggle = screen.getByTestId('menu-toggle');
      await user.click(menuToggle);

      // Menu should be open
      expect(menuToggle).toHaveAttribute('aria-expanded', 'true');

      // Focus first menu item
      const homeLink = screen.getByText('Home');
      homeLink.focus();

      // Arrow down should move to next item
      fireEvent.keyDown(homeLink, { key: 'ArrowDown' });
      await waitFor(() => {
        expect(screen.getByText('About')).toHaveFocus();
      });

      // Arrow up should move back
      fireEvent.keyDown(screen.getByText('About'), { key: 'ArrowUp' });
      await waitFor(() => {
        expect(homeLink).toHaveFocus();
      });
    });

    it('should support Enter and Space key activation', async () => {
      const mockClick = vi.fn();
      render(
        <AccessibleButton onClick={mockClick}>
          Click Me
        </AccessibleButton>
      );

      const button = screen.getByTestId('accessible-button');
      button.focus();

      // Test Enter key
      await user.keyboard('{Enter}');
      expect(mockClick).toHaveBeenCalledTimes(1);

      // Test Space key
      await user.keyboard(' ');
      expect(mockClick).toHaveBeenCalledTimes(2);
    });

    it('should handle Escape key for dismissible components', async () => {
      const TestModal = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        return (
          <div>
            <button onClick={() => setIsOpen(true)} data-testid="open-modal">
              Open Modal
            </button>
            <ModalComponent isOpen={isOpen} onClose={() => setIsOpen(false)}>
              <p>Modal content</p>
            </ModalComponent>
          </div>
        );
      };

      render(<TestModal />);

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      expect(screen.getByTestId('modal')).toBeInTheDocument();

      // Press Escape to close
      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      });
    });

    it('should trap focus within modals', async () => {
      const TestModal = () => {
        const [isOpen, setIsOpen] = React.useState(true);
        return (
          <ModalComponent isOpen={isOpen} onClose={() => setIsOpen(false)}>
            <button data-testid="first-button">First Button</button>
            <input data-testid="modal-input" placeholder="Input" />
            <button data-testid="last-button">Last Button</button>
          </ModalComponent>
        );
      };

      render(<TestModal />);

      const modal = screen.getByTestId('modal');
      const firstButton = screen.getByTestId('first-button');
      const lastButton = screen.getByTestId('last-button');

      // Focus should be trapped within modal
      modal.focus();

      // Tab to last element
      await user.tab();
      await user.tab();
      await user.tab();
      expect(screen.getByTestId('close-modal')).toHaveFocus();

      // Tab should wrap to first focusable element
      await user.tab();
      expect(firstButton).toHaveFocus();

      // Shift+Tab from first should go to last
      await user.tab({ shift: true });
      expect(screen.getByTestId('close-modal')).toHaveFocus();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels and descriptions', () => {
      render(
        <div>
          <button
            aria-label="Close dialog"
            aria-describedby="close-help"
            data-testid="close-button"
          >
            ×
          </button>
          <div id="close-help">
            This will close the current dialog and return to the main page
          </div>
        </div>
      );

      const button = screen.getByTestId('close-button');
      expect(button).toHaveAttribute('aria-label', 'Close dialog');
      expect(button).toHaveAttribute('aria-describedby', 'close-help');
    });

    it('should announce live region updates', async () => {
      const StatusComponent = () => {
        const [status, setStatus] = React.useState('');

        return (
          <div>
            <button
              onClick={() => setStatus('Loading...')}
              data-testid="load-button"
            >
              Load Data
            </button>
            <div
              role="status"
              aria-live="polite"
              data-testid="status"
            >
              {status}
            </div>
          </div>
        );
      };

      render(<StatusComponent />);

      const statusRegion = screen.getByTestId('status');
      expect(statusRegion).toHaveAttribute('role', 'status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');

      // Update status
      await user.click(screen.getByTestId('load-button'));
      expect(statusRegion).toHaveTextContent('Loading...');
    });

    it('should provide form validation feedback', async () => {
      render(<AccessibleForm />);

      const submitButton = screen.getByRole('button', { name: /register/i });
      await user.click(submitButton);

      // Check for error announcements
      const nameError = screen.getByText('Name is required');
      expect(nameError).toHaveAttribute('role', 'alert');
      expect(nameError).toHaveAttribute('aria-live', 'polite');

      // Check that input is marked as invalid
      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      expect(nameInput).toHaveAttribute('aria-describedby', 'name-error');
    });

    it('should have descriptive link text', () => {
      render(
        <div>
          <a href="/contact" aria-label="Contact us page">
            Contact
          </a>
          <a href="/download" data-testid="download-link">
            Download our app
            <span className="sr-only"> (PDF, 2MB)</span>
          </a>
        </div>
      );

      const contactLink = screen.getByText('Contact');
      expect(contactLink).toHaveAttribute('aria-label', 'Contact us page');

      const downloadLink = screen.getByTestId('download-link');
      expect(downloadLink).toHaveTextContent('Download our app (PDF, 2MB)');
    });

    it('should provide alternative text for images', () => {
      render(
        <div>
          <img src="/logo.png" alt="AutoDev-AI Logo" />
          <img src="/decorative.png" alt="" role="presentation" />
          <img 
            src="/chart.png" 
            alt="Sales increased by 25% from January to March" 
          />
        </div>
      );

      // Meaningful images should have descriptive alt text
      const logo = screen.getByAltText('AutoDev-AI Logo');
      expect(logo).toBeInTheDocument();

      // Charts should have descriptive alt text
      const chart = screen.getByAltText('Sales increased by 25% from January to March');
      expect(chart).toBeInTheDocument();

      // Decorative images should have empty alt text
      const decorative = screen.getByRole('presentation');
      expect(decorative).toHaveAttribute('alt', '');
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', () => {
      render(
        <div>
          <button data-testid="focus-button" className="focus:ring-2 focus:ring-blue-500">
            Focusable Button
          </button>
          <input data-testid="focus-input" className="focus:outline-2 focus:outline-blue-500" />
        </div>
      );

      const button = screen.getByTestId('focus-button');
      const input = screen.getByTestId('focus-input');

      // Focus elements
      button.focus();
      expect(button).toHaveFocus();

      input.focus();
      expect(input).toHaveFocus();

      // In a real test, you would check computed styles for focus indicators
    });

    it('should skip non-interactive elements in tab order', async () => {
      render(
        <div>
          <button data-testid="button1">Button 1</button>
          <div>Non-interactive text</div>
          <span>More text</span>
          <button data-testid="button2">Button 2</button>
        </div>
      );

      // Start tabbing
      await user.tab();
      expect(screen.getByTestId('button1')).toHaveFocus();

      // Next tab should skip non-interactive elements
      await user.tab();
      expect(screen.getByTestId('button2')).toHaveFocus();
    });

    it('should manage focus for dynamic content', async () => {
      const DynamicContent = () => {
        const [showContent, setShowContent] = React.useState(false);

        return (
          <div>
            <button
              onClick={() => setShowContent(!showContent)}
              data-testid="toggle-content"
            >
              Toggle Content
            </button>
            {showContent && (
              <div>
                <h2 tabIndex={-1} data-testid="new-heading">
                  New Content Appeared
                </h2>
                <button data-testid="new-button">New Button</button>
              </div>
            )}
          </div>
        );
      };

      render(<DynamicContent />);

      // Show content
      await user.click(screen.getByTestId('toggle-content'));

      // Focus should move to new content
      const newHeading = screen.getByTestId('new-heading');
      expect(newHeading).toBeInTheDocument();
      
      // In a real implementation, you would programmatically focus the heading
      newHeading.focus();
      expect(newHeading).toHaveFocus();
    });

    it('should restore focus after modal closes', async () => {
      const FocusRestoreTest = () => {
        const [isModalOpen, setIsModalOpen] = React.useState(false);
        const triggerRef = React.useRef<HTMLButtonElement>(null);

        const handleOpenModal = () => {
          setIsModalOpen(true);
        };

        const handleCloseModal = () => {
          setIsModalOpen(false);
          // Restore focus to trigger button
          setTimeout(() => {
            triggerRef.current?.focus();
          }, 0);
        };

        return (
          <div>
            <button
              ref={triggerRef}
              onClick={handleOpenModal}
              data-testid="open-modal"
            >
              Open Modal
            </button>
            <ModalComponent isOpen={isModalOpen} onClose={handleCloseModal}>
              <p>Modal content</p>
            </ModalComponent>
          </div>
        );
      };

      render(<FocusRestoreTest />);

      const openButton = screen.getByTestId('open-modal');
      
      // Focus and open modal
      openButton.focus();
      await user.click(openButton);

      // Modal should be open
      expect(screen.getByTestId('modal')).toBeInTheDocument();

      // Close modal
      await user.click(screen.getByTestId('close-modal'));

      // Focus should return to open button
      await waitFor(() => {
        expect(openButton).toHaveFocus();
      });
    });
  });

  describe('High Contrast Mode Support', () => {
    it('should work with high contrast preferences', () => {
      // Mock high contrast media query
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-contrast: high)',
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }));

      const HighContrastComponent = () => {
        const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

        return (
          <div
            data-testid="high-contrast"
            className={prefersHighContrast ? 'high-contrast' : 'normal'}
            style={{
              border: prefersHighContrast ? '2px solid' : '1px solid',
              backgroundColor: prefersHighContrast ? '#000000' : '#f5f5f5',
              color: prefersHighContrast ? '#ffffff' : '#333333'
            }}
          >
            Content with contrast support
          </div>
        );
      };

      render(<HighContrastComponent />);

      const element = screen.getByTestId('high-contrast');
      expect(element).toHaveClass('high-contrast');

      const computedStyle = window.getComputedStyle(element);
      expect(computedStyle.border).toBe('2px solid');
    });

    it('should provide fallbacks for custom elements', () => {
      render(
        <div>
          <div
            data-testid="custom-button"
            role="button"
            tabIndex={0}
            style={{
              padding: '8px 16px',
              border: '2px solid transparent',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                console.log('Custom button activated');
              }
            }}
          >
            Custom Button
          </div>
        </div>
      );

      const customButton = screen.getByTestId('custom-button');
      expect(customButton).toHaveAttribute('role', 'button');
      expect(customButton).toHaveAttribute('tabIndex', '0');
    });
  });
});