import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

type LayoutMode = 'mobile' | 'tablet' | 'desktop';

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  className,
  sidebar,
  header,
  footer
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Responsive breakpoint detection
  const isMobile = useMediaQuery('(max-width: 639px)');
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  
  const layoutMode: LayoutMode = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Desktop always shows sidebar
  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(true);
    }
  }, [isDesktop]);

  return (
    <div className={cn(
      "h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-white overflow-hidden flex flex-col",
      className
    )}>
      {/* Header */}
      {header && (
        <div className="sticky top-0 z-50 flex-shrink-0">
          {React.cloneElement(header as React.ReactElement, {
            layoutMode,
            onMenuClick: () => setSidebarOpen(!sidebarOpen),
            sidebarOpen
          })}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Responsive Implementation */}
        {sidebar && (
          <>
            {/* Mobile: Full-screen overlay drawer */}
            {layoutMode === 'mobile' && (
              <>
                {/* Backdrop */}
                {sidebarOpen && (
                  <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    onClick={() => setSidebarOpen(false)}
                  />
                )}
                
                {/* Drawer */}
                <aside className={cn(
                  "fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-800 shadow-2xl z-50 transition-transform duration-300 ease-in-out",
                  sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                  {React.cloneElement(sidebar as React.ReactElement, {
                    layoutMode,
                    isOpen: sidebarOpen,
                    onClose: () => setSidebarOpen(false)
                  })}
                </aside>
              </>
            )}

            {/* Tablet: Overlay sidebar */}
            {layoutMode === 'tablet' && (
              <>
                {sidebarOpen && (
                  <div
                    className="fixed inset-0 bg-black/30 z-30"
                    onClick={() => setSidebarOpen(false)}
                  />
                )}
                <aside className={cn(
                  "fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg z-40 transition-transform duration-300 ease-in-out",
                  sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                  {React.cloneElement(sidebar as React.ReactElement, {
                    layoutMode,
                    isOpen: sidebarOpen,
                    onClose: () => setSidebarOpen(false)
                  })}
                </aside>
              </>
            )}

            {/* Desktop: Fixed sidebar */}
            {layoutMode === 'desktop' && (
              <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm">
                {React.cloneElement(sidebar as React.ReactElement, {
                  layoutMode,
                  isOpen: true,
                  onClose: undefined
                })}
              </aside>
            )}
          </>
        )}

        {/* Content Area */}
        <main className={cn(
          "flex-1 flex flex-col min-w-0 overflow-hidden",
          // Adjust content based on layout mode and sidebar state
          layoutMode === 'desktop' && sidebar && "ml-0" // No margin needed as sidebar is fixed
        )}>
          <div className={cn(
            "flex-1 overflow-y-auto",
            // Mobile: Single column with padding
            "p-3",
            // Tablet: Two column potential with more padding
            "sm:p-4 md:p-6",
            // Desktop: Multi-column with generous spacing
            "lg:p-6 xl:p-8"
          )}>
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      {footer && (
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
          {React.cloneElement(footer as React.ReactElement, {
            layoutMode,
            sidebarOpen
          })}
        </div>
      )}
    </div>
  );
};

export default ResponsiveLayout;