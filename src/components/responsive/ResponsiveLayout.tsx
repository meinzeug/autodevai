/**
 * ResponsiveLayout Component
 * Provides responsive layout functionality for different screen sizes
 */

import React from 'react';
import { cn } from '@/utils/cn';
import { 
  getResponsiveValue, 
  getDeviceType, 
  type ResponsiveConfig, 
  type DeviceType 
} from '@/utils/responsive';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
  padding?: ResponsiveConfig<string>;
  margin?: ResponsiveConfig<string>;
  direction?: ResponsiveConfig<'row' | 'col'>;
  gap?: ResponsiveConfig<string>;
  align?: ResponsiveConfig<'start' | 'center' | 'end'>;
  justify?: ResponsiveConfig<'start' | 'center' | 'end' | 'between' | 'around'>;
  wrap?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  className,
  padding,
  margin,
  direction = { mobile: 'col', tablet: 'col', desktop: 'row' },
  gap = { mobile: '2', tablet: '4', desktop: '6' },
  align,
  justify,
  wrap = true,
  as: Component = 'div',
}) => {
  
  // Get responsive values
  const currentDirection = getResponsiveValue(direction);
  const currentGap = getResponsiveValue(gap);
  const currentPadding = padding ? getResponsiveValue(padding) : undefined;
  const currentMargin = margin ? getResponsiveValue(margin) : undefined;
  const currentAlign = align ? getResponsiveValue(align) : undefined;
  const currentJustify = justify ? getResponsiveValue(justify) : undefined;
  
  // Build class names
  const classes = cn(
    'flex',
    currentDirection === 'row' ? 'flex-row' : 'flex-col',
    `gap-${currentGap}`,
    currentPadding,
    currentMargin,
    currentAlign && `items-${currentAlign}`,
    currentJustify && `justify-${currentJustify}`,
    wrap && 'flex-wrap',
    className
  );
  
  return (
    <Component className={classes}>
      {children}
    </Component>
  );
};

/**
 * ResponsiveGrid Component
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  columns: ResponsiveConfig<number>;
  gap?: ResponsiveConfig<string>;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns,
  gap = { mobile: '4', tablet: '6', desktop: '8' },
  className,
  as: Component = 'div',
}) => {
  const currentColumns = getResponsiveValue(columns);
  const currentGap = getResponsiveValue(gap);
  
  const classes = cn(
    'grid',
    `grid-cols-${currentColumns}`,
    `gap-${currentGap}`,
    className
  );
  
  return (
    <Component className={classes}>
      {children}
    </Component>
  );
};

/**
 * ResponsiveContainer Component
 */
interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: ResponsiveConfig<string>;
  padding?: ResponsiveConfig<string>;
  className?: string;
  center?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = { mobile: 'full', tablet: '4xl', desktop: '6xl' },
  padding = { mobile: 'px-4', tablet: 'px-6', desktop: 'px-8' },
  className,
  center = true,
  as: Component = 'div',
}) => {
  const currentMaxWidth = getResponsiveValue(maxWidth);
  const currentPadding = getResponsiveValue(padding);
  
  const classes = cn(
    `max-w-${currentMaxWidth}`,
    currentPadding,
    center && 'mx-auto',
    className
  );
  
  return (
    <Component className={classes}>
      {children}
    </Component>
  );
};

/**
 * ResponsiveText Component
 */
interface ResponsiveTextProps {
  children: React.ReactNode;
  size?: ResponsiveConfig<string>;
  weight?: ResponsiveConfig<string>;
  color?: string;
  align?: ResponsiveConfig<'left' | 'center' | 'right'>;
  className?: string;
  as?: 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  size = { mobile: 'text-sm', tablet: 'text-base', desktop: 'text-lg' },
  weight,
  color,
  align,
  className,
  as: Component = 'p',
}) => {
  const currentSize = getResponsiveValue(size);
  const currentWeight = weight ? getResponsiveValue(weight) : undefined;
  const currentAlign = align ? getResponsiveValue(align) : undefined;
  
  const classes = cn(
    currentSize,
    currentWeight,
    color,
    currentAlign && `text-${currentAlign}`,
    className
  );
  
  return (
    <Component className={classes}>
      {children}
    </Component>
  );
};

/**
 * ResponsiveShow/Hide Components
 */
interface ResponsiveVisibilityProps {
  children: React.ReactNode;
  on: DeviceType[];
  className?: string;
}

export const ResponsiveShow: React.FC<ResponsiveVisibilityProps> = ({
  children,
  on,
  className,
}) => {
  const device = getDeviceType();
  const shouldShow = on.includes(device);
  
  if (!shouldShow) {
    return null;
  }
  
  return (
    <div className={className}>
      {children}
    </div>
  );
};

export const ResponsiveHide: React.FC<ResponsiveVisibilityProps> = ({
  children,
  on,
  className,
}) => {
  const device = getDeviceType();
  const shouldHide = on.includes(device);
  
  if (shouldHide) {
    return null;
  }
  
  return (
    <div className={className}>
      {children}
    </div>
  );
};

/**
 * ResponsiveBreakpoint Component
 * Renders different content based on breakpoint
 */
interface ResponsiveBreakpointProps {
  mobile?: React.ReactNode;
  tablet?: React.ReactNode;
  desktop?: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ResponsiveBreakpoint: React.FC<ResponsiveBreakpointProps> = ({
  mobile,
  tablet,
  desktop,
  fallback,
}) => {
  const device = getDeviceType();
  
  switch (device) {
    case 'mobile':
      return <>{mobile || fallback}</>;
    case 'tablet':
      return <>{tablet || fallback}</>;
    case 'desktop':
      return <>{desktop || fallback}</>;
    default:
      return <>{fallback}</>;
  }
};

export default ResponsiveLayout;