import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { useBreakpoint, useResponsiveValue, useDeviceInfo, type ResponsiveValue, type Breakpoint } from '../../hooks/useResponsive';

export interface ResponsiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Card variant for different breakpoints
   */
  variant?: ResponsiveValue<'default' | 'outline' | 'ghost' | 'elevated' | 'flat' | 'bordered'>;
  
  /**
   * Card size for different breakpoints
   */
  size?: ResponsiveValue<'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'auto'>;
  
  /**
   * Padding for different breakpoints
   */
  padding?: ResponsiveValue<string>;
  
  /**
   * Border radius for different breakpoints
   */
  radius?: ResponsiveValue<'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'>;
  
  /**
   * Shadow intensity for different breakpoints
   */
  shadow?: ResponsiveValue<'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>;
  
  /**
   * Background color for different breakpoints
   */
  background?: ResponsiveValue<string>;
  
  /**
   * Border color for different breakpoints
   */
  borderColor?: ResponsiveValue<string>;
  
  /**
   * Whether the card is clickable/interactive
   */
  interactive?: boolean;
  
  /**
   * Whether the card should have hover effects
   */
  hoverable?: boolean;
  
  /**
   * Whether the card should be focusable
   */
  focusable?: boolean;
  
  /**
   * Card orientation for different breakpoints
   */
  orientation?: ResponsiveValue<'vertical' | 'horizontal'>;
  
  /**
   * Whether to enable glass morphism effect
   */
  glass?: boolean;
  
  /**
   * Whether to adapt to device type (touch optimizations)
   */
  adaptive?: boolean;
  
  /**
   * Custom responsive classes
   */
  responsiveClasses?: Partial<Record<Breakpoint, string>>;
  
  /**
   * Custom aspect ratio for different breakpoints
   */
  aspectRatio?: ResponsiveValue<'square' | 'video' | 'portrait' | 'landscape' | 'auto'>;
  
  /**
   * Whether the card should fill its container height
   */
  fillHeight?: ResponsiveValue<boolean>;
  
  /**
   * Whether to enable compact mode on mobile
   */
  compact?: boolean;
}

/**
 * Variant class mappings
 */
const VARIANT_MAP = {
  default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm',
  outline: 'bg-transparent border-2 border-gray-300 dark:border-gray-600 shadow-none',
  ghost: 'bg-gray-50/50 dark:bg-gray-900/50 border border-transparent shadow-none',
  elevated: 'bg-white dark:bg-gray-800 border-none shadow-lg',
  flat: 'bg-gray-100 dark:bg-gray-900 border-none shadow-none',
  bordered: 'bg-white dark:bg-gray-800 border-2 border-gray-400 dark:border-gray-600 shadow-none',
} as const;

/**
 * Size class mappings
 */
const SIZE_MAP = {
  xs: 'p-3',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10',
  auto: '',
} as const;

/**
 * Border radius class mappings
 */
const RADIUS_MAP = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
} as const;

/**
 * Shadow class mappings
 */
const SHADOW_MAP = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
} as const;

/**
 * Aspect ratio class mappings
 */
const ASPECT_RATIO_MAP = {
  square: 'aspect-square',
  video: 'aspect-video',
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
  auto: '',
} as const;

/**
 * A responsive card component that adapts its appearance and behavior
 * based on the current breakpoint and device type
 */
export const ResponsiveCard = forwardRef<HTMLDivElement, ResponsiveCardProps>(
  ({
    children,
    className,
    variant = 'default',
    size = { xs: 'sm', sm: 'md', md: 'md', lg: 'lg' },
    padding,
    radius = { xs: 'md', sm: 'lg' },
    shadow = { xs: 'sm', sm: 'md', md: 'lg' },
    background,
    borderColor,
    interactive = false,
    hoverable = true,
    focusable = false,
    orientation = 'vertical',
    glass = false,
    adaptive = true,
    responsiveClasses = {},
    aspectRatio = 'auto',
    fillHeight = false,
    compact = true,
    ...props
  }, ref) => {
    const breakpoint = useBreakpoint();
    const deviceInfo = useDeviceInfo();
    
    const currentVariant = useResponsiveValue(variant);
    const currentSize = useResponsiveValue(size);
    const currentPadding = useResponsiveValue(padding);
    const currentRadius = useResponsiveValue(radius);
    const currentShadow = useResponsiveValue(shadow);
    const currentBackground = useResponsiveValue(background);
    const currentBorderColor = useResponsiveValue(borderColor);
    const currentOrientation = useResponsiveValue(orientation);
    const currentAspectRatio = useResponsiveValue(aspectRatio);
    const currentFillHeight = useResponsiveValue(fillHeight);
    
    // Build dynamic styles
    const styles: React.CSSProperties = {
      backgroundColor: currentBackground,
      borderColor: currentBorderColor,
      padding: currentPadding,
      // Fill height if specified
      ...(currentFillHeight && {
        height: '100%',
        minHeight: '100%',
      }),
    };
    
    // Build classes
    const cardClasses = cn(
      'responsive-card',
      'transition-all duration-200',
      
      // Base variant styles
      currentVariant && VARIANT_MAP[currentVariant],
      
      // Size/padding
      !currentPadding && currentSize && SIZE_MAP[currentSize],
      
      // Border radius
      currentRadius && RADIUS_MAP[currentRadius],
      
      // Shadow
      currentShadow && SHADOW_MAP[currentShadow],
      
      // Aspect ratio
      currentAspectRatio && ASPECT_RATIO_MAP[currentAspectRatio],
      
      // Orientation classes
      {
        'flex': currentOrientation === 'horizontal',
        'flex-col': currentOrientation === 'horizontal' && breakpoint.isMobile,
        'flex-row': currentOrientation === 'horizontal' && !breakpoint.isMobile,
      },
      
      // Interactive states
      {
        'cursor-pointer': interactive,
        'hover:shadow-lg hover:scale-[1.02]': hoverable && !deviceInfo.isTouch && interactive,
        'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900': focusable,
        'active:scale-[0.98]': interactive && deviceInfo.isTouch,
      },
      
      // Glass morphism effect
      {
        'backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/20': glass,
      },
      
      // Mobile optimizations
      {
        'p-3': compact && breakpoint.isMobile && !currentPadding && !currentSize,
        'rounded-lg': breakpoint.isMobile && !currentRadius,
        'shadow-sm': breakpoint.isMobile && !currentShadow,
        // Touch optimizations
        'min-h-[44px]': adaptive && deviceInfo.isTouch && interactive,
        'touch-manipulation': adaptive && deviceInfo.isTouch,
      },
      
      // Tablet optimizations
      {
        'p-5': breakpoint.isTablet && !currentPadding && !currentSize,
        'rounded-xl': breakpoint.isTablet && !currentRadius,
        'shadow-md': breakpoint.isTablet && !currentShadow,
      },
      
      // Desktop optimizations
      {
        'p-6': breakpoint.isDesktop && !currentPadding && !currentSize,
        'rounded-xl': breakpoint.isDesktop && !currentRadius,
        'shadow-lg': breakpoint.isDesktop && !currentShadow,
        'hover:shadow-xl': breakpoint.isDesktop && hoverable && !deviceInfo.isTouch,
      },
      
      // Fill height classes
      {
        'h-full min-h-full': currentFillHeight,
      },
      
      // Breakpoint-specific classes
      breakpoint.current && responsiveClasses[breakpoint.current],
      
      className
    );
    
    return (
      <div
        ref={ref}
        className={cardClasses}
        style={styles}
        tabIndex={focusable ? 0 : undefined}
        role={interactive ? 'button' : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsiveCard.displayName = 'ResponsiveCard';

/**
 * Card header component
 */
export interface ResponsiveCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to add bottom border
   */
  bordered?: boolean;
  
  /**
   * Padding for different breakpoints
   */
  padding?: ResponsiveValue<string>;
}

export const ResponsiveCardHeader = forwardRef<HTMLDivElement, ResponsiveCardHeaderProps>(
  ({
    children,
    className,
    bordered = false,
    padding,
    ...props
  }, ref) => {
    const breakpoint = useBreakpoint();
    const currentPadding = useResponsiveValue(padding);
    
    const headerClasses = cn(
      'responsive-card-header',
      {
        'border-b border-gray-200 dark:border-gray-700': bordered,
        'pb-3': bordered && breakpoint.isMobile,
        'pb-4': bordered && breakpoint.isTablet,
        'pb-5': bordered && breakpoint.isDesktop,
      },
      className
    );
    
    const styles: React.CSSProperties = {
      padding: currentPadding,
    };
    
    return (
      <div
        ref={ref}
        className={headerClasses}
        style={styles}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsiveCardHeader.displayName = 'ResponsiveCardHeader';

/**
 * Card content component
 */
export interface ResponsiveCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Padding for different breakpoints
   */
  padding?: ResponsiveValue<string>;
  
  /**
   * Whether to add scroll on overflow
   */
  scrollable?: boolean;
}

export const ResponsiveCardContent = forwardRef<HTMLDivElement, ResponsiveCardContentProps>(
  ({
    children,
    className,
    padding,
    scrollable = false,
    ...props
  }, ref) => {
    const currentPadding = useResponsiveValue(padding);
    
    const contentClasses = cn(
      'responsive-card-content',
      'flex-1',
      {
        'overflow-y-auto': scrollable,
      },
      className
    );
    
    const styles: React.CSSProperties = {
      padding: currentPadding,
    };
    
    return (
      <div
        ref={ref}
        className={contentClasses}
        style={styles}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsiveCardContent.displayName = 'ResponsiveCardContent';

/**
 * Card footer component
 */
export interface ResponsiveCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to add top border
   */
  bordered?: boolean;
  
  /**
   * Padding for different breakpoints
   */
  padding?: ResponsiveValue<string>;
  
  /**
   * Footer alignment for different breakpoints
   */
  align?: ResponsiveValue<'left' | 'center' | 'right' | 'between' | 'around'>;
}

export const ResponsiveCardFooter = forwardRef<HTMLDivElement, ResponsiveCardFooterProps>(
  ({
    children,
    className,
    bordered = false,
    padding,
    align = 'left',
    ...props
  }, ref) => {
    const breakpoint = useBreakpoint();
    const currentPadding = useResponsiveValue(padding);
    const currentAlign = useResponsiveValue(align);
    
    const alignClasses = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
    };
    
    const footerClasses = cn(
      'responsive-card-footer',
      'flex items-center',
      alignClasses[currentAlign || 'left'],
      {
        'border-t border-gray-200 dark:border-gray-700': bordered,
        'pt-3': bordered && breakpoint.isMobile,
        'pt-4': bordered && breakpoint.isTablet,
        'pt-5': bordered && breakpoint.isDesktop,
      },
      className
    );
    
    const styles: React.CSSProperties = {
      padding: currentPadding,
    };
    
    return (
      <div
        ref={ref}
        className={footerClasses}
        style={styles}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsiveCardFooter.displayName = 'ResponsiveCardFooter';

/**
 * Predefined card variants for common use cases
 */
export const CardVariants = {
  // Basic content card
  content: {
    variant: 'default',
    size: { xs: 'sm', sm: 'md', lg: 'lg' },
    radius: 'lg',
    hoverable: false,
  },
  
  // Interactive card (clickable)
  interactive: {
    variant: 'default',
    size: { xs: 'sm', md: 'md' },
    interactive: true,
    hoverable: true,
    focusable: true,
  },
  
  // Product card
  product: {
    variant: 'default',
    size: { xs: 'xs', sm: 'sm', md: 'md' },
    interactive: true,
    hoverable: true,
    aspectRatio: 'portrait',
  },
  
  // Feature card
  feature: {
    variant: 'elevated',
    size: { xs: 'md', lg: 'lg' },
    radius: 'xl',
    fillHeight: true,
  },
  
  // Stats card
  stats: {
    variant: 'outline',
    size: { xs: 'sm', md: 'md' },
    orientation: { xs: 'vertical', md: 'horizontal' },
  },
  
  // Media card
  media: {
    variant: 'default',
    padding: '0',
    radius: 'lg',
    aspectRatio: 'video',
  },
  
  // Compact card (mobile-first)
  compact: {
    variant: 'ghost',
    size: { xs: 'xs', sm: 'sm' },
    radius: 'md',
    compact: true,
  },
} as const;

/**
 * Pre-built card components for common use cases
 */
export const ContentCard = (props: ResponsiveCardProps) => (
  <ResponsiveCard {...CardVariants.content} {...props} />
);

export const InteractiveCard = (props: ResponsiveCardProps) => (
  <ResponsiveCard {...CardVariants.interactive} {...props} />
);

export const ProductCard = (props: ResponsiveCardProps) => (
  <ResponsiveCard {...CardVariants.product} {...props} />
);

export const FeatureCard = (props: ResponsiveCardProps) => (
  <ResponsiveCard {...CardVariants.feature} {...props} />
);

export const StatsCard = (props: ResponsiveCardProps) => (
  <ResponsiveCard {...CardVariants.stats} {...props} />
);

export const MediaCard = (props: ResponsiveCardProps) => (
  <ResponsiveCard {...CardVariants.media} {...props} />
);

export const CompactCard = (props: ResponsiveCardProps) => (
  <ResponsiveCard {...CardVariants.compact} {...props} />
);