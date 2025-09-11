import React, { useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Settings,
  ArrowLeft,
  Info,
  Clock,
  Shield
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

interface UpdateInfo {
  version: string;
  release_date: string;
  release_notes: string;
  download_url: string;
  size: number;
  checksum?: string;
  is_critical: boolean;
  backup_path?: string;
  rollback_version?: string;
}

interface UpdateConfig {
  auto_check: boolean;
  check_interval_hours: number;
  notify_user: boolean;
  prompt_before_install: boolean;
  github_repo: string;
  pre_release: boolean;
  silent_install: boolean;
  backup_before_update: boolean;
  update_channel: string;
}

interface RollbackInfo {
  backup_path: string;
  previous_version: string;
  backup_timestamp: number;
  reason: string;
}

type UpdateStatus = 
  | { type: 'Idle' }
  | { type: 'Checking' }
  | { type: 'Available'; version: string; release_notes: string; download_url: string; size: number; is_critical: boolean }
  | { type: 'Downloading'; version: string; progress: number; downloaded: number; total: number }
  | { type: 'Installing'; version: string; progress: number }
  | { type: 'ReadyToRestart'; version: string }
  | { type: 'RollingBack'; reason: string }
  | { type: 'RollbackComplete'; previous_version: string }
  | { type: 'Error'; message: string };

interface UpdateManagerProps {
  onClose: () => void;
}

export const UpdateManager: React.FC<UpdateManagerProps> = ({ onClose }) => {
  const [status, setStatus] = useState<UpdateStatus>({ type: 'Idle' });
  const [config, setConfig] = useState<UpdateConfig | null>(null);
  const [updateHistory, setUpdateHistory] = useState<UpdateInfo[]>([]);
  const [rollbackInfo, setRollbackInfo] = useState<RollbackInfo | null>(null);
  const [lastCheck, setLastCheck] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [statusResult, configResult, historyResult, rollbackResult, lastCheckResult] = await Promise.all([
          invoke('get_update_status'),
          invoke('get_update_config'),
          invoke('get_update_history'),
          invoke('get_rollback_info'),
          invoke('get_last_check_time')
        ]);

        setStatus(statusResult as UpdateStatus);
        setConfig(configResult as UpdateConfig);
        setUpdateHistory(historyResult as UpdateInfo[]);
        setRollbackInfo(rollbackResult as RollbackInfo | null);
        setLastCheck(lastCheckResult as number | null);
      } catch (error) {
        console.error('Failed to load update data:', error);
        toast.error('Failed to load update information');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Listen for update events
  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

    const setupListeners = async () => {
      const events = [
        'update-checking',
        'update-available',
        'update-downloading',
        'update-download-progress',
        'update-download-complete',
        'update-installing',
        'update-progress',
        'update-ready',
        'update-rolling-back',
        'update-rollback-complete',
        'update-error',
        'update-cleared'
      ];

      for (const eventName of events) {
        const unlisten = await listen(eventName, (event) => {
          handleUpdateEvent(eventName, event.payload);
        });
        unsubscribes.push(unlisten);
      }
    };

    setupListeners();

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  const handleUpdateEvent = (eventName: string, payload: any) => {
    switch (eventName) {
      case 'update-checking':
        setStatus({ type: 'Checking' });
        break;
      case 'update-available':
        setStatus({
          type: 'Available',
          version: payload.version,
          release_notes: payload.release_notes,
          download_url: payload.download_url,
          size: payload.size,
          is_critical: payload.is_critical
        });
        if (payload.is_critical) {
          toast.error(`Critical update available: ${payload.version}`);
        } else {
          toast.success(`Update available: ${payload.version}`);
        }
        break;
      case 'update-download-progress':
        if (payload.silent) return; // Don't update UI for silent downloads
        setStatus({
          type: 'Downloading',
          version: payload.version || 'Unknown',
          progress: payload.progress || 0,
          downloaded: payload.downloaded || 0,
          total: payload.total || 0
        });
        break;
      case 'update-installing':
        setStatus({
          type: 'Installing',
          version: payload.version || 'Unknown',
          progress: 0
        });
        break;
      case 'update-progress':
        if (status.type === 'Installing') {
          setStatus({
            ...status,
            progress: payload as number
          });
        }
        break;
      case 'update-ready':
        setStatus({
          type: 'ReadyToRestart',
          version: payload.version || 'Unknown'
        });
        toast.success('Update is ready! Restart to apply.');
        break;
      case 'update-rolling-back':
        setStatus({
          type: 'RollingBack',
          reason: payload.reason || 'Unknown reason'
        });
        break;
      case 'update-rollback-complete':
        setStatus({
          type: 'RollbackComplete',
          previous_version: payload.previous_version || 'Unknown'
        });
        toast.success('Update rolled back successfully');
        break;
      case 'update-error':
        setStatus({
          type: 'Error',
          message: payload as string
        });
        toast.error(`Update error: ${payload}`);
        break;
      case 'update-cleared':
        setStatus({ type: 'Idle' });
        break;
    }
  };

  const handleCheckForUpdates = useCallback(async () => {
    try {
      setLoading(true);
      await invoke('check_for_updates_with_notification');
      setLastCheck(Date.now());
    } catch (error) {
      toast.error(`Failed to check for updates: ${error}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownloadUpdate = useCallback(async () => {
    try {
      await invoke('download_update');
      toast.success('Download started in background');
    } catch (error) {
      toast.error(`Failed to start download: ${error}`);
    }
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    try {
      if (config?.prompt_before_install) {
        if (!confirm('Are you sure you want to install this update?')) {
          return;
        }
      }
      await invoke('install_update');
    } catch (error) {
      toast.error(`Failed to install update: ${error}`);
    }
  }, [config]);

  const handleRestartApp = useCallback(async () => {
    try {
      await invoke('restart_app');
    } catch (error) {
      toast.error(`Failed to restart: ${error}`);
    }
  }, []);

  const handleRollback = useCallback(async () => {
    try {
      if (!confirm('Are you sure you want to rollback the update?')) {
        return;
      }
      await invoke('rollback_update', { reason: 'Manual rollback by user' });
    } catch (error) {
      toast.error(`Failed to rollback: ${error}`);
    }
  }, []);

  const handleCreateBackup = useCallback(async () => {
    try {
      await invoke('create_backup');
      toast.success('Backup created successfully');
    } catch (error) {
      toast.error(`Failed to create backup: ${error}`);
    }
  }, []);

  const handleUpdateConfig = useCallback(async (newConfig: UpdateConfig) => {
    try {
      await invoke('update_update_config', { config: newConfig });
      setConfig(newConfig);
      toast.success('Update settings saved');
    } catch (error) {
      toast.error(`Failed to update settings: ${error}`);
    }
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading update information...</span>
      </div>
    );
  }

  if (showSettings && config) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(false)}
              className="p-1 hover:bg-gray-100 rounded-md"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold">Update Settings</h3>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.auto_check}
                onChange={(e) => handleUpdateConfig({ ...config, auto_check: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span>Automatically check for updates</span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Check interval (hours)</label>
            <input
              type="number"
              min="1"
              max="168"
              value={config.check_interval_hours}
              onChange={(e) => handleUpdateConfig({ ...config, check_interval_hours: parseInt(e.target.value) || 24 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.notify_user}
                onChange={(e) => handleUpdateConfig({ ...config, notify_user: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span>Show notifications for updates</span>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.prompt_before_install}
                onChange={(e) => handleUpdateConfig({ ...config, prompt_before_install: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span>Prompt before installing updates</span>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.backup_before_update}
                onChange={(e) => handleUpdateConfig({ ...config, backup_before_update: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span>Create backup before updates</span>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.pre_release}
                onChange={(e) => handleUpdateConfig({ ...config, pre_release: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span>Include pre-release versions</span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Update Channel</label>
            <select
              value={config.update_channel}
              onChange={(e) => handleUpdateConfig({ ...config, update_channel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="stable">Stable</option>
              <option value="beta">Beta</option>
              <option value="dev">Development</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between">
            <button
              onClick={handleCreateBackup}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Create Manual Backup
            </button>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Update Manager</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-100 rounded-md"
            title="Update Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Status Display */}
      <div className={cn(
        "p-4 rounded-lg border-2",
        status.type === 'Error' ? "border-red-200 bg-red-50" :
        status.type === 'Available' && 'is_critical' in status && status.is_critical ? "border-orange-200 bg-orange-50" :
        status.type === 'ReadyToRestart' ? "border-green-200 bg-green-50" :
        "border-blue-200 bg-blue-50"
      )}>
        {status.type === 'Idle' && (
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <p className="font-medium">Up to date</p>
              <p className="text-sm text-gray-600">
                Last checked: {formatDate(lastCheck)}
              </p>
            </div>
          </div>
        )}

        {status.type === 'Checking' && (
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
            <div>
              <p className="font-medium">Checking for updates...</p>
            </div>
          </div>
        )}

        {status.type === 'Available' && (
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              {status.is_critical ? (
                <AlertTriangle className="w-6 h-6 text-orange-500 mt-1" />
              ) : (
                <Download className="w-6 h-6 text-blue-500 mt-1" />
              )}
              <div className="flex-1">
                <p className="font-medium">
                  {status.is_critical ? 'Critical Update Available' : 'Update Available'}
                </p>
                <p className="text-sm text-gray-600">
                  Version {status.version} • {formatBytes(status.size)}
                </p>
                {status.release_notes && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                    <p className="font-medium mb-1">Release Notes:</p>
                    <p className="whitespace-pre-wrap">{status.release_notes}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleDownloadUpdate}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
              <button
                onClick={handleInstallUpdate}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Install Now
              </button>
            </div>
          </div>
        )}

        {status.type === 'Downloading' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Download className="w-6 h-6 text-blue-500" />
              <div className="flex-1">
                <p className="font-medium">Downloading {status.version}</p>
                <p className="text-sm text-gray-600">
                  {formatBytes(status.downloaded)} / {formatBytes(status.total)} ({status.progress.toFixed(1)}%)
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          </div>
        )}

        {status.type === 'Installing' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
              <div className="flex-1">
                <p className="font-medium">Installing {status.version}</p>
                <p className="text-sm text-gray-600">{status.progress.toFixed(1)}% complete</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          </div>
        )}

        {status.type === 'ReadyToRestart' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div className="flex-1">
                <p className="font-medium">Update Ready</p>
                <p className="text-sm text-gray-600">
                  {status.version} is ready to install. Restart the application to apply.
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleRestartApp}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Restart Now
              </button>
              <button
                onClick={() => invoke('clear_pending_update')}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Later
              </button>
            </div>
          </div>
        )}

        {status.type === 'RollingBack' && (
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-6 h-6 text-orange-500 animate-spin" />
            <div>
              <p className="font-medium">Rolling back update...</p>
              <p className="text-sm text-gray-600">{status.reason}</p>
            </div>
          </div>
        )}

        {status.type === 'RollbackComplete' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Shield className="w-6 h-6 text-green-500" />
              <div>
                <p className="font-medium">Rollback Complete</p>
                <p className="text-sm text-gray-600">
                  Restored to version {status.previous_version}
                </p>
              </div>
            </div>
          </div>
        )}

        {status.type === 'Error' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <div className="flex-1">
                <p className="font-medium">Update Error</p>
                <p className="text-sm text-red-600">{status.message}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleCheckForUpdates}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Try Again
              </button>
              {rollbackInfo && (
                <button
                  onClick={handleRollback}
                  className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                >
                  Rollback
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={handleCheckForUpdates}
          disabled={status.type === 'Checking' || loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <RefreshCw className={cn("w-4 h-4", (status.type === 'Checking' || loading) && "animate-spin")} />
          <span>Check for Updates</span>
        </button>

        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>Last check: {formatDate(lastCheck)}</span>
        </div>
      </div>

      {/* Update History */}
      {updateHistory.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium flex items-center space-x-2">
            <Info className="w-4 h-4" />
            <span>Recent Updates</span>
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {updateHistory.slice(0, 5).map((update, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 rounded-md border"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">Version {update.version}</p>
                    <p className="text-sm text-gray-600">{formatDate(new Date(update.release_date).getTime())}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatBytes(update.size)}</p>
                    {update.is_critical && (
                      <span className="inline-flex items-center px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                        Critical
                      </span>
                    )}
                  </div>
                </div>
                {update.release_notes && (
                  <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                    {update.release_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rollback Info */}
      {rollbackInfo && (
        <div className="space-y-3">
          <h4 className="font-medium flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Rollback Available</span>
          </h4>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="font-medium">Previous Version: {rollbackInfo.previous_version}</p>
            <p className="text-sm text-gray-600">
              Backup created: {formatDate(rollbackInfo.backup_timestamp)}
            </p>
            <button
              onClick={handleRollback}
              className="mt-2 px-3 py-1 bg-orange-500 text-white text-sm rounded-md hover:bg-orange-600"
            >
              Rollback to {rollbackInfo.previous_version}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};