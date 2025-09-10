/**
 * Menu Integration Utilities for AutoDev-AI
 * Provides TypeScript interfaces and utilities for interacting with the native menu system
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// Menu action identifiers
export const MENU_ACTIONS = {
  // File menu
  NEW_FILE: 'new_file',
  OPEN_FILE: 'open_file',
  SAVE_FILE: 'save_file',
  SAVE_AS: 'save_as',
  NEW_WINDOW: 'new_window',
  CLOSE_WINDOW: 'close_window',
  SETTINGS: 'settings',
  QUIT: 'quit',
  
  // View menu
  RELOAD: 'reload',
  FORCE_RELOAD: 'force_reload',
  ZOOM_IN: 'zoom_in',
  ZOOM_OUT: 'zoom_out',
  ZOOM_RESET: 'zoom_reset',
  FULLSCREEN: 'fullscreen',
  MINIMIZE: 'minimize',
  TOGGLE_DEVTOOLS: 'toggle_devtools',
  CONSOLE: 'console',
  
  // Help menu
  DOCUMENTATION: 'documentation',
  API_DOCS: 'api_docs',
  KEYBOARD_SHORTCUTS: 'keyboard_shortcuts',
  GITHUB: 'github',
  REPORT_ISSUE: 'report_issue',
  CHECK_UPDATES: 'check_updates',
  ABOUT: 'about',
} as const;

export type MenuAction = typeof MENU_ACTIONS[keyof typeof MENU_ACTIONS];

// Menu structure interface
export interface MenuInfo {
  has_menu: boolean;
  platform: string;
  architecture: string;
  version: string;
  menu_structure: {
    File: string[];
    Edit: string[];
    View: string[];
    Help: string[];
  };
  keyboard_shortcuts: Record<string, string>;
  features: {
    native_items_enabled: boolean;
    devtools_available: boolean;
    platform_specific_shortcuts: boolean;
    zoom_support: boolean;
    fullscreen_support: boolean;
    window_management: boolean;
    file_operations: boolean;
    developer_tools: boolean;
  };
  menu_count: number;
}

// Menu event payloads
export interface MenuEventPayload {
  action: MenuAction;
  timestamp: number;
}

/**
 * Menu Integration Service
 * Provides a clean interface for interacting with the native menu system
 */
export class MenuIntegration {
  private static instance: MenuIntegration;
  private eventListeners: Map<MenuAction, UnlistenFn[]> = new Map();

  private constructor() {}

  public static getInstance(): MenuIntegration {
    if (!MenuIntegration.instance) {
      MenuIntegration.instance = new MenuIntegration();
    }
    return MenuIntegration.instance;
  }

  /**
   * Get comprehensive menu information
   */
  async getMenuInfo(): Promise<MenuInfo> {
    return invoke<MenuInfo>('get_menu_info');
  }

  /**
   * Trigger a menu action programmatically
   */
  async triggerAction(action: MenuAction): Promise<void> {
    await invoke('trigger_menu_action', { actionId: action });
  }

  /**
   * Get current zoom level
   */
  async getZoomLevel(): Promise<number> {
    return invoke<number>('get_zoom_level');
  }

  /**
   * Set zoom level (0.25 - 3.0)
   */
  async setZoomLevel(level: number): Promise<void> {
    const clampedLevel = Math.max(0.25, Math.min(3.0, level));
    await invoke('set_zoom_level', { level: clampedLevel });
  }

  /**
   * Listen for menu events from the native menu
   */
  async listenToMenuEvent(action: MenuAction, callback: (payload: any) => void): Promise<UnlistenFn> {
    const eventName = `menu-${action.replace('_', '-')}`;
    const unlisten = await listen(eventName, (event) => {
      callback(event.payload);
    });

    // Store the unlisten function
    if (!this.eventListeners.has(action)) {
      this.eventListeners.set(action, []);
    }
    this.eventListeners.get(action)!.push(unlisten);

    return unlisten;
  }

