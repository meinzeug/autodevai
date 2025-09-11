import React, { useState } from 'react';
import {
  Header,
  Sidebar,
  StatusBar,
  Button,
  IconButton,
  ButtonGroup,
  LoadingSpinner,
  LoadingOverlay
} from '../components';
import { NavigationItem, StatusIndicator } from '../types';
import { Settings, Download, Play, Pause, Square } from 'lucide-react';

/**
 * Component Showcase - Demonstrates all the new frontend components
 * This file showcases the complete component library implementation
 */
export const ComponentShowcase: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);

  // Sample navigation items
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      active: true,
      onClick: () => console.log('Dashboard clicked')
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: '📁',
      subItems: [
        {
          id: 'active-projects',
          label: 'Active Projects',
          icon: '✅',
          onClick: () => console.log('Active Projects clicked')
        },
        {
          id: 'archived',
          label: 'Archived',
          icon: '📦',
          onClick: () => console.log('Archived clicked')
        }
      ]
    },
    {
      id: 'tools',
      label: 'Development Tools',
      icon: '🔧',
      onClick: () => console.log('Tools clicked')
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      onClick: () => console.log('Settings clicked')
    }
  ];

  // Sample status indicators
  const statusIndicators: StatusIndicator[] = [
    { status: 'online', label: 'API', value: 'Connected' },
    { status: 'warning', label: 'Database', value: 'Slow' },
    { status: 'error', label: 'Cache', value: 'Error' },
    { status: 'online', label: 'Queue', value: '5 jobs' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Component */}
      <Header
        title="Component Showcase"
        statusIndicators={statusIndicators}
        onMenuClick={() => setSidebarOpen(true)}
      >
        <div className="flex items-center gap-2">
          <IconButton
            icon={<Settings className="w-4 h-4" />}
            variant="ghost"
            size="sm"
            aria-label="Settings"
          />
          <IconButton
            icon={<Download className="w-4 h-4" />}
            variant="ghost"
            size="sm"
            aria-label="Download"
          />
        </div>
      </Header>

      <div className="flex flex-1">
        {/* Sidebar Component */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          navigationItems={navigationItems}
        />

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-gray-900">Frontend Component Library</h1>
            
            {/* Button Showcase */}
            <section className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Button Components</h2>
              
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="destructive">Danger</Button>
                  <Button variant="primary">Success</Button>
                  <Button variant="ghost">Ghost</Button>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Button disabled>Disabled</Button>
                  <Button loading={loading} onClick={() => {
                    setLoading(true);
                    setTimeout(() => setLoading(false), 2000);
                  }}>
                    {loading ? 'Loading...' : 'Click to Load'}
                  </Button>
                </div>

                <ButtonGroup>
                  <Button variant="secondary">
                    <Play className="w-4 h-4 mr-2" />
                    Play
                  </Button>
                  <Button variant="secondary">
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                  <Button variant="secondary">
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                </ButtonGroup>
              </div>
            </section>

            {/* Loading Spinner Showcase */}
            <section className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Loading Spinners</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <LoadingSpinner variant="default" size="md" text="Default" />
                </div>
                <div className="text-center">
                  <LoadingSpinner variant="dots" size="md" text="Dots" />
                </div>
                <div className="text-center">
                  <LoadingSpinner variant="pulse" size="md" text="Pulse" />
                </div>
                <div className="text-center">
                  <LoadingSpinner variant="ring" size="md" text="Ring" />
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <Button onClick={() => setOverlayLoading(true)}>
                  Show Loading Overlay
                </Button>
              </div>
            </section>

            {/* Status Indicators Showcase */}
            <section className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Status Indicators</h2>
              
              <div className="flex flex-wrap gap-4">
                {statusIndicators.map((indicator, index) => (
                  <div key={index} className={`
                    flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium
                    ${indicator.status === 'online' ? 'bg-green-100 text-green-700' : ''}
                    ${indicator.status === 'warning' ? 'bg-yellow-100 text-yellow-700' : ''}
                    ${indicator.status === 'error' ? 'bg-red-100 text-red-700' : ''}
                    ${indicator.status === 'offline' ? 'bg-gray-100 text-gray-700' : ''}
                  `}>
                    <span>{indicator.label}: {indicator.value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Features Summary */}
            <section className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Component Library Features</h2>
              
              <ul className="space-y-2 text-gray-700">
                <li>✅ <strong>Header Component</strong> - Main application header with status indicators</li>
                <li>✅ <strong>Sidebar Component</strong> - Collapsible navigation with nested items</li>
                <li>✅ <strong>StatusBar Component</strong> - System health and metrics display</li>
                <li>✅ <strong>Button Component</strong> - Multiple variants, sizes, and states</li>
                <li>✅ <strong>Loading Spinners</strong> - Various loading animation styles</li>
                <li>✅ <strong>TypeScript Support</strong> - Full type definitions and IntelliSense</li>
                <li>✅ <strong>Accessibility</strong> - ARIA labels and keyboard navigation</li>
                <li>✅ <strong>Responsive Design</strong> - Mobile-first responsive layouts</li>
                <li>✅ <strong>TailwindCSS</strong> - Consistent styling system</li>
                <li>✅ <strong>Modular Architecture</strong> - Easy to import and use</li>
              </ul>
            </section>
          </div>
        </main>
      </div>

      {/* StatusBar Component */}
      <StatusBar
        systemHealth={{
          cpu: 42.5,
          memory: 67.8,
          disk: 23.1,
          network: 'connected'
        }}
        activeConnections={8}
        lastUpdate={new Date().toISOString()}
      />

      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={overlayLoading}
        text="Processing request..."
        variant="ring"
      />

      {/* Auto-hide overlay after 3 seconds */}
      {overlayLoading && (() => {
        setTimeout(() => setOverlayLoading(false), 3000);
        return null;
      })()}
    </div>
  );
};

export default ComponentShowcase;