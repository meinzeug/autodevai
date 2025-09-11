import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X, Settings, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { NavigationItem } from '../../types';

interface ResponsiveSidebarProps {
  navigationItems: NavigationItem[];
  layoutMode?: 'mobile' | 'tablet' | 'desktop';
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

const NavigationItemComponent: React.FC<{
  item: NavigationItem;
  layoutMode: 'mobile' | 'tablet' | 'desktop';
  depth?: number;
  onNavigate?: () => void;
}> = ({ item, layoutMode, depth = 0, onNavigate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubItems = item.subItems && item.subItems.length > 0;

  const handleClick = () => {
    if (hasSubItems) {
      setIsExpanded(!isExpanded);
    }
    if (item.onClick) {
      item.onClick();
      // Close mobile drawer after navigation
      if (layoutMode === 'mobile' && onNavigate) {
        onNavigate();
      }
    }
  };

  const paddingLeft = depth * 16 + (layoutMode === 'desktop' ? 16 : 12);

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          "w-full flex items-center justify-between text-left font-medium rounded-lg transition-all duration-200",
          // Mobile/Tablet: larger touch targets
          layoutMode !== 'desktop' && "py-3 px-3 text-base",
          // Desktop: compact
          layoutMode === 'desktop' && "py-2 px-3 text-sm",
          // Active state
          item.active 
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm' 
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
          // Disabled state
          item.disabled && 'opacity-50 cursor-not-allowed',
          // Focus styles
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        )}
        style={{ paddingLeft: `${Math.min(paddingLeft, 48)}px` }}
        disabled={item.disabled}
        aria-expanded={hasSubItems ? isExpanded : undefined}
        aria-current={item.active ? 'page' : undefined}
      >
        <div className="flex items-center gap-3 min-w-0">
          {item.icon && (
            <span className={cn(
              "flex-shrink-0",
              layoutMode === 'desktop' ? "text-lg" : "text-xl"
            )} aria-hidden="true">
              {item.icon}
            </span>
          )}
          <span className="truncate">{item.label}</span>
        </div>
        
        {hasSubItems && (
          <div className="flex-shrink-0 ml-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 transition-transform duration-200" />
            ) : (
              <ChevronRight className="w-4 h-4 transition-transform duration-200" />
            )}
          </div>
        )}
      </button>

      {/* Sub-items */}
      <AnimatePresence>
        {hasSubItems && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={cn(
              "space-y-1",
              layoutMode !== 'desktop' ? "mt-2 mb-1" : "mt-1"
            )}>
              {item.subItems?.map((subItem) => (
                <NavigationItemComponent
                  key={subItem.id}
                  item={subItem}
                  layoutMode={layoutMode}
                  depth={depth + 1}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ResponsiveSidebar: React.FC<ResponsiveSidebarProps> = ({
  navigationItems,
  layoutMode = 'mobile',
  isOpen = true,
  onClose,
  className
}) => {
  const sidebarContent = (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Header - Mobile/Tablet only */}
      {layoutMode !== 'desktop' && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AD</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Navigation</h2>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-gray-700 dark:text-gray-300"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Desktop Header */}
      {layoutMode === 'desktop' && (
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">AD</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">AutoDev-AI</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Neural Bridge</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className={cn(
          "space-y-1",
          layoutMode !== 'desktop' && "space-y-2"
        )}>
          {navigationItems.map((item) => (
            <NavigationItemComponent
              key={item.id}
              item={item}
              layoutMode={layoutMode}
              onNavigate={onClose}
            />
          ))}
        </div>
      </nav>

      {/* Footer Actions - Mobile/Tablet */}
      {layoutMode !== 'desktop' && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-600 space-y-2">
          <button
            className="w-full flex items-center gap-3 p-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            onClick={() => {
              // Handle settings
              onClose?.();
            }}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
          
          <button
            className="w-full flex items-center gap-3 p-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            onClick={() => {
              // Handle updates
              onClose?.();
            }}
          >
            <Download className="w-5 h-5" />
            <span>Updates</span>
          </button>
        </div>
      )}

      {/* System Info */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <div className="flex justify-between items-center">
            <span>AutoDevAI v1.0</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span>Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile: Full-screen drawer
  if (layoutMode === 'mobile') {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={onClose}
            />
            
            {/* Drawer */}
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className={cn(
                "absolute left-0 top-0 h-full w-80 max-w-[85vw] shadow-2xl",
                className
              )}
            >
              {sidebarContent}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Tablet: Overlay sidebar
  if (layoutMode === 'tablet') {
    return (
      <>
        {/* Backdrop */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-30"
              onClick={onClose}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={cn(
          "fixed left-0 top-0 h-full w-64 border-r border-gray-200 dark:border-gray-700 shadow-lg z-40 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}>
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <aside className={cn(
      "w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 shadow-sm",
      className
    )}>
      {sidebarContent}
    </aside>
  );
};

export default ResponsiveSidebar;