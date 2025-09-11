# Responsive Header and Navigation System

## Overview

This implementation provides a comprehensive responsive header and navigation system for AutoDevAI with:

- **Mobile-first responsive design**
- **Touch-friendly interactions**
- **Full accessibility support**
- **Smooth animations and transitions**
- **Body scroll lock for mobile menus**
- **Focus management and keyboard navigation**

## Components Implemented

### 1. Enhanced Header Component (`src/components/Header.tsx`)

**Features:**
- Responsive logo sizing (6x6 → 8x8 → 10x10)
- Collapsible mobile actions menu
- Smart status indicator placement
- Touch-friendly tap targets (min 44px)
- Hamburger menu for mobile navigation

**Breakpoints:**
- `< 640px` (sm): Compact layout, truncated title
- `640px - 767px` (md): Medium layout with subtitle
- `768px - 1023px` (lg): Status indicators move to mobile section
- `≥ 1024px` (xl): Full desktop layout

### 2. Enhanced Sidebar Component (`src/components/Sidebar.tsx`)

**Features:**
- Mobile drawer with overlay and backdrop
- Swipe gestures for mobile (swipe left to close)
- Search functionality for navigation items
- Collapsible nested navigation
- Focus trap for accessibility
- Auto-close on navigation (mobile)

**Responsive behavior:**
- Mobile: Full-width overlay drawer
- Tablet: 240px width
- Desktop: 256px width with persistent visibility

### 3. Layout Components

#### Header Layout (`src/components/layout/Header.tsx`)
- Modernized version with Lucide icons
- Mobile actions dropdown
- Theme toggle integration

#### Sidebar Layout (`src/components/layout/Sidebar.tsx`)
- Search-enabled navigation
- Active state indicators
- Footer information

### 4. Hooks

#### `useMobileMenu` (`src/hooks/useMobileMenu.ts`)
- Menu state management
- Body scroll lock
- Escape key handling
- Auto-close on desktop resize

#### `useSwipeGesture`
- Touch gesture detection
- Configurable swipe distance (50px)
- Left/right swipe handlers

#### `useFocusTrap`
- Keyboard navigation management
- Tab cycling within modal
- Auto-focus first element

### 5. Utilities

#### Responsive Utilities (`src/utils/responsive.ts`)
- Touch target sizes
- Responsive spacing scales
- Animation classes
- Focus styles
- Grid layouts
- Safe area insets

#### Class Name Utility (`src/utils/cn.ts`)
- Tailwind class merging
- Conflict resolution
- Conditional classes

## Usage Examples

### Basic Layout
```tsx
import { ResponsiveLayout } from './components/ResponsiveLayout';

function App() {
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'projects', label: 'Projects', icon: '📁' },
  ];

  const statusIndicators = [
    { label: 'API', status: 'online' as const },
    { label: 'DB', status: 'online' as const },
  ];

  return (
    <ResponsiveLayout
      title="AutoDevAI"
      navigationItems={navigationItems}
      statusIndicators={statusIndicators}
    >
      <div className="p-6">
        <h1>Main Content</h1>
      </div>
    </ResponsiveLayout>
  );
}
```

### Custom Header with Actions
```tsx
<Header
  title="AutoDevAI"
  statusIndicators={indicators}
  onMenuClick={openMobileMenu}
>
  <button className="btn-primary">New Project</button>
  <button className="btn-ghost">Settings</button>
</Header>
```

### Sidebar with Footer
```tsx
<Sidebar
  isOpen={isMenuOpen}
  onClose={closeMenu}
  navigationItems={items}
>
  <div className="space-y-2">
    <button className="w-full btn-secondary">Sign Out</button>
    <button className="w-full btn-ghost">Help</button>
  </div>
</Sidebar>
```

## Responsive Features

### Breakpoint Strategy
- **Mobile First**: Base styles target mobile devices
- **Progressive Enhancement**: Larger screens get enhanced features
- **Touch Friendly**: All interactive elements meet 44px minimum

### Animation System
- Smooth 300ms transitions
- Reduced motion support
- Hardware acceleration where appropriate
- Backdrop blur effects

### Accessibility
- **Keyboard Navigation**: Full tab support with focus trapping
- **Screen Readers**: Proper ARIA labels and roles
- **High Contrast**: Support for system preferences
- **Focus Management**: Visible focus indicators

## Browser Support

- **Modern Browsers**: Chrome 91+, Firefox 90+, Safari 14+
- **Mobile**: iOS Safari 14+, Chrome Mobile 91+
- **Features**: CSS Grid, Flexbox, Custom Properties, backdrop-filter

## Performance

- **Minimal JavaScript**: Only loads required functionality
- **Tree Shaking**: Unused utilities automatically removed
- **Lazy Loading**: Menu state hooks only active when needed
- **Optimized Animations**: Uses transform and opacity for 60fps

## Customization

### Responsive Breakpoints
```tsx
// Custom breakpoints
const breakpoints = {
  tablet: '(min-width: 768px)',
  desktop: '(min-width: 1200px)',
};

const isTablet = useMediaQuery(breakpoints.tablet);
```

### Touch Targets
```tsx
// Custom touch targets
import { touchTarget } from '../utils/responsive';

<button className={touchTarget.lg}>Large Target</button>
```

### Spacing
```tsx
import { responsivePadding } from '../utils/responsive';

<div className={responsivePadding.md}>Responsive Padding</div>
```

## Testing

### Manual Testing Checklist
- [ ] Menu opens/closes on hamburger click
- [ ] Swipe gestures work on mobile
- [ ] Body scroll locks when menu open
- [ ] Search filters navigation items
- [ ] Escape key closes mobile menu
- [ ] Focus trap works in mobile menu
- [ ] Status indicators show/hide responsively
- [ ] Logo resizes appropriately
- [ ] Touch targets meet 44px minimum

### Responsive Testing
- [ ] Mobile (320px - 767px)
- [ ] Tablet (768px - 1023px)  
- [ ] Desktop (1024px+)
- [ ] Orientation changes
- [ ] System theme changes

## File Structure

```
src/
├── components/
│   ├── Header.tsx (Enhanced main header)
│   ├── Sidebar.tsx (Enhanced main sidebar)
│   ├── ResponsiveLayout.tsx (Complete layout wrapper)
│   └── layout/
│       ├── Header.tsx (Layout-specific header)
│       └── Sidebar.tsx (Layout-specific sidebar)
├── hooks/
│   ├── useMobileMenu.ts (Menu state management)
│   └── useMediaQuery.ts (Responsive queries)
├── utils/
│   ├── responsive.ts (Responsive utilities)
│   └── cn.ts (Class name utilities)
└── types/
    └── index.ts (TypeScript definitions)
```

This system provides a solid foundation for responsive navigation while maintaining excellent performance and accessibility standards.