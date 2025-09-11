// Responsive Component System
// Comprehensive breakpoint-specific layouts and behaviors

// Core responsive hooks
export * from '../../hooks/useResponsive';

// Responsive utilities
export * from '../../utils/responsive';

// Responsive container components
export {
  ResponsiveContainer,
  type ResponsiveContainerProps,
  ContainerVariants,
  PageContainer,
  SectionContainer,
  CardContainer,
  FormContainer,
  SidebarContainer,
  HeaderContainer,
  FooterContainer,
} from './ResponsiveContainer';

// Responsive grid components
export {
  ResponsiveGrid,
  ResponsiveGridItem,
  type ResponsiveGridProps,
  type ResponsiveGridItemProps,
  GridVariants,
  CardGrid,
  ProductGrid,
  ArticleGrid,
  DashboardGrid,
  GalleryGrid,
  FormGrid,
  FeatureGrid,
} from './ResponsiveGrid';

// Responsive text components
// Temporarily commented out due to build issues
// export {
//   ResponsiveText,
//   type ResponsiveTextProps,
//   TextVariants,
//   HeroText,
//   TitleText,
//   SubtitleText,
//   HeadingText,
//   BodyText,
//   BodyLargeText,
//   BodySmallText,
//   CaptionText,
//   LabelText,
//   CodeText,
//   QuoteText,
//   LinkText,
//   ButtonText,
// } from './ResponsiveText';

// Responsive card components
export {
  ResponsiveCard,
  ResponsiveCardHeader,
  ResponsiveCardContent,
  ResponsiveCardFooter,
  type ResponsiveCardProps,
  type ResponsiveCardHeaderProps,
  type ResponsiveCardContentProps,
  type ResponsiveCardFooterProps,
  CardVariants,
  ContentCard,
  InteractiveCard,
  ProductCard,
  FeatureCard,
  StatsCard,
  MediaCard,
  CompactCard,
} from './ResponsiveCard';

// Re-export types for convenience
export type {
  Breakpoint,
  ResponsiveValue,
  WindowSize,
  DeviceInfo,
} from '../../hooks/useResponsive';