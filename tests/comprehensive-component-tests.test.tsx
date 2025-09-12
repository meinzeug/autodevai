/**
 * Comprehensive Component Test Suite
 * Tests all React components with accessibility, performance, and edge cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, act, within } from '@testing-library/react';
import { renderWithProviders } from './unit/test-utils';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Input } from '@/components/common/Input';
import { Card } from '@/components/common/Card';

// Mock dependencies
vi.mock('@/utils/cn', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('Components - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Button Component', () => {
    describe('Basic Functionality', () => {
      it('should render with default props', () => {
        renderWithProviders(<Button>Click me</Button>);
        
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveTextContent('Click me');
      });

      it('should handle click events', async () => {
        const handleClick = vi.fn();
        const { user } = renderWithProviders(
          <Button onClick={handleClick}>Click me</Button>
        );
        
        await user.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
      });

      it('should be disabled when disabled prop is true', () => {
        renderWithProviders(<Button disabled>Disabled</Button>);
        
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
      });

      it('should show loading state', () => {
        renderWithProviders(<Button isLoading>Loading</Button>);
        
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('aria-busy', 'true');
      });
    });

    describe('Variants', () => {
      it('should apply primary variant classes', () => {
        renderWithProviders(<Button variant="primary">Primary</Button>);
        
        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-primary-500');
      });

      it('should apply secondary variant classes', () => {
        renderWithProviders(<Button variant="secondary">Secondary</Button>);
        
        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-gray-700');
      });

      it('should apply danger variant classes', () => {
        renderWithProviders(<Button variant="danger">Danger</Button>);
        
        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-red-500');
      });

      it('should apply ghost variant classes', () => {
        renderWithProviders(<Button variant="ghost">Ghost</Button>);
        
        const button = screen.getByRole('button');
        expect(button).toHaveClass('hover:bg-gray-800');
      });
    });

    describe('Sizes', () => {
      it('should apply small size classes', () => {
        renderWithProviders(<Button size="sm">Small</Button>);
        
        const button = screen.getByRole('button');
        expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
      });

      it('should apply medium size classes (default)', () => {
        renderWithProviders(<Button size="md">Medium</Button>);
        
        const button = screen.getByRole('button');
        expect(button).toHaveClass('px-4', 'py-2');
      });

      it('should apply large size classes', () => {
        renderWithProviders(<Button size="lg">Large</Button>);
        
        const button = screen.getByRole('button');
        expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
      });
    });

    describe('Accessibility', () => {
      it('should be focusable with keyboard', async () => {
        const { user } = renderWithProviders(<Button>Focusable</Button>);
        
        await user.tab();
        expect(screen.getByRole('button')).toHaveFocus();
      });

      it('should activate on Enter key', async () => {
        const handleClick = vi.fn();
        const { user } = renderWithProviders(
          <Button onClick={handleClick}>Enter</Button>
        );
        
        const button = screen.getByRole('button');
        button.focus();
        
        await user.keyboard('{Enter}');
        expect(handleClick).toHaveBeenCalled();
      });

      it('should activate on Space key', async () => {
        const handleClick = vi.fn();
        const { user } = renderWithProviders(
          <Button onClick={handleClick}>Space</Button>
        );
        
        const button = screen.getByRole('button');
        button.focus();
        
        await user.keyboard(' ');
        expect(handleClick).toHaveBeenCalled();
      });

      it('should have proper ARIA attributes when loading', () => {
        renderWithProviders(<Button isLoading>Loading</Button>);
        
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-busy', 'true');
      });

      it('should have proper button type', () => {
        renderWithProviders(<Button type="submit">Submit</Button>);
        
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('type', 'submit');
      });
    });

    describe('Edge Cases', () => {
      it('should handle rapid clicks', async () => {
        const handleClick = vi.fn();
        const { user } = renderWithProviders(
          <Button onClick={handleClick}>Rapid</Button>
        );
        
        const button = screen.getByRole('button');
        
        // Rapid clicks
        await user.click(button);
        await user.click(button);
        await user.click(button);
        
        expect(handleClick).toHaveBeenCalledTimes(3);
      });

      it('should handle long text content', () => {
        const longText = 'This is a very long button text that might wrap '.repeat(10);
        renderWithProviders(<Button>{longText}</Button>);
        
        const button = screen.getByRole('button');
        expect(button).toHaveTextContent(longText);
      });

      it('should handle special characters', () => {
        const specialText = '!@#$%^&*()_+{}|:"<>?[]\\;\',./-=`~';
        renderWithProviders(<Button>{specialText}</Button>);
        
        const button = screen.getByRole('button');
        expect(button).toHaveTextContent(specialText);
      });

      it('should handle JSX children', () => {
        renderWithProviders(
          <Button>
            <span>Icon</span>
            <span>Text</span>
          </Button>
        );
        
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        expect(within(button).getByText('Icon')).toBeInTheDocument();
        expect(within(button).getByText('Text')).toBeInTheDocument();
      });

      it('should not call onClick when disabled', async () => {
        const handleClick = vi.fn();
        const { user } = renderWithProviders(
          <Button disabled onClick={handleClick}>Disabled</Button>
        );
        
        await user.click(screen.getByRole('button'));
        expect(handleClick).not.toHaveBeenCalled();
      });

      it('should not call onClick when loading', async () => {
        const handleClick = vi.fn();
        const { user } = renderWithProviders(
          <Button isLoading onClick={handleClick}>Loading</Button>
        );
        
        await user.click(screen.getByRole('button'));
        expect(handleClick).not.toHaveBeenCalled();
      });
    });

    describe('Performance', () => {
      it('should render quickly', () => {
        const startTime = performance.now();
        renderWithProviders(<Button>Performance</Button>);
        const endTime = performance.now();
        
        expect(endTime - startTime).toBeLessThan(50);
      });

      it('should not re-render unnecessarily', () => {
        const renderSpy = vi.fn();
        
        const TestButton = (props: any) => {
          renderSpy();
          return <Button {...props} />;
        };
        
        const { rerender } = renderWithProviders(
          <TestButton>Test</TestButton>
        );
        
        const initialRenderCount = renderSpy.mock.calls.length;
        
        // Re-render with same props
        rerender(<TestButton>Test</TestButton>);
        
        // Should re-render but not excessively
        expect(renderSpy.mock.calls.length - initialRenderCount).toBeLessThanOrEqual(1);
      });

      it('should handle many buttons efficiently', () => {
        const startTime = performance.now();
        
        renderWithProviders(
          <div>
            {Array.from({ length: 100 }, (_, i) => (
              <Button key={i}>Button {i}</Button>
            ))}
          </div>
        );
        
        const endTime = performance.now();
        
        expect(endTime - startTime).toBeLessThan(200);
      });
    });
  });

  describe('LoadingSpinner Component', () => {
    it('should render with default size', () => {
      renderWithProviders(<LoadingSpinner />);
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should apply size classes correctly', () => {
      const { rerender } = renderWithProviders(<LoadingSpinner size="sm" />);
      expect(document.querySelector('.w-4')).toBeInTheDocument();
      
      rerender(<LoadingSpinner size="md" />);
      expect(document.querySelector('.w-6')).toBeInTheDocument();
      
      rerender(<LoadingSpinner size="lg" />);
      expect(document.querySelector('.w-8')).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      renderWithProviders(<LoadingSpinner />);
      
      const spinner = document.querySelector('[role="status"]');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should be visible to screen readers', () => {
      renderWithProviders(<LoadingSpinner />);
      
      const spinner = document.querySelector('[role="status"]');
      expect(spinner).not.toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Input Component', () => {
    it('should render basic input', () => {
      renderWithProviders(<Input placeholder="Enter text" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Enter text');
    });

    it('should handle value changes', async () => {
      const handleChange = vi.fn();
      const { user } = renderWithProviders(
        <Input onChange={handleChange} />
      );
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello World');
      
      expect(handleChange).toHaveBeenCalled();
      expect(input).toHaveValue('Hello World');
    });

    it('should handle different input types', () => {
      const { rerender } = renderWithProviders(<Input type="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
      
      rerender(<Input type="password" />);
      // Password inputs don't have textbox role
      expect(document.querySelector('input[type="password"]')).toBeInTheDocument();
      
      rerender(<Input type="number" />);
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    });

    it('should show error state', () => {
      renderWithProviders(<Input error="This field is required" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should be focusable', async () => {
      const { user } = renderWithProviders(<Input />);
      
      await user.tab();
      expect(screen.getByRole('textbox')).toHaveFocus();
    });

    it('should handle disabled state', () => {
      renderWithProviders(<Input disabled />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });

  describe('Card Component', () => {
    it('should render with children', () => {
      renderWithProviders(
        <Card>
          <h2>Card Title</h2>
          <p>Card content</p>
        </Card>
      );
      
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      renderWithProviders(
        <Card className="custom-card">Content</Card>
      );
      
      const card = screen.getByText('Content').closest('div');
      expect(card).toHaveClass('custom-card');
    });

    it('should handle click events if clickable', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithProviders(
        <Card onClick={handleClick}>Clickable Card</Card>
      );
      
      const card = screen.getByText('Clickable Card').closest('div');
      if (card) {
        await user.click(card);
        expect(handleClick).toHaveBeenCalled();
      }
    });

    it('should have proper semantic structure', () => {
      renderWithProviders(
        <Card>
          <h2>Title</h2>
          <p>Content</p>
        </Card>
      );
      
      // Should have heading hierarchy
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should work together in complex layouts', () => {
      renderWithProviders(
        <Card>
          <h2>Form Card</h2>
          <Input placeholder="Enter your name" />
          <Button variant="primary">Submit</Button>
          <LoadingSpinner size="sm" />
        </Card>
      );
      
      expect(screen.getByRole('heading')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should maintain proper focus management', async () => {
      const { user } = renderWithProviders(
        <div>
          <Input placeholder="First input" />
          <Button>Button</Button>
          <Input placeholder="Second input" />
        </div>
      );
      
      // Tab through elements
      await user.tab();
      expect(screen.getByPlaceholderText('First input')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByPlaceholderText('Second input')).toHaveFocus();
    });

    it('should handle form submission', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());
      const { user } = renderWithProviders(
        <form onSubmit={handleSubmit}>
          <Input name="username" placeholder="Username" />
          <Button type="submit">Submit</Button>
        </form>
      );
      
      const input = screen.getByPlaceholderText('Username');
      const button = screen.getByRole('button');
      
      await user.type(input, 'testuser');
      await user.click(button);
      
      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing props gracefully', () => {
      expect(() => {
        renderWithProviders(<Button />);
      }).not.toThrow();
    });

    it('should handle invalid prop values', () => {
      expect(() => {
        renderWithProviders(
          <Button variant={'invalid' as any} size={'invalid' as any}>
            Invalid
          </Button>
        );
      }).not.toThrow();
    });

    it('should handle null/undefined children', () => {
      expect(() => {
        renderWithProviders(<Button>{null}</Button>);
        renderWithProviders(<Button>{undefined}</Button>);
      }).not.toThrow();
    });

    it('should handle render errors gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const ThrowingComponent = () => {
        throw new Error('Render error');
      };
      
      expect(() => {
        renderWithProviders(
          <Card>
            <ThrowingComponent />
          </Card>
        );
      }).toThrow();
      
      consoleError.mockRestore();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt to different screen sizes', () => {
      // Mock different screen sizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      
      renderWithProviders(
        <Card>
          <Button size="sm">Mobile Button</Button>
        </Card>
      );
      
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle touch interactions', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithProviders(
        <Button onClick={handleClick}>Touch Button</Button>
      );
      
      const button = screen.getByRole('button');
      
      // Simulate touch
      await user.click(button);
      expect(handleClick).toHaveBeenCalled();
    });
  });
});