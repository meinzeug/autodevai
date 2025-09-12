import React from 'react';
import {
  Menu,
  X,
  Sun,
  Moon,
  Settings,
  Download,
  Maximize2,
  Minimize2,
  Activity,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { StatusIndicator } from '../../types';

interface ResponsiveHeaderProps {
  title?: string;
  statusIndicators?: StatusIndicator[];
  layoutMode?: 'mobile' | 'tablet' | 'desktop';
  sidebarOpen?: boolean;
  onMenuClick?: () => void;
  onThemeToggle?: () => void;
  onSettingsClick?: () => void;
  onUpdatesClick?: () => void;
  onFullscreenToggle?: () => void;
  theme?: 'light' | 'dark';
  isFullscreen?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const ResponsiveHeader: React.FC<ResponsiveHeaderProps> = ({
  title = 'AutoDev-AI',
  statusIndicators = [],
  layoutMode = 'mobile',
  sidebarOpen = false,
  onMenuClick,
  onThemeToggle,
  onSettingsClick,
  onUpdatesClick,
  onFullscreenToggle,
  theme = 'light',
  isFullscreen = false,
  className,
  children,
}) => {
  const StatusIndicatorComponent: React.FC<{ indicator: StatusIndicator; size?: 'sm' | 'md' }> = ({
    indicator,
    size = 'md',
  }) => {
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
          return <div className="w-2 h-2 bg-green-400 rounded-full" />;
        case 'warning':
          return '⚠';
        case 'error':
          return '✕';
        case 'offline':
          return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
        default:
          return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
      }
    };

    return (
      <div
        className={cn(
          'flex items-center gap-1 rounded-full font-medium',
          size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
          getStatusColor(indicator.status)
        )}
      >
        <span className="flex items-center justify-center">{getStatusIcon(indicator.status)}</span>
        <span className="font-semibold">{indicator.label}</span>
        {indicator.value && <span className="ml-1 opacity-75 text-xs">{indicator.value}</span>}
      </div>
    );
  };

  const ActionButton: React.FC<{
    onClick?: () => void;
    children: React.ReactNode;
    active?: boolean;
    'aria-label'?: string;
  }> = ({ onClick, children, active, 'aria-label': ariaLabel }) => (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'p-2 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        active
          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
      )}
    >
      {children}
    </button>
  );

  return (
    <header
      className={cn(
        'bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50',
        className
      )}
    >
      {/* Mobile Header */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between px-3 py-3">
          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-2">
            {onMenuClick && (
              <ActionButton onClick={onMenuClick} aria-label="Toggle menu">
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </ActionButton>
            )}

            <div className="flex items-center gap-2">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs sm:text-sm">AD</span>
              </div>
              {layoutMode !== 'mobile' && (
                <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {title}
                </h1>
              )}
            </div>
          </div>

          {/* Right: Essential actions only */}
          <div className="flex items-center gap-1">
            {/* Status indicator - compact */}
            {statusIndicators.length > 0 && layoutMode === 'tablet' && statusIndicators[0] && (
              <div className="flex items-center gap-1 mr-2">
                <StatusIndicatorComponent indicator={statusIndicators[0]} size="sm" />
              </div>
            )}

            {/* Theme toggle */}
            {onThemeToggle && (
              <ActionButton
                onClick={onThemeToggle}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </ActionButton>
            )}

            {/* Settings */}
            {onSettingsClick && (
              <ActionButton onClick={onSettingsClick} aria-label="Settings">
                <Settings className="w-4 h-4" />
              </ActionButton>
            )}

            {children}
          </div>
        </div>

        {/* Mobile status bar */}
        {statusIndicators.length > 0 && layoutMode === 'mobile' && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              {statusIndicators.slice(0, 3).map((indicator, index) => (
                <StatusIndicatorComponent key={index} indicator={indicator} size="sm" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left: Title + Status */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">AD</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Neural Bridge Platform</p>
              </div>
            </div>

            {/* Status indicators */}
            {statusIndicators.length > 0 && (
              <div className="flex items-center gap-3">
                {statusIndicators.map((indicator, index) => (
                  <StatusIndicatorComponent key={index} indicator={indicator} />
                ))}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Time */}
            <div className="text-sm text-gray-500 dark:text-gray-400 mr-4">
              {new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
            </div>

            {/* Action buttons */}
            {onThemeToggle && (
              <ActionButton
                onClick={onThemeToggle}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </ActionButton>
            )}

            {onUpdatesClick && (
              <ActionButton onClick={onUpdatesClick} aria-label="Updates">
                <Download className="w-5 h-5" />
              </ActionButton>
            )}

            {onSettingsClick && (
              <ActionButton onClick={onSettingsClick} aria-label="Settings">
                <Settings className="w-5 h-5" />
              </ActionButton>
            )}

            {onFullscreenToggle && (
              <ActionButton
                onClick={onFullscreenToggle}
                aria-label={`${isFullscreen ? 'Exit' : 'Enter'} fullscreen`}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </ActionButton>
            )}

            {/* System health indicator */}
            <div className="ml-2 p-2">
              <Activity className="w-5 h-5 text-green-500" />
            </div>

            {children}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ResponsiveHeader;
