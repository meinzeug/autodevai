import React from 'react';
import { HeaderProps, StatusIndicator } from '../types';

const StatusIndicatorComponent: React.FC<{ indicator: StatusIndicator }> = ({ indicator }) => {
  const getStatusColor = (status: StatusIndicator['status']) => {
    switch (status) {
      case 'online':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20';
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20';
      case 'offline':
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getStatusIcon = (status: StatusIndicator['status']) => {
    switch (status) {
      case 'online':
        return '●';
      case 'warning':
        return '⚠';
      case 'error':
        return '✕';
      case 'offline':
        return '○';
      default:
        return '○';
    }
  };

  return (
    <div 
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(indicator.status)}`}
      role="status"
      aria-label={`${indicator.label}: ${indicator.status}`}
    >
      <span className="text-sm" aria-hidden="true">
        {getStatusIcon(indicator.status)}
      </span>
      <span className="font-semibold">{indicator.label}</span>
      {indicator.value && (
        <span className="ml-1 opacity-75">{indicator.value}</span>
      )}
    </div>
  );
};

export const Header: React.FC<HeaderProps> = ({
  title = 'AutoDevAI',
  statusIndicators = [],
  onMenuClick,
  className = '',
  children
}) => {
  return (
    <header 
      className={`bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 ${className}`}
      role="banner"
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Section - Title and Menu */}
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 lg:hidden text-gray-700 dark:text-gray-300"
              aria-label="Open navigation menu"
              type="button"
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 6h16M4 12h16M4 18h16" 
                />
              </svg>
            </button>
          )}
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm" aria-hidden="true">
                AD
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
              {title}
            </h1>
          </div>
        </div>

        {/* Center Section - Status Indicators */}
        {statusIndicators.length > 0 && (
          <div className="hidden md:flex items-center gap-2 flex-1 justify-center max-w-md">
            <div 
              className="flex items-center gap-2 flex-wrap justify-center"
              role="region"
              aria-label="System status indicators"
            >
              {statusIndicators.map((indicator, index) => (
                <StatusIndicatorComponent key={`${indicator.label}-${index}`} indicator={indicator} />
              ))}
            </div>
          </div>
        )}

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2">
          {children}
          
          {/* Time Display */}
          <div className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
            {new Date().toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false
            })}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="User menu"
              type="button"
            >
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <svg 
                  className="w-4 h-4 text-gray-600 dark:text-gray-300" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                  />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Status Indicators */}
      {statusIndicators.length > 0 && (
        <div className="md:hidden px-4 pb-3">
          <div 
            className="flex items-center gap-2 flex-wrap"
            role="region"
            aria-label="System status indicators"
          >
            {statusIndicators.map((indicator, index) => (
              <StatusIndicatorComponent key={`mobile-${indicator.label}-${index}`} indicator={indicator} />
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;