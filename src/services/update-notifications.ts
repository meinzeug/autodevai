/**
 * Update Notification Service
 * 
 * This service manages update-related notifications, providing:
 * - Native system notifications
 * - In-app toast messages
 * - Update progress indicators
 * - Critical update alerts
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import toast from 'react-hot-toast';

export interface UpdateNotificationConfig {
  showSystemNotifications: boolean;
  showToastMessages: boolean;
  criticalUpdateAlert: boolean;
  soundEnabled: boolean;
  autoDownloadNotifications: boolean;
}

export interface UpdateEvent {
  type: string;
  payload: any;
  timestamp: Date;
}

export class UpdateNotificationService {
  private static instance: UpdateNotificationService;
  private config: UpdateNotificationConfig;
  private listeners: Map<string, UnlistenFn> = new Map();
  private eventHistory: UpdateEvent[] = [];

  private constructor() {
    this.config = this.getDefaultConfig();
    this.initialize();
  }

  public static getInstance(): UpdateNotificationService {
    if (!UpdateNotificationService.instance) {
      UpdateNotificationService.instance = new UpdateNotificationService();
    }
    return UpdateNotificationService.instance;
  }

  private getDefaultConfig(): UpdateNotificationConfig {
    const saved = localStorage.getItem('update-notification-config');
    if (saved) {
      try {
        return { ...this.getBaseConfig(), ...JSON.parse(saved) };
      } catch (error) {
        console.warn('Failed to parse saved notification config:', error);
      }
    }
    return this.getBaseConfig();
  }

  private getBaseConfig(): UpdateNotificationConfig {
    return {
      showSystemNotifications: true,
      showToastMessages: true,
      criticalUpdateAlert: true,
      soundEnabled: true,
      autoDownloadNotifications: false,
    };
  }

  private async initialize() {
    try {
      await this.setupEventListeners();
      console.log('Update notification service initialized');
    } catch (error) {
      console.error('Failed to initialize update notification service:', error);
    }
  }

  private async setupEventListeners() {
    const events = [
      'update-checking',
      'update-available',
      'update-not-available',
      'update-downloading',
      'update-download-progress',
      'update-download-complete',
      'update-download-error',
      'update-installing',
      'update-progress',
      'update-ready',
      'update-rolling-back',
      'update-rollback-complete',
      'update-error',
      'update-cleared',
    ];

    for (const eventName of events) {
      try {
        const unlisten = await listen(eventName, (event) => {
          this.handleUpdateEvent(eventName, event.payload);
        });
        this.listeners.set(eventName, unlisten);
      } catch (error) {
        console.error(`Failed to setup listener for ${eventName}:`, error);
      }
    }
  }

  private handleUpdateEvent(eventName: string, payload: any) {
    const updateEvent: UpdateEvent = {
      type: eventName,
      payload,
      timestamp: new Date(),
    };

    // Add to event history (keep last 50 events)
    this.eventHistory.push(updateEvent);
    if (this.eventHistory.length > 50) {
      this.eventHistory.shift();
    }

    // Handle specific event types
    switch (eventName) {
      case 'update-checking':
        this.handleUpdateChecking();
        break;
      case 'update-available':
        this.handleUpdateAvailable(payload);
        break;
      case 'update-not-available':
        this.handleUpdateNotAvailable();
        break;
      case 'update-download-progress':
        this.handleDownloadProgress(payload);
        break;
      case 'update-download-complete':
        this.handleDownloadComplete(payload);
        break;
      case 'update-ready':
        this.handleUpdateReady(payload);
        break;
      case 'update-error':
        this.handleUpdateError(payload);
        break;
      case 'update-rollback-complete':
        this.handleRollbackComplete(payload);
        break;
      default:
        console.debug('Unhandled update event:', eventName, payload);
    }
  }

  private handleUpdateChecking() {
    if (this.config.showToastMessages) {
      toast.loading('Checking for updates...', {
        id: 'update-check',
        duration: 3000,
      });
    }
  }

  private handleUpdateAvailable(payload: any) {
    if (this.config.showToastMessages) {
      toast.dismiss('update-check');
      
      const isCritical = payload.is_critical;
      const version = payload.version;
      const size = this.formatBytes(payload.size || 0);

      if (isCritical && this.config.criticalUpdateAlert) {
        toast.error(
          `Critical security update available: ${version} (${size})`,
          {
            duration: 10000,
            id: 'critical-update',
            icon: '⚠️',
          }
        );
      } else {
        toast.success(
          `Update available: ${version} (${size})`,
          {
            duration: 6000,
            id: 'update-available',
            icon: '⬇️',
          }
        );
      }
    }

    if (this.config.showSystemNotifications) {
      this.showSystemNotification(
        payload.is_critical ? 'Critical Update Available' : 'Update Available',
        `Version ${payload.version} is ready to download.`,
        payload.is_critical
      );
    }

    if (this.config.soundEnabled && payload.is_critical) {
      this.playNotificationSound();
    }
  }

  private handleUpdateNotAvailable() {
    if (this.config.showToastMessages) {
      toast.dismiss('update-check');
      toast('You have the latest version!', {
        icon: '✅',
        duration: 3000,
      });
    }
  }

  private handleDownloadProgress(payload: any) {
    if (payload.silent && !this.config.autoDownloadNotifications) {
      return; // Don't show notifications for silent downloads unless enabled
    }

    if (this.config.showToastMessages) {
      const progress = Math.round(payload.progress || 0);
      const downloaded = this.formatBytes(payload.downloaded || 0);
      const total = this.formatBytes(payload.total || 0);

      toast.loading(
        `Downloading update: ${progress}% (${downloaded}/${total})`,
        {
          id: 'download-progress',
        }
      );
    }
  }

  private handleDownloadComplete(payload: any) {
    if (this.config.showToastMessages) {
      toast.dismiss('download-progress');
      toast.success(
        `Update ${payload.version} downloaded successfully!`,
        {
          duration: 4000,
          icon: '✅',
        }
      );
    }

    if (this.config.showSystemNotifications) {
      this.showSystemNotification(
        'Update Downloaded',
        `Update ${payload.version} is ready to install.`,
        false
      );
    }

    if (this.config.soundEnabled) {
      this.playNotificationSound();
    }
  }

  private handleUpdateReady(payload: any) {
    if (this.config.showToastMessages) {
      toast((t) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            🚀
          </div>
          <div className="flex-1">
            <p className="font-medium">Update Ready!</p>
            <p className="text-sm text-gray-600">
              Version {payload.version} is ready. Restart to apply.
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                invoke('restart_app');
              }}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              Restart
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
            >
              Later
            </button>
          </div>
        </div>
      ), {
        duration: Infinity,
        id: 'update-ready',
      });
    }

    if (this.config.showSystemNotifications) {
      this.showSystemNotification(
        'Update Ready',
        `Update ${payload.version} is ready. Restart the application to apply.`,
        false
      );
    }
  }

  private handleUpdateError(payload: any) {
    if (this.config.showToastMessages) {
      toast.error(
        `Update failed: ${payload}`,
        {
          duration: 8000,
          id: 'update-error',
        }
      );
    }

    if (this.config.showSystemNotifications) {
      this.showSystemNotification(
        'Update Failed',
        `Update failed: ${payload}`,
        true
      );
    }
  }

  private handleRollbackComplete(payload: any) {
    if (this.config.showToastMessages) {
      toast.success(
        `Successfully rolled back to version ${payload.previous_version}`,
        {
          duration: 6000,
          icon: '🔄',
        }
      );
    }

    if (this.config.showSystemNotifications) {
      this.showSystemNotification(
        'Update Rolled Back',
        `Successfully restored to version ${payload.previous_version}`,
        false
      );
    }
  }

  private async showSystemNotification(title: string, body: string, urgent: boolean = false) {
    try {
      // Use Tauri's notification API
      const permission = await invoke('request_notification_permission');
      
      if (permission === 'granted') {
        await invoke('show_notification', {
          title,
          body,
          urgent,
        });
      }
    } catch (error) {
      console.error('Failed to show system notification:', error);
      
      // Fallback to browser notification API
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icons/32x32.png',
          requireInteraction: urgent,
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/icons/32x32.png',
            requireInteraction: urgent,
          });
        }
      }
    }
  }

  private playNotificationSound() {
    if (this.config.soundEnabled) {
      try {
        // Create and play a simple beep sound
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {
        console.warn('Failed to play notification sound:', error);
      }
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Public API methods

  public updateConfig(newConfig: Partial<UpdateNotificationConfig>) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem('update-notification-config', JSON.stringify(this.config));
    console.log('Update notification config updated:', this.config);
  }

  public getConfig(): UpdateNotificationConfig {
    return { ...this.config };
  }

  public getEventHistory(): UpdateEvent[] {
    return [...this.eventHistory];
  }

  public clearEventHistory() {
    this.eventHistory = [];
  }

  public async checkForUpdates(): Promise<boolean> {
    try {
      return await invoke('check_for_updates_with_notification');
    } catch (error) {
      console.error('Failed to check for updates:', error);
      throw error;
    }
  }

  public async downloadUpdate(): Promise<void> {
    try {
      await invoke('download_update');
      if (this.config.showToastMessages) {
        toast.success('Update download started');
      }
    } catch (error) {
      console.error('Failed to start update download:', error);
      throw error;
    }
  }

  public async installUpdate(): Promise<void> {
    try {
      await invoke('install_update');
    } catch (error) {
      console.error('Failed to install update:', error);
      throw error;
    }
  }

  public async restartApp(): Promise<void> {
    try {
      await invoke('restart_app');
    } catch (error) {
      console.error('Failed to restart app:', error);
      throw error;
    }
  }

  public async rollbackUpdate(reason?: string): Promise<void> {
    try {
      await invoke('rollback_update', { reason });
    } catch (error) {
      console.error('Failed to rollback update:', error);
      throw error;
    }
  }

  public async createBackup(): Promise<void> {
    try {
      await invoke('create_backup');
      if (this.config.showToastMessages) {
        toast.success('Manual backup created successfully');
      }
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }

  public async getUpdateStatus(): Promise<any> {
    try {
      return await invoke('get_update_status');
    } catch (error) {
      console.error('Failed to get update status:', error);
      throw error;
    }
  }

  public async getUpdateHistory(): Promise<any[]> {
    try {
      return await invoke('get_update_history');
    } catch (error) {
      console.error('Failed to get update history:', error);
      throw error;
    }
  }

  public dispose() {
    // Clean up event listeners
    this.listeners.forEach((unlisten) => {
      unlisten();
    });
    this.listeners.clear();
    this.eventHistory = [];
  }
}

// Export singleton instance
export const updateNotificationService = UpdateNotificationService.getInstance();

// React hook for easy integration
import { useEffect, useState } from 'react';

export function useUpdateNotifications() {
  const [config, setConfig] = useState<UpdateNotificationConfig>(
    updateNotificationService.getConfig()
  );
  const [eventHistory, setEventHistory] = useState<UpdateEvent[]>(
    updateNotificationService.getEventHistory()
  );

  useEffect(() => {
    // Set up periodic refresh of event history
    const interval = setInterval(() => {
      setEventHistory(updateNotificationService.getEventHistory());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const updateConfig = (newConfig: Partial<UpdateNotificationConfig>) => {
    updateNotificationService.updateConfig(newConfig);
    setConfig(updateNotificationService.getConfig());
  };

  return {
    config,
    eventHistory,
    updateConfig,
    service: updateNotificationService,
  };
}