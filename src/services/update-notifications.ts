import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import toast from 'react-hot-toast';

export interface UpdateNotificationConfig {
  enabled: boolean;
  checkInterval: number;
  showToastMessages: boolean;
  showSystemNotifications: boolean;
  soundEnabled: boolean;
  autoDownload: boolean;
  notificationPosition: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

export interface UpdateInfo {
  version: string;
  releaseNotes: string;
  downloadUrl: string;
  size: number;
  publishedAt: string;
  isManual?: boolean;
}

export interface UpdateProgress {
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  downloadSpeed: number;
}

export class UpdateNotificationManager {
  private config: UpdateNotificationConfig = {
    enabled: true,
    checkInterval: 30 * 60 * 1000, // 30 minutes
    showToastMessages: true,
    showSystemNotifications: true,
    soundEnabled: false,
    autoDownload: false,
    notificationPosition: 'top-right'
  };

  private checkTimer?: NodeJS.Timeout | undefined;
  private isChecking = false;
  private lastCheckedVersion?: string | undefined;

  constructor(config?: Partial<UpdateNotificationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  async initialize() {
    if (!this.config.enabled) {
      console.log('Update notifications are disabled');
      return;
    }

    try {
      // Listen for update events from Tauri
      await listen('tauri://update-available', this.handleUpdateAvailable.bind(this));
      await listen('tauri://update-install', this.handleUpdateInstall.bind(this));
      await listen('tauri://update-status', this.handleUpdateStatus.bind(this));

      // Start periodic checks
      this.startPeriodicChecks();

      console.log('Update notification manager initialized');
    } catch (error) {
      console.error('Failed to initialize update notifications:', error);
    }
  }

  private startPeriodicChecks() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    this.checkTimer = setInterval(() => {
      this.checkForUpdates();
    }, this.config.checkInterval);

    // Check immediately
    setTimeout(() => this.checkForUpdates(), 1000);
  }

  async checkForUpdates(manual = false) {
    if (this.isChecking) {
      return;
    }

    this.isChecking = true;

    try {
      const updateInfo = await invoke('check_for_updates') as UpdateInfo | null;
      
      if (updateInfo) {
        this.handleUpdateFound(updateInfo, manual);
      } else if (manual) {
        this.showNoUpdatesMessage();
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      if (manual) {
        this.showUpdateCheckError(error);
      }
    } finally {
      this.isChecking = false;
    }
  }

  private handleUpdateFound(updateInfo: UpdateInfo, isManual: boolean) {
    // Don't show the same update notification twice
    if (this.lastCheckedVersion === updateInfo.version && !isManual) {
      return;
    }

    this.lastCheckedVersion = updateInfo.version;

    if (this.config.showToastMessages) {
      toast.success(`Update Available! Version ${updateInfo.version} is now available.`, {
        duration: 10000,
        position: this.config.notificationPosition,
        id: 'update-available',
      });
    }

    if (this.config.showSystemNotifications) {
      this.showSystemNotification(
        'Update Available',
        `Version ${updateInfo.version} is now available. Click to download.`,
        true
      );
    }

    if (this.config.autoDownload) {
      this.downloadUpdate(updateInfo);
    }

    if (this.config.soundEnabled) {
      this.playNotificationSound();
    }
  }

  private async downloadUpdate(updateInfo: UpdateInfo) {
    try {
      if (this.config.showToastMessages) {
        toast.loading('Downloading update...', {
          id: 'update-download',
          duration: Infinity,
        });
      }

      await invoke('download_update', { updateInfo });
    } catch (error) {
      console.error('Failed to download update:', error);
      if (this.config.showToastMessages) {
        toast.error('Failed to download update', {
          id: 'update-download',
        });
      }
    }
  }

  private handleUpdateAvailable(event: any) {
    const updateInfo = event.payload as UpdateInfo;
    this.handleUpdateFound(updateInfo, false);
  }

  private handleUpdateInstall(_event: any) {
    if (this.config.showToastMessages) {
      toast.success('Update installed! Restart required.', {
        duration: 5000,
        id: 'update-installed',
      });
    }

    if (this.config.showSystemNotifications) {
      this.showSystemNotification(
        'Update Installed',
        'Update has been installed. Please restart the application.',
        false
      );
    }

    if (this.config.soundEnabled) {
      this.playNotificationSound();
    }
  }


  private handleUpdateStatus(event: any) {
    const progress = event.payload as UpdateProgress;
    
    if (this.config.showToastMessages) {
      const percentage = Math.round(progress.percentage);
      toast.loading(`Downloading update... ${percentage}%`, {
        id: 'update-progress',
      });
    }
  }

  private showNoUpdatesMessage() {
    if (this.config.showToastMessages) {
      toast.success('You are using the latest version!', {
        duration: 3000,
        position: this.config.notificationPosition,
      });
    }
  }

  private showUpdateCheckError(_error: any) {
    if (this.config.showToastMessages) {
      toast.error('Failed to check for updates. Please try again later.', {
        duration: 5000,
        position: this.config.notificationPosition,
      });
    }
  }

  private async showSystemNotification(title: string, body: string, requiresAction: boolean) {
    try {
      await invoke('show_system_notification', {
        title,
        body,
        requiresAction,
      });
    } catch (error) {
      console.error('Failed to show system notification:', error);
    }
  }

  private playNotificationSound() {
    try {
      // Use a simple beep sound for now
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsfBSOS1u7PgSsFJHfL8N2QPAoUXrTp65pKGApGn+DyvmsfBSOS1u7PgSsFJHfL8N2QQAoUXrTp66hVFApGn+DyvmsfBSOS1u7PgSsFJHfL8N2QQAoUXrTp66hVFApGn+DyvmsfBSOS1u7PgSsFJHfL8N2QQAoUXrTp66hVFApGn+DyvmsfBSOS1u7PgSsFJHfL8N2QQAoUXrTp66hVFApGn+DyvmsfBSOS1u7PgSsF');
      audio.play().catch(() => {
        // Ignore audio play errors
      });
    } catch {
      // Ignore audio errors
    }
  }

  updateConfig(newConfig: Partial<UpdateNotificationConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.enabled === false) {
      this.stopPeriodicChecks();
    } else if (newConfig.enabled === true && !this.checkTimer) {
      this.startPeriodicChecks();
    }

    if (newConfig.checkInterval && this.checkTimer) {
      this.startPeriodicChecks(); // Restart with new interval
    }
  }

  getConfig(): UpdateNotificationConfig {
    return { ...this.config };
  }

  stopPeriodicChecks() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }
  }

  destroy() {
    this.stopPeriodicChecks();
    this.lastCheckedVersion = undefined;
  }
}

// Export singleton instance
export const updateNotificationManager = new UpdateNotificationManager();