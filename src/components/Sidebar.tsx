import React, { useState } from 'react';
import { SidebarProps, NavigationItem } from '../types';

const NavigationItemComponent: React.FC<{
  item: NavigationItem;
  depth?: number;
}> = ({ item, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (item.subItems && item.subItems.length > 0) {
      setIsExpanded(!isExpanded);
    }
    if (item.onClick) {
      item.onClick();
    }
  };

  const paddingLeft = depth * 16 + 16;

  return (
    <div role="menuitem">
      <button
        onClick={handleClick}
        className={`
          w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium rounded-lg transition-colors duration-200
          ${item.active 
            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500' 
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        style={{ paddingLeft: `${paddingLeft}px` }}
        aria-expanded={item.subItems ? isExpanded : undefined}
        aria-current={item.active ? 'page' : undefined}
      >
        <div className="flex items-center gap-3">
          {item.icon && (
            <span className="text-lg" aria-hidden="true">
              {item.icon}
            </span>
          )}
          <span>{item.label}</span>
        </div>
        
        {item.subItems && item.subItems.length > 0 && (
          <svg 
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </button>

      {item.subItems && isExpanded && (
        <div className="mt-1 space-y-1" role="menu">
          {item.subItems.map((subItem) => (
            <NavigationItemComponent
              key={subItem.id}
              item={subItem}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  navigationItems,
  className = '',
  children
}) => {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:shadow-none lg:border-r lg:border-gray-200
          w-64 flex flex-col
          ${className}
        `}
        aria-label="Main navigation"
        role="navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
          <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Close navigation menu"
            type="button"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto" role="menubar">
          {navigationItems.map((item) => (
            <NavigationItemComponent key={item.id} item={item} />
          ))}
        </nav>

        {/* Footer/Actions */}
        {children && (
          <div className="p-4 border-t border-gray-200">
            {children}
          </div>
        )}

        {/* System Info */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500">
            <div className="flex justify-between items-center">
              <span>AutoDevAI v1.0</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full" aria-hidden="true"></div>
                <span>Online</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;