import React, { useState, useRef, useEffect } from 'react';
import { HeaderProps, StatusIndicator } from '../types';
import { User, Settings, LogOut, HelpCircle, Moon, Bell } from 'lucide-react';

const StatusIndicatorComponent: React.FC<{ indicator: StatusIndicator }> = ({ indicator }) => {
  const getStatusColor = (status: StatusIndicator['status']) => {
    switch (status) {
      case 'online':
        return 'text-green-400 bg-green-900/20';
      case 'warning':
        return 'text-yellow-400 bg-yellow-900/20';
      case 'error':
        return 'text-red-400 bg-red-900/20';
      case 'offline':
        return 'text-gray-400 bg-gray-800';
      default:
        return 'text-gray-400 bg-gray-800';
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
      {indicator.value && <span className="ml-1 opacity-75">{indicator.value}</span>}
    </div>
  );
};

export const Header: React.FC<HeaderProps> = ({
  title = 'AutoDevAI',
  statusIndicators = [],
  onMenuClick,
  className = '',
  children,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'System update available', time: '5m ago', unread: true },
    { id: 2, message: 'Docker container started', time: '10m ago', unread: false },
    { id: 3, message: 'AI model loaded successfully', time: '1h ago', unread: false },
  ]);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => n.unread).length;
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-gray-800 shadow-sm border-b border-gray-700 h-16 ${className}`}
      role="banner"
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Section - Title and Menu */}
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 lg:hidden text-gray-300"
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
            <h1 className="text-xl font-bold text-white hidden sm:block">{title}</h1>
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
                <StatusIndicatorComponent
                  key={`${indicator.label}-${index}`}
                  indicator={indicator}
                />
              ))}
            </div>
          </div>
        )}

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2">
          {children}

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-gray-700 focus:outline-none"
              aria-label="Notifications"
              type="button"
            >
              <Bell className="w-5 h-5 text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-sm font-semibold text-white">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        className={`p-4 hover:bg-gray-700 cursor-pointer border-b border-gray-700/50 ${
                          notif.unread ? 'bg-gray-750' : ''
                        }`}
                        onClick={() => {
                          setNotifications(prev =>
                            prev.map(n => (n.id === notif.id ? { ...n, unread: false } : n))
                          );
                        }}
                      >
                        <div className="flex items-start gap-2">
                          {notif.unread && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm text-gray-200">{notif.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
                  )}
                </div>
                <div className="p-3 border-t border-gray-700">
                  <button
                    className="text-xs text-blue-400 hover:underline"
                    onClick={() => {
                      setNotifications([]);
                      setShowNotifications(false);
                    }}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Time Display */}
          <div className="hidden sm:block text-sm text-gray-400">
            {new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-700 focus:outline-none"
              aria-label="User menu"
              type="button"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">U</span>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
                <div className="p-4 border-b border-gray-700">
                  <p className="text-sm font-semibold text-white">User Account</p>
                  <p className="text-xs text-gray-400 mt-1">user@autodev.ai</p>
                </div>

                <div className="p-2">
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
                    onClick={() => {
                      console.log('Profile clicked');
                      setShowUserMenu(false);
                    }}
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>

                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
                    onClick={() => {
                      console.log('Settings clicked');
                      setShowUserMenu(false);
                    }}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>

                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
                    onClick={() => {
                      document.documentElement.classList.toggle('dark');
                      setShowUserMenu(false);
                    }}
                  >
                    <Moon className="w-4 h-4" />
                    <span>Dark Mode</span>
                  </button>

                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
                    onClick={() => {
                      window.open('https://github.com/autodevai/docs', '_blank');
                      setShowUserMenu(false);
                    }}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Help & Docs</span>
                  </button>
                </div>

                <div className="p-2 border-t border-gray-700">
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-md transition-colors"
                    onClick={() => {
                      console.log('Logout clicked');
                      setShowUserMenu(false);
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
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
              <StatusIndicatorComponent
                key={`mobile-${indicator.label}-${index}`}
                indicator={indicator}
              />
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
