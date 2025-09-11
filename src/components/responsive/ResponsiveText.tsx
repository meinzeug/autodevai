import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { useBreakpoint, useResponsiveValue, usePrefersReducedMotion, type ResponsiveValue, type Breakpoint } from '../../hooks/useResponsive';

export interface ResponsiveTextProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * HTML element type
   */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div' | 'label' | 'blockquote';
  
  /**
   * Font size for different breakpoints
   */
  size?: ResponsiveValue<'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 
                        'fluid-xs' | 'fluid-sm' | 'fluid-base' | 'fluid-lg' | 'fluid-xl' | 'fluid-2xl' | 'fluid-3xl' | 'fluid-4xl'>;
  
  /**
   * Font weight for different breakpoints
   */
  weight?: ResponsiveValue<'thin' | 'extralight' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black'>;
  
  /**
   * Line height for different breakpoints
   */
  leading?: ResponsiveValue<'none' | 'tight' | 'snug' | 'normal' | 'relaxed' | 'loose'>;
  
  /**
   * Letter spacing for different breakpoints
   */
  tracking?: ResponsiveValue<'tighter' | 'tight' | 'normal' | 'wide' | 'wider' | 'widest'>;
  
  /**
   * Text alignment for different breakpoints
   */
  align?: ResponsiveValue<'left' | 'center' | 'right' | 'justify'>;
  
  /**
   * Text color for different breakpoints
   */
  color?: ResponsiveValue<string>;
  
  /**
   * Text transform for different breakpoints
   */
  transform?: ResponsiveValue<'none' | 'uppercase' | 'lowercase' | 'capitalize'>;
  
  /**
   * Text decoration for different breakpoints
   */
  decoration?: ResponsiveValue<'none' | 'underline' | 'line-through' | 'overline'>;
  
  /**
   * Maximum lines before truncation for different breakpoints
   */
  lines?: ResponsiveValue<number>;
  
  /**
   * Whether to enable fluid typography
   */
  fluid?: boolean;
  
  /**
   * Whether to enable responsive font scaling
   */
  scale?: boolean;
  
  /**
   * Custom font scale factor for different breakpoints
   */
  scaleFactor?: ResponsiveValue<number>;
  
  /**
   * Whether to respect user's reduced motion preference
   */
  respectMotion?: boolean;
  
  /**
   * Custom responsive classes
   */
  responsiveClasses?: Partial<Record<Breakpoint, string>>;
}

/**
 * Font size mapping for responsive text
 */
const FONT_SIZE_MAP = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
  '6xl': 'text-6xl',
  'fluid-xs': 'text-fluid-xs',
  'fluid-sm': 'text-fluid-sm',
  'fluid-base': 'text-fluid-base',
  'fluid-lg': 'text-fluid-lg',
  'fluid-xl': 'text-fluid-xl',
  'fluid-2xl': 'text-fluid-2xl',
  'fluid-3xl': 'text-fluid-3xl',
  'fluid-4xl': 'text-fluid-4xl',
} as const;

/**
 * Font weight mapping
 */
const FONT_WEIGHT_MAP = {
  thin: 'font-thin',
  extralight: 'font-extralight',
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold',
  black: 'font-black',
} as const;

/**
 * Line height mapping
 */
const LINE_HEIGHT_MAP = {
  none: 'leading-none',
  tight: 'leading-tight',
  snug: 'leading-snug',
  normal: 'leading-normal',
  relaxed: 'leading-relaxed',
  loose: 'leading-loose',
} as const;

/**
 * Letter spacing mapping
 */
const LETTER_SPACING_MAP = {
  tighter: 'tracking-tighter',
  tight: 'tracking-tight',
  normal: 'tracking-normal',
  wide: 'tracking-wide',
  wider: 'tracking-wider',
  widest: 'tracking-widest',
} as const;

/**
 * Text alignment mapping
 */
const TEXT_ALIGN_MAP = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
} as const;

/**
 * Text transform mapping
 */
const TEXT_TRANSFORM_MAP = {
  none: 'normal-case',
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  capitalize: 'capitalize',
} as const;

/**
 * Text decoration mapping
 */
const TEXT_DECORATION_MAP = {
  none: 'no-underline',
  underline: 'underline',
  'line-through': 'line-through',
  overline: 'overline',
} as const;

/**
 * A responsive text component that adapts typography based on breakpoints
 */
export const ResponsiveText = forwardRef<HTMLElement, ResponsiveTextProps>(
  ({
    children,
    className,
    as: Component = 'p',
    size = 'base',
    weight = 'normal',
    leading = 'normal',
    tracking = 'normal',
    align = 'left',
    color,
    transform = 'none',
    decoration = 'none',
    lines,
    fluid = false,
    scale = false,
    scaleFactor = 1,
    respectMotion = true,
    responsiveClasses = {},
    ...props
  }, ref) => {
    const breakpoint = useBreakpoint();
    const prefersReducedMotion = usePrefersReducedMotion();
    
    const currentSize = useResponsiveValue(size);
    const currentWeight = useResponsiveValue(weight);
    const currentLeading = useResponsiveValue(leading);
    const currentTracking = useResponsiveValue(tracking);
    const currentAlign = useResponsiveValue(align);
    const currentColor = useResponsiveValue(color);
    const currentTransform = useResponsiveValue(transform);
    const currentDecoration = useResponsiveValue(decoration);
    const currentLines = useResponsiveValue(lines);
    const currentScaleFactor = useResponsiveValue(scaleFactor);
    
    // Build dynamic styles
    const styles: React.CSSProperties = {
      color: currentColor,
      // Scale factor for custom font scaling
      ...(scale && currentScaleFactor !== 1 && {
        fontSize: `calc(1em * ${currentScaleFactor})`,
      }),
      // Line clamping
      ...(currentLines && {
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: currentLines,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }),
    };
    
    // Build classes
    const textClasses = cn(
      'responsive-text',
      
      // Font size classes
      currentSize && (fluid ? `text-fluid-${currentSize}` : FONT_SIZE_MAP[currentSize as keyof typeof FONT_SIZE_MAP]),
      
      // Font weight
      currentWeight && FONT_WEIGHT_MAP[currentWeight],
      
      // Line height
      currentLeading && LINE_HEIGHT_MAP[currentLeading],
      
      // Letter spacing
      currentTracking && LETTER_SPACING_MAP[currentTracking],
      
      // Text alignment
      currentAlign && TEXT_ALIGN_MAP[currentAlign],
      
      // Text transform
      currentTransform && TEXT_TRANSFORM_MAP[currentTransform],
      
      // Text decoration
      currentDecoration && TEXT_DECORATION_MAP[currentDecoration],
      
      // Mobile optimizations
      {
        'text-sm': breakpoint.isMobile && !currentSize,
        'leading-relaxed': breakpoint.isMobile && !currentLeading,
        'tracking-wide': breakpoint.isMobile && !currentTracking,
      },
      
      // Tablet optimizations
      {
        'text-base': breakpoint.isTablet && !currentSize,
        'leading-normal': breakpoint.isTablet && !currentLeading,
      },
      
      // Desktop optimizations
      {
        'text-lg': breakpoint.isDesktop && !currentSize,
        'leading-normal': breakpoint.isDesktop && !currentLeading,
      },
      
      // Motion preferences
      {
        'transition-none': respectMotion && prefersReducedMotion,
        'transition-colors duration-200': !prefersReducedMotion,
      },
      
      // Line clamping classes
      {
        'line-clamp-1': currentLines === 1,
        'line-clamp-2': currentLines === 2,
        'line-clamp-3': currentLines === 3,
        'line-clamp-4': currentLines === 4,
        'line-clamp-5': currentLines === 5,
        'line-clamp-6': currentLines === 6,
      },
      
      // Breakpoint-specific classes
      breakpoint.current && responsiveClasses[breakpoint.current],
      
      className
    );
    
    return (
      <Component
        ref={ref as any}
        className={textClasses}
        style={styles}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

ResponsiveText.displayName = 'ResponsiveText';

/**
 * Predefined text variants for common use cases
 */
export const TextVariants = {
  // Heading variants
  hero: {
    as: 'h1' as const,
    size: { xs: '2xl', sm: '3xl', md: '4xl', lg: '5xl', xl: '6xl' },
    weight: { xs: 'bold', md: 'extrabold' },
    leading: { xs: 'tight', md: 'none' },
    fluid: true,
  },
  
  title: {
    as: 'h2' as const,
    size: { xs: 'xl', sm: '2xl', md: '3xl', lg: '4xl' },
    weight: { xs: 'semibold', md: 'bold' },
    leading: 'tight',
    fluid: true,
  },
  
  subtitle: {
    as: 'h3' as const,
    size: { xs: 'lg', sm: 'xl', md: '2xl' },
    weight: 'semibold',
    leading: 'snug',
  },
  
  heading: {
    as: 'h4' as const,
    size: { xs: 'base', sm: 'lg', md: 'xl' },
    weight: 'medium',
    leading: 'snug',
  },
  
  // Body text variants
  body: {
    as: 'p' as const,
    size: { xs: 'sm', sm: 'base', lg: 'lg' },
    weight: 'normal',
    leading: { xs: 'relaxed', md: 'normal' },
    fluid: true,
  },
  
  bodyLarge: {
    as: 'p' as const,
    size: { xs: 'base', sm: 'lg', md: 'xl' },
    weight: 'normal',
    leading: 'relaxed',
  },
  
  bodySmall: {
    as: 'p' as const,
    size: { xs: 'xs', sm: 'sm' },
    weight: 'normal',
    leading: 'normal',
  },
  
  // Special variants
  caption: {
    as: 'span' as const,
    size: { xs: 'xs', sm: 'sm' },
    weight: 'light',
    leading: 'tight',
    color: 'text-gray-500',
  },
  
  label: {
    as: 'label' as const,
    size: { xs: 'sm', sm: 'base' },
    weight: 'medium',
    leading: 'none',
  },
  
  code: {
    as: 'code' as const,
    size: { xs: 'xs', sm: 'sm' },
    weight: 'normal',
    className: 'font-mono bg-gray-100 px-1 py-0.5 rounded',
  },
  
  quote: {
    as: 'blockquote' as const,
    size: { xs: 'base', sm: 'lg', md: 'xl' },
    weight: { xs: 'normal', md: 'medium' },
    leading: 'relaxed',
    className: 'italic border-l-4 border-gray-300 pl-4',
  },
  
  // Interactive text
  link: {
    as: 'span' as const,
    size: 'base',
    weight: 'medium',
    decoration: 'underline',
    className: 'text-blue-600 hover:text-blue-800 cursor-pointer',
  },
  
  button: {
    as: 'span' as const,
    size: { xs: 'sm', sm: 'base' },
    weight: 'medium',
    leading: 'none',
    tracking: 'wide',
  },
} as const;

/**
 * Pre-built text components for common use cases
 */
export const HeroText = (props: ResponsiveTextProps) => (
  <ResponsiveText {...TextVariants.hero} {...props} />
);

export const TitleText = (props: ResponsiveTextProps) => (
  <ResponsiveText {...TextVariants.title} {...props} />
);

export const SubtitleText = (props: ResponsiveTextProps) => (
  <ResponsiveText {...TextVariants.subtitle} {...props} />
);

export const HeadingText = (props: ResponsiveTextProps) => (
  <ResponsiveText {...TextVariants.heading} {...props} />
);

export const BodyText = (props: ResponsiveTextProps) => (
  <ResponsiveText {...TextVariants.body} {...props} />
);

export const BodyLargeText = (props: ResponsiveTextProps) => (
  <ResponsiveText {...TextVariants.bodyLarge} {...props} />
);

export const BodySmallText = (props: ResponsiveTextProps) => (
  <ResponsiveText {...TextVariants.bodySmall} {...props} />
);

export const CaptionText = (props: ResponsiveTextProps) => (
  <ResponsiveText {...TextVariants.caption} {...props} />
);

export const LabelText = (props: ResponsiveTextProps) => (
  <ResponsiveText {...TextVariants.label} {...props} />
);

export const CodeText = (props: ResponsiveTextProps) => (
  <ResponsiveText {...TextVariants.code} {...props} />
);

export const QuoteText = (props: ResponsiveTextProps) => (
  <ResponsiveText {...TextVariants.quote} {...props} />
);

export const LinkText = (props: ResponsiveTextProps) => (
  <ResponsiveText {...TextVariants.link} {...props} />
);

export const ButtonText = (props: ResponsiveTextProps) => (
  <ResponsiveText {...TextVariants.button} {...props} />
);