  /**
   * Remove all event listeners for a specific action
   */
  removeListeners(action: MenuAction): void {
    const listeners = this.eventListeners.get(action);
    if (listeners) {
      listeners.forEach(unlisten => unlisten());
      this.eventListeners.delete(action);
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.eventListeners.forEach(listeners => {
      listeners.forEach(unlisten => unlisten());
    });
    this.eventListeners.clear();
  }

  /**
   * Setup default menu handlers for common actions
   */
  setupDefaultHandlers(): void {
    // File operations
    this.listenToMenuEvent(MENU_ACTIONS.NEW_FILE, () => {
      this.handleNewFile();
    });

    this.listenToMenuEvent(MENU_ACTIONS.OPEN_FILE, () => {
      this.handleOpenFile();
    });

    this.listenToMenuEvent(MENU_ACTIONS.SAVE_FILE, () => {
      this.handleSaveFile();
    });

    this.listenToMenuEvent(MENU_ACTIONS.SAVE_AS, () => {
      this.handleSaveAs();
    });

    // Add zoom persistence
    this.setupZoomPersistence();
  }

  /**
   * Handle new file creation
   */
  private handleNewFile(): void {
    console.log('New file action triggered');
    // Emit custom event for application components
    window.dispatchEvent(new CustomEvent('menu-new-file', { 
      detail: { timestamp: Date.now() } 
    }));
  }

  /**
   * Handle file opening
   */
  private handleOpenFile(): void {
    console.log('Open file action triggered');
    window.dispatchEvent(new CustomEvent('menu-open-file', { 
      detail: { timestamp: Date.now() } 
    }));
  }

  /**
   * Handle file saving
   */
  private handleSaveFile(): void {
    console.log('Save file action triggered');
    window.dispatchEvent(new CustomEvent('menu-save-file', { 
      detail: { timestamp: Date.now() } 
    }));
  }

  /**
   * Handle save as
   */
  private handleSaveAs(): void {
    console.log('Save as action triggered');
    window.dispatchEvent(new CustomEvent('menu-save-as', { 
      detail: { timestamp: Date.now() } 
    }));
  }

  /**
   * Setup zoom level persistence
   */
  private setupZoomPersistence(): void {
    // Restore zoom level on page load
    const savedZoom = localStorage.getItem('zoom-level');
    if (savedZoom) {
      const zoomLevel = parseFloat(savedZoom);
      document.body.style.zoom = zoomLevel.toString();
    }

    // Listen for zoom changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target as HTMLElement;
          if (target === document.body) {
            const zoom = target.style.zoom;
            if (zoom) {
              localStorage.setItem('zoom-level', zoom);
            }
          }
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style']
    });
  }

  /**
   * Show custom dialog (if implemented)
   */
  showCustomDialog(title: string, message: string): void {
    // This can be enhanced to show a custom modal dialog
    // For now, use alert as fallback
    alert(`${title}\n\n${message}`);
  }

  /**
   * Get platform-specific keyboard shortcut display
   */
  getShortcutDisplay(shortcut: string): string {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    return shortcut
      .replace('CmdOrCtrl', isMac ? 'Cmd' : 'Ctrl')
      .replace('Alt', isMac ? 'Option' : 'Alt')
      .replace('Shift', '⇧')
      .replace('Plus', '+');
  }
}

// Global menu integration instance
export const menuIntegration = MenuIntegration.getInstance();

// Setup default handlers when module loads
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      menuIntegration.setupDefaultHandlers();
    });
  } else {
    menuIntegration.setupDefaultHandlers();
  }

  // Make menuIntegration available globally for debugging
  (window as any).menuIntegration = menuIntegration;
}

// Export commonly used functions
export const triggerMenuAction = (action: MenuAction) => menuIntegration.triggerAction(action);
export const getMenuInfo = () => menuIntegration.getMenuInfo();
export const setZoomLevel = (level: number) => menuIntegration.setZoomLevel(level);
export const getZoomLevel = () => menuIntegration.getZoomLevel();