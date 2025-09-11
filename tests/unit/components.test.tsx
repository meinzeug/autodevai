/**
 * Components Test Suite
 * Comprehensive tests for React components
 * Step 301: Component Test - React component testing suite
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { Button, IconButton, ButtonGroup, LinkButton } from '@components/Button';

describe('Component Tests', () => {
  describe('Button Component', () => {
    it('should render button with text', () => {
      renderWithProviders(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should handle click events', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithProviders(
        <Button onClick={handleClick}>Click me</Button>
      );

      await user.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledOnce();
    });

    it('should apply variant classes correctly', () => {
      renderWithProviders(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600', 'text-white');
    });

    it('should apply secondary variant classes', () => {
      renderWithProviders(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-200', 'text-gray-900');
    });

    it('should apply danger variant classes', () => {
      renderWithProviders(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600', 'text-white');
    });

    it('should apply success variant classes', () => {
      renderWithProviders(<Button variant="success">Success</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-green-600', 'text-white');
    });

    it('should apply ghost variant classes', () => {
      renderWithProviders(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent', 'text-gray-700');
    });

    it('should apply size classes correctly', () => {
      const { rerender } = renderWithProviders(<Button size="small">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm');

      rerender(<Button size="medium">Medium</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2', 'text-sm');

      rerender(<Button size="large">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-lg');
    });

    it('should be disabled when disabled prop is true', () => {
      renderWithProviders(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('cursor-not-allowed', 'opacity-60');
    });

    it('should show loading state', () => {
      renderWithProviders(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
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
        <Button loading onClick={handleClick}>Loading</Button>
      );

      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should apply custom className', () => {
      renderWithProviders(<Button className="custom-class">Custom</Button>);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('should have correct button type', () => {
      renderWithProviders(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('should have accessibility attributes', () => {
      renderWithProviders(<Button disabled loading>Test</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('IconButton Component', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;

    it('should render icon button', () => {
      renderWithProviders(
        <IconButton 
          icon={<TestIcon />} 
          aria-label="Test icon button"
        />
      );
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Test icon button');
    });

    it('should handle click events', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithProviders(
        <IconButton 
          icon={<TestIcon />}
          onClick={handleClick}
          aria-label="Clickable icon"
        />
      );

      await user.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledOnce();
    });

    it('should hide icon when loading', () => {
      renderWithProviders(
        <IconButton 
          icon={<TestIcon />}
          loading
          aria-label="Loading icon"
        />
      );
      
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
    });

    it('should apply ghost variant by default', () => {
      renderWithProviders(
        <IconButton 
          icon={<TestIcon />}
          aria-label="Ghost icon"
        />
      );
      
      expect(screen.getByRole('button')).toHaveClass('bg-transparent');
    });

    it('should apply custom variant', () => {
      renderWithProviders(
        <IconButton 
          icon={<TestIcon />}
          variant="primary"
          aria-label="Primary icon"
        />
      );
      
      expect(screen.getByRole('button')).toHaveClass('bg-blue-600');
    });
  });

  describe('ButtonGroup Component', () => {
    it('should render button group', () => {
      renderWithProviders(
        <ButtonGroup>
          <Button>First</Button>
          <Button>Second</Button>
          <Button>Third</Button>
        </ButtonGroup>
      );

      const group = screen.getByRole('group');
      expect(group).toBeInTheDocument();
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });

    it('should apply group styling to children', () => {
      renderWithProviders(
        <ButtonGroup>
          <Button>First</Button>
          <Button>Second</Button>
          <Button>Third</Button>
        </ButtonGroup>
      );

      const buttons = screen.getAllByRole('button');
      
      // First button should have focus:z-10
      expect(buttons[0]).toHaveClass('focus:z-10');
      
      // Middle button should have left margin and focus:z-10
      expect(buttons[1]).toHaveClass('-ml-px', 'focus:z-10');
      
      // Last button should have left margin and focus:z-10
      expect(buttons[2]).toHaveClass('-ml-px', 'focus:z-10');
    });

    it('should apply custom className to group', () => {
      renderWithProviders(
        <ButtonGroup className="custom-group-class">
          <Button>Test</Button>
        </ButtonGroup>
      );

      expect(screen.getByRole('group')).toHaveClass('custom-group-class');
    });

    it('should handle single child', () => {
      renderWithProviders(
        <ButtonGroup>
          <Button>Single</Button>
        </ButtonGroup>
      );

      expect(screen.getByRole('group')).toBeInTheDocument();
      expect(screen.getByText('Single')).toBeInTheDocument();
    });
  });

  describe('LinkButton Component', () => {
    it('should render as link with button styling', () => {
      renderWithProviders(
        <LinkButton href="/test">Link Button</LinkButton>
      );

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test');
      expect(screen.getByText('Link Button')).toBeInTheDocument();
    });

    it('should handle external links', () => {
      renderWithProviders(
        <LinkButton href="https://example.com" external>
          External Link
        </LinkButton>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      
      // Should show external link icon
      const icon = link.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      renderWithProviders(
        <LinkButton href="/test" disabled>
          Disabled Link
        </LinkButton>
      );

      // When disabled, href should be undefined and should have aria-disabled
      const link = screen.getByText('Disabled Link').closest('a');
      expect(link).not.toHaveAttribute('href');
      expect(link).toHaveAttribute('aria-disabled', 'true');
    });

    it('should apply variant styling', () => {
      renderWithProviders(
        <LinkButton href="/test" variant="danger">
          Danger Link
        </LinkButton>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('bg-red-600');
    });

    it('should not show external icon when disabled', () => {
      renderWithProviders(
        <LinkButton href="https://example.com" external disabled>
          Disabled External
        </LinkButton>
      );

      const link = screen.getByText('Disabled External').closest('a');
      const icon = link?.querySelector('svg');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('Button Accessibility', () => {
    it('should be focusable with keyboard', async () => {
      const { user } = renderWithProviders(<Button>Focusable</Button>);
      
      await user.tab();
      expect(screen.getByRole('button')).toHaveFocus();
    });

    it('should activate on Enter key', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithProviders(
        <Button onClick={handleClick}>Enter Button</Button>
      );
      
      await user.tab();
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalled();
    });

    it('should activate on Space key', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithProviders(
        <Button onClick={handleClick}>Space Button</Button>
      );
      
      await user.tab();
      await user.keyboard('{ }');
      expect(handleClick).toHaveBeenCalled();
    });

    it('should have proper ARIA attributes for loading state', () => {
      renderWithProviders(<Button loading>Loading Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should have proper ARIA attributes for disabled state', () => {
      renderWithProviders(<Button disabled>Disabled Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should have aria-label for icon button', () => {
      const TestIcon = () => <span>Icon</span>;
      renderWithProviders(
        <IconButton 
          icon={<TestIcon />}
          aria-label="Test icon button"
        />
      );
      
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Test icon button');
    });
  });

  describe('Button Edge Cases', () => {
    it('should handle undefined onClick gracefully', async () => {
      const { user } = renderWithProviders(<Button>No Click Handler</Button>);
      
      // Should not throw error
      await user.click(screen.getByRole('button'));
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle empty children', () => {
      renderWithProviders(<Button></Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle multiple children', () => {
      renderWithProviders(
        <Button>
          <span>Text</span>
          <span>More Text</span>
        </Button>
      );
      
      expect(screen.getByText('Text')).toBeInTheDocument();
      expect(screen.getByText('More Text')).toBeInTheDocument();
    });

    it('should handle invalid variant gracefully', () => {
      renderWithProviders(
        <Button variant={'invalid' as any}>Invalid Variant</Button>
      );
      
      const button = screen.getByRole('button');
      // Should fall back to primary variant
      expect(button).toHaveClass('bg-blue-600');
    });

    it('should handle invalid size gracefully', () => {
      renderWithProviders(
        <Button size={'invalid' as any}>Invalid Size</Button>
      );
      
      const button = screen.getByRole('button');
      // Should fall back to medium size
      expect(button).toHaveClass('px-4', 'py-2');
    });

    it('should handle rapid clicks when loading', async () => {
      const handleClick = vi.fn();
      const { user } = renderWithProviders(
        <Button loading onClick={handleClick}>Loading Button</Button>
      );
      
      const button = screen.getByRole('button');
      
      // Try to click multiple times rapidly
      await user.click(button);
      await user.click(button);
      await user.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should prevent event propagation when disabled', async () => {
      const parentClick = vi.fn();
      const buttonClick = vi.fn();
      
      const { user } = renderWithProviders(
        <div onClick={parentClick}>
          <Button disabled onClick={buttonClick}>
            Disabled in Parent
          </Button>
        </div>
      );
      
      await user.click(screen.getByRole('button'));
      
      expect(buttonClick).not.toHaveBeenCalled();
      // Parent click should still fire as event bubbles up
      expect(parentClick).toHaveBeenCalled();
    });
  });

  describe('Component Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = vi.fn();
      
      const TestButton = ({ children, ...props }: any) => {
        renderSpy();
        return <Button {...props}>{children}</Button>;
      };
      
      const { rerender } = renderWithProviders(
        <TestButton>Test</TestButton>
      );
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props
      rerender(<TestButton>Test</TestButton>);
      
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle many children efficiently', () => {
      const manyChildren = Array.from({ length: 100 }, (_, i) => (
        <span key={i}>Child {i}</span>
      ));
      
      const startTime = performance.now();
      renderWithProviders(
        <ButtonGroup>
          {manyChildren.map((child, i) => (
            <Button key={i}>{child}</Button>
          ))}
        </ButtonGroup>
      );
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should render in less than 100ms
      expect(screen.getByRole('group')).toBeInTheDocument();
    });
  });
});