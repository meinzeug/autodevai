import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useMobileMenu } from '../hooks/useMobileMenu';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { cn } from '../utils/cn';
// import { responsiveContainer, focusStyles } from '../utils/responsive';
import type { NavigationItem, StatusIndicator } from '../types';

interface ResponsiveLayoutProps {
  title?: string;
  navigationItems?: NavigationItem[];
  statusIndicators?: StatusIndicator[];
  headerActions?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Responsive layout component that provides a complete responsive header and sidebar system
 * Automatically handles mobile/desktop transitions, keyboard navigation, and accessibility
 */
export function ResponsiveLayout({
  title = 'AutoDevAI',
  navigationItems = [],
  statusIndicators = [],
  headerActions,
  sidebarFooter,
  children,
  className = '',
}: ResponsiveLayoutProps) {
  const { isOpen, isMobile, openMenu, closeMenu } = useMobileMenu();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Auto-open sidebar on desktop
  useEffect(() => {
    if (isDesktop && !isOpen) {
      openMenu();
    }
  }, [isDesktop, isOpen, openMenu]);

  return (
    <div className={cn('h-screen flex flex-col overflow-hidden', className)}>
      {/* Header */}
      <Header
        title={title}
        statusIndicators={statusIndicators}
        onMenuClick={isMobile ? openMenu : () => {}}
        className="shrink-0"
      >
        {headerActions}
      </Header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          isOpen={isOpen}
          onClose={closeMenu}
          navigationItems={navigationItems}
          className={cn(
            'shrink-0',
            // Desktop: always visible, mobile: overlay
            !isMobile && isOpen && 'relative',
            isMobile && 'fixed inset-y-0 left-0 z-50'
          )}
        >
          {sidebarFooter}
        </Sidebar>

        {/* Main Content */}
        <main
          className={cn(
            'flex-1 overflow-auto',
            'w-full h-full', // responsiveContainer.full replacement
            'focus:outline-none', // focusStyles.default replacement
            // Add left margin on desktop when sidebar is open
            !isMobile && isOpen && 'ml-0'
          )}
          role="main"
          tabIndex={-1}
        >
          <div className="h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}

/**
 * Hook for managing responsive layout state
 */
export function useResponsiveLayout() {
  const { isOpen, isMobile, isDesktop, openMenu, closeMenu, toggleMenu } = useMobileMenu();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const collapseSidebar = () => setSidebarCollapsed(true);
  const expandSidebar = () => setSidebarCollapsed(false);
  const toggleSidebarCollapse = () => setSidebarCollapsed(prev => !prev);

  return {
    // Mobile menu state
    isOpen,
    isMobile,
    isDesktop,
    openMenu,
    closeMenu,
    toggleMenu,

    // Desktop sidebar collapse state
    sidebarCollapsed,
    collapseSidebar,
    expandSidebar,
    toggleSidebarCollapse,

    // Combined state helpers
    sidebarVisible: isOpen && !sidebarCollapsed,
    sidebarWidth: sidebarCollapsed ? 'w-16' : 'w-64',
  };
}

export default ResponsiveLayout;
