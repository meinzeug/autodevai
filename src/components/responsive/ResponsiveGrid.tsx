import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { useBreakpoint, useResponsiveValue, type ResponsiveValue } from '../../hooks/useResponsive';

export interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of columns for different breakpoints
   */
  cols?: ResponsiveValue<number>;
  
  /**
   * Number of rows for different breakpoints
   */
  rows?: ResponsiveValue<number>;
  
  /**
   * Gap between grid items for different breakpoints
   */
  gap?: ResponsiveValue<string | number>;
  
  /**
   * Column gap for different breakpoints
   */
  colGap?: ResponsiveValue<string | number>;
  
  /**
   * Row gap for different breakpoints
   */
  rowGap?: ResponsiveValue<string | number>;
  
  /**
   * Whether to auto-fit columns
   */
  autoFit?: boolean;
  
  /**
   * Minimum column width for auto-fit
   */
  minColWidth?: ResponsiveValue<string>;
  
  /**
   * Maximum column width for auto-fit
   */
  maxColWidth?: ResponsiveValue<string>;
  
  /**
   * Alignment for different breakpoints
   */
  align?: ResponsiveValue<'start' | 'center' | 'end' | 'stretch'>;
  
  /**
   * Justification for different breakpoints
   */
  justify?: ResponsiveValue<'start' | 'center' | 'end' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly'>;
  
  /**
   * Whether to enable masonry layout on supported breakpoints
   */
  masonry?: ResponsiveValue<boolean>;
  
  /**
   * Custom grid template for different breakpoints
   */
  template?: ResponsiveValue<string>;
  
  /**
   * Whether to stack items on mobile
   */
  stackOnMobile?: boolean;
  
  /**
   * Whether to make items equal height
   */
  equalHeight?: boolean;
}

/**
 * A responsive grid component that adapts columns, gaps, and layout
 * based on the current breakpoint
 */
export const ResponsiveGrid = forwardRef<HTMLDivElement, ResponsiveGridProps>(
  ({
    children,
    className,
    cols = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5, '2xl': 6 },
    rows,
    gap = { xs: '1rem', sm: '1.5rem', md: '2rem', lg: '2rem' },
    colGap,
    rowGap,
    autoFit = false,
    minColWidth = { xs: '250px', sm: '280px', md: '300px' },
    maxColWidth = '1fr',
    align = 'stretch',
    justify = 'start',
    masonry = false,
    template,
    stackOnMobile = true,
    equalHeight = false,
    ...props
  }, ref) => {
    const breakpoint = useBreakpoint();
    // Grid configuration handled via responsive values
    
    const currentCols = useResponsiveValue(cols);
    const currentRows = useResponsiveValue(rows);
    const currentGap = useResponsiveValue(gap);
    const currentColGap = useResponsiveValue(colGap);
    const currentRowGap = useResponsiveValue(rowGap);
    const currentMinColWidth = useResponsiveValue(minColWidth);
    const currentMaxColWidth = useResponsiveValue(maxColWidth);
    const currentAlign = useResponsiveValue(align);
    const currentJustify = useResponsiveValue(justify);
    const currentMasonry = useResponsiveValue(masonry);
    const currentTemplate = useResponsiveValue(template);
    
    // Build grid template
    let gridTemplateColumns: string;
    
    if (currentTemplate) {
      gridTemplateColumns = currentTemplate;
    } else if (autoFit) {
      gridTemplateColumns = `repeat(auto-fit, minmax(${currentMinColWidth}, ${currentMaxColWidth}))`;
    } else if (stackOnMobile && breakpoint.isMobile) {
      gridTemplateColumns = '1fr';
    } else {
      gridTemplateColumns = `repeat(${currentCols}, 1fr)`;
    }
    
    const gridTemplateRows = currentRows ? `repeat(${currentRows}, auto)` : 'auto';
    
    // Build styles
    const styles: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns,
      gridTemplateRows,
      gap: currentGap,
      columnGap: currentColGap,
      rowGap: currentRowGap,
      alignItems: currentAlign,
      justifyContent: currentJustify,
      // Masonry layout for supported browsers
      ...(currentMasonry && {
        gridTemplateRows: 'masonry',
      }),
      // Equal height items
      ...(equalHeight && {
        alignItems: 'stretch',
      }),
    };
    
    // Build classes
    const gridClasses = cn(
      'responsive-grid',
      
      // Mobile optimizations
      {
        'grid-cols-1': stackOnMobile && breakpoint.isMobile,
        'gap-4': breakpoint.isMobile && !currentGap,
      },
      
      // Tablet optimizations
      {
        'gap-6': breakpoint.isTablet && !currentGap,
      },
      
      // Desktop optimizations
      {
        'gap-8': breakpoint.isDesktop && !currentGap,
      },
      
      // Auto-fit classes
      {
        'grid-cols-auto-fit': autoFit,
      },
      
      // Masonry classes
      {
        'masonry': currentMasonry,
      },
      
      className
    );
    
    return (
      <div
        ref={ref}
        className={gridClasses}
        style={styles}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsiveGrid.displayName = 'ResponsiveGrid';

/**
 * Grid item component with responsive spanning capabilities
 */
export interface ResponsiveGridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Column span for different breakpoints
   */
  colSpan?: ResponsiveValue<number>;
  
  /**
   * Row span for different breakpoints
   */
  rowSpan?: ResponsiveValue<number>;
  
  /**
   * Column start position for different breakpoints
   */
  colStart?: ResponsiveValue<number>;
  
  /**
   * Row start position for different breakpoints
   */
  rowStart?: ResponsiveValue<number>;
  
  /**
   * Column end position for different breakpoints
   */
  colEnd?: ResponsiveValue<number>;
  
  /**
   * Row end position for different breakpoints
   */
  rowEnd?: ResponsiveValue<number>;
  
  /**
   * Self alignment for different breakpoints
   */
  alignSelf?: ResponsiveValue<'auto' | 'start' | 'center' | 'end' | 'stretch'>;
  
  /**
   * Self justification for different breakpoints
   */
  justifySelf?: ResponsiveValue<'auto' | 'start' | 'center' | 'end' | 'stretch'>;
}

export const ResponsiveGridItem = forwardRef<HTMLDivElement, ResponsiveGridItemProps>(
  ({
    children,
    className,
    colSpan,
    rowSpan,
    colStart,
    rowStart,
    colEnd,
    rowEnd,
    alignSelf,
    justifySelf,
    ...props
  }, ref) => {
    const breakpoint = useBreakpoint();
    
    const currentColSpan = useResponsiveValue(colSpan);
    const currentRowSpan = useResponsiveValue(rowSpan);
    const currentColStart = useResponsiveValue(colStart);
    const currentRowStart = useResponsiveValue(rowStart);
    const currentColEnd = useResponsiveValue(colEnd);
    const currentRowEnd = useResponsiveValue(rowEnd);
    const currentAlignSelf = useResponsiveValue(alignSelf);
    const currentJustifySelf = useResponsiveValue(justifySelf);
    
    const styles: React.CSSProperties = {
      gridColumn: currentColSpan ? `span ${currentColSpan}` : 
                  currentColStart || currentColEnd ? 
                  `${currentColStart || 'auto'} / ${currentColEnd || 'auto'}` : undefined,
      gridRow: currentRowSpan ? `span ${currentRowSpan}` : 
               currentRowStart || currentRowEnd ? 
               `${currentRowStart || 'auto'} / ${currentRowEnd || 'auto'}` : undefined,
      alignSelf: currentAlignSelf,
      justifySelf: currentJustifySelf,
    };
    
    const itemClasses = cn(
      'responsive-grid-item',
      
      // Mobile-first span classes
      {
        'col-span-1': breakpoint.isMobile && !currentColSpan,
      },
      
      className
    );
    
    return (
      <div
        ref={ref}
        className={itemClasses}
        style={styles}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsiveGridItem.displayName = 'ResponsiveGridItem';

/**
 * Predefined grid layouts for common use cases
 */
export const GridVariants = {
  // Card grid
  cards: {
    cols: { xs: 1, sm: 2, lg: 3, xl: 4 },
    gap: { xs: '1rem', sm: '1.5rem', md: '2rem' },
    equalHeight: true,
  },
  
  // Product grid
  products: {
    cols: { xs: 2, sm: 3, md: 4, lg: 5, xl: 6 },
    gap: { xs: '0.75rem', sm: '1rem', md: '1.5rem' },
    autoFit: true,
    minColWidth: { xs: '120px', sm: '160px', md: '200px' },
  },
  
  // Article grid
  articles: {
    cols: { xs: 1, md: 2, xl: 3 },
    gap: { xs: '1.5rem', md: '2rem', lg: '2.5rem' },
    equalHeight: false,
  },
  
  // Dashboard grid
  dashboard: {
    cols: { xs: 1, sm: 2, lg: 3, xl: 4 },
    gap: { xs: '1rem', sm: '1.5rem' },
    rows: { lg: 2, xl: 3 },
    equalHeight: true,
  },
  
  // Gallery grid
  gallery: {
    cols: { xs: 2, sm: 3, md: 4, lg: 5, xl: 6 },
    gap: { xs: '0.25rem', sm: '0.5rem', md: '0.75rem' },
    masonry: { md: true },
  },
  
  // Form grid
  form: {
    cols: { xs: 1, md: 2 },
    gap: { xs: '1rem', md: '1.5rem' },
    align: 'start',
  },
  
  // Feature grid
  features: {
    cols: { xs: 1, sm: 2, lg: 3 },
    gap: { xs: '2rem', sm: '2.5rem', lg: '3rem' },
    equalHeight: true,
  },
} as const;

/**
 * Pre-built grid components for common use cases
 */
export const CardGrid = (props: ResponsiveGridProps) => (
  <ResponsiveGrid {...GridVariants.cards} {...props} />
);

export const ProductGrid = (props: ResponsiveGridProps) => (
  <ResponsiveGrid {...GridVariants.products} {...props} />
);

export const ArticleGrid = (props: ResponsiveGridProps) => (
  <ResponsiveGrid {...GridVariants.articles} {...props} />
);

export const DashboardGrid = (props: ResponsiveGridProps) => (
  <ResponsiveGrid {...GridVariants.dashboard} {...props} />
);

export const GalleryGrid = (props: ResponsiveGridProps) => (
  <ResponsiveGrid {...GridVariants.gallery} {...props} />
);

export const FormGrid = (props: ResponsiveGridProps) => (
  <ResponsiveGrid {...GridVariants.form} {...props} />
);

export const FeatureGrid = (props: ResponsiveGridProps) => (
  <ResponsiveGrid {...GridVariants.features} {...props} />
);