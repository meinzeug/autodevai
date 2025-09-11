import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { useBreakpoint, useResponsiveValue, type ResponsiveValue, type Breakpoint } from '../../hooks/useResponsive';

export interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Maximum width for different breakpoints
   */
  maxWidth?: ResponsiveValue<string>;
  
  /**
   * Padding for different breakpoints
   */
  padding?: ResponsiveValue<string>;
  
  /**
   * Margin for different breakpoints
   */
  margin?: ResponsiveValue<string>;
  
  /**
   * Layout type for different breakpoints
   */
  layout?: ResponsiveValue<'block' | 'flex' | 'grid' | 'inline' | 'inline-block' | 'inline-flex'>;
  
  /**
   * Flex direction for different breakpoints (when layout is flex)
   */
  flexDirection?: ResponsiveValue<'row' | 'column' | 'row-reverse' | 'column-reverse'>;
  
  /**
   * Grid columns for different breakpoints (when layout is grid)
   */
  gridCols?: ResponsiveValue<number>;
  
  /**
   * Gap for different breakpoints
   */
  gap?: ResponsiveValue<string>;
  
  /**
   * Custom class names for different breakpoints
   */
  responsiveClasses?: Partial<Record<Breakpoint, string>>;
  
  /**
   * Whether to center the container
   */
  centered?: boolean;
  
  /**
   * Whether to make the container fluid (full width)
   */
  fluid?: boolean;
  
  /**
   * Whether to constrain content width
   */
  constrained?: boolean;
}

/**
 * A responsive container component that adapts its layout and styling
 * based on the current breakpoint
 */
export const ResponsiveContainer = forwardRef<HTMLDivElement, ResponsiveContainerProps>(
  ({
    children,
    className,
    maxWidth = { xs: '100%', sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
    padding = { xs: '1rem', sm: '1.5rem', md: '2rem', lg: '2.5rem', xl: '3rem', '2xl': '4rem' },
    margin = 'auto',
    layout = 'block',
    flexDirection = 'column',
    gridCols = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5, '2xl': 6 },
    gap = { xs: '1rem', sm: '1.5rem', md: '2rem', lg: '2.5rem', xl: '3rem' },
    responsiveClasses = {},
    centered = false,
    fluid = false,
    constrained = true,
    ...props
  }, ref) => {
    const breakpoint = useBreakpoint();
    
    const currentMaxWidth = useResponsiveValue(maxWidth);
    const currentPadding = useResponsiveValue(padding);
    const currentMargin = useResponsiveValue(margin);
    const currentLayout = useResponsiveValue(layout);
    const currentFlexDirection = useResponsiveValue(flexDirection);
    const currentGridCols = useResponsiveValue(gridCols);
    const currentGap = useResponsiveValue(gap);
    
    // Build dynamic styles
    const styles: React.CSSProperties = {
      maxWidth: fluid ? '100%' : currentMaxWidth,
      padding: currentPadding,
      margin: currentMargin,
      gap: currentGap,
    };
    
    // Layout-specific styles
    if (currentLayout === 'flex') {
      styles.display = 'flex';
      styles.flexDirection = currentFlexDirection;
    } else if (currentLayout === 'grid') {
      styles.display = 'grid';
      styles.gridTemplateColumns = `repeat(${currentGridCols}, 1fr)`;
    } else if (currentLayout) {
      styles.display = currentLayout;
    }
    
    // Build classes
    const containerClasses = cn(
      // Base classes
      'responsive-container',
      
      // Layout classes
      {
        'mx-auto': centered && !fluid,
        'w-full': fluid,
        'max-w-screen-2xl': constrained && !fluid && !currentMaxWidth,
      },
      
      // Breakpoint-specific classes
      breakpoint.current && responsiveClasses[breakpoint.current],
      
      // Mobile-specific optimizations
      {
        'touch-manipulation': breakpoint.isMobile,
        'overflow-x-hidden': breakpoint.isMobile,
      },
      
      // Tablet-specific optimizations
      {
        'scroll-smooth': breakpoint.isTablet,
      },
      
      // Desktop-specific optimizations
      {
        'scroll-behavior-smooth': breakpoint.isDesktop,
      },
      
      className
    );
    
    return (
      <div
        ref={ref}
        className={containerClasses}
        style={styles}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsiveContainer.displayName = 'ResponsiveContainer';

/**
 * Predefined container variants for common use cases
 */
export const ContainerVariants = {
  // Page-level container
  page: {
    maxWidth: { xs: '100%', sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
    padding: { xs: '1rem', sm: '1.5rem', md: '2rem', lg: '2.5rem', xl: '3rem', '2xl': '4rem' },
    centered: true,
    constrained: true,
  },
  
  // Content section container
  section: {
    maxWidth: { xs: '100%', md: '768px', lg: '1024px', xl: '1280px' },
    padding: { xs: '1rem', sm: '1.5rem', md: '2rem', lg: '2rem' },
    centered: true,
  },
  
  // Card container
  card: {
    padding: { xs: '1rem', sm: '1.5rem', md: '2rem' },
    margin: { xs: '0.5rem', sm: '1rem', md: '1rem' },
  },
  
  // Form container
  form: {
    maxWidth: { xs: '100%', sm: '480px', md: '560px', lg: '640px' },
    padding: { xs: '1rem', sm: '1.5rem', md: '2rem' },
    centered: true,
  },
  
  // Sidebar container
  sidebar: {
    maxWidth: { xs: '100%', md: '280px', lg: '320px', xl: '360px' },
    padding: { xs: '1rem', md: '1.5rem', lg: '2rem' },
  },
  
  // Header container
  header: {
    maxWidth: '100%',
    padding: { xs: '0.5rem', sm: '1rem', md: '1.5rem' },
    fluid: true,
  },
  
  // Footer container
  footer: {
    maxWidth: '100%',
    padding: { xs: '1rem', sm: '1.5rem', md: '2rem' },
    fluid: true,
  },
} as const;

/**
 * Pre-built container components for common use cases
 */
export const PageContainer = (props: ResponsiveContainerProps) => (
  <ResponsiveContainer {...ContainerVariants.page} {...props} />
);

export const SectionContainer = (props: ResponsiveContainerProps) => (
  <ResponsiveContainer {...ContainerVariants.section} {...props} />
);

export const CardContainer = (props: ResponsiveContainerProps) => (
  <ResponsiveContainer {...ContainerVariants.card} {...props} />
);

export const FormContainer = (props: ResponsiveContainerProps) => (
  <ResponsiveContainer {...ContainerVariants.form} {...props} />
);

export const SidebarContainer = (props: ResponsiveContainerProps) => (
  <ResponsiveContainer {...ContainerVariants.sidebar} {...props} />
);

export const HeaderContainer = (props: ResponsiveContainerProps) => (
  <ResponsiveContainer {...ContainerVariants.header} {...props} />
);

export const FooterContainer = (props: ResponsiveContainerProps) => (
  <ResponsiveContainer {...ContainerVariants.footer} {...props} />
);