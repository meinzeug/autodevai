import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Play,
  Pause,
  Square,
  RotateCcw
} from 'lucide-react';
import { cn } from '../utils/cn';

interface ProgressStep {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  startTime?: Date;
  endTime?: Date;
  progress?: number;
  error?: string;
}

interface ProgressTrackerProps {
  progress: number;
  taskName: string;
  className?: string;
  steps?: ProgressStep[];
  showEstimatedTime?: boolean;
  showSteps?: boolean;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  isPaused?: boolean;
  variant?: 'linear' | 'circular' | 'steps';
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  progress,
  taskName,
  className,
  steps = [],
  showEstimatedTime = true,
  showSteps = false,
  onCancel,
  onPause,
  onResume,
  isPaused = false,
  variant = 'linear'
}) => {
  const [startTime] = useState<Date>(new Date());
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPaused) {
        setElapsedTime(Date.now() - startTime.getTime());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isPaused]);

  // Calculate estimated time remaining
  const estimatedTimeRemaining = useMemo(() => {
    if (progress <= 0 || progress >= 100) return 0;
    
    const timePerPercent = elapsedTime / progress;
    const remainingPercent = 100 - progress;
    return Math.round((timePerPercent * remainingPercent) / 1000); // in seconds
  }, [elapsedTime, progress]);

  // Format time in MM:SS format
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get progress color based on progress value
  const getProgressColor = (progress: number): string => {
    if (progress < 30) return 'from-red-500 to-orange-500';
    if (progress < 70) return 'from-yellow-500 to-orange-500';
    return 'from-green-500 to-blue-500';
  };

  // Get status icon
  const getStatusIcon = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'active':
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />;
    }
  };

  if (variant === 'circular') {
    const circumference = 2 * Math.PI * 40; // radius = 40
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="url(#progressGradient)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-300 ease-out"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(progress)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {isPaused ? 'Paused' : 'Progress'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'steps' && steps.length > 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Task Progress
          </h3>
          <div className="flex items-center space-x-2">
            {onPause && onResume && (
              <button
                onClick={isPaused ? onResume : onPause}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? (
                  <Play className="w-4 h-4 text-green-500" />
                ) : (
                  <Pause className="w-4 h-4 text-blue-500" />
                )}
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Cancel"
              >
                <Square className="w-4 h-4 text-red-500" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {getStatusIcon(step.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-sm font-medium",
                    step.status === 'completed' ? "text-green-600 dark:text-green-400" :
                    step.status === 'active' ? "text-blue-600 dark:text-blue-400" :
                    step.status === 'error' ? "text-red-600 dark:text-red-400" :
                    "text-gray-600 dark:text-gray-400"
                  )}>
                    {step.name}
                  </span>
                  {step.progress !== undefined && step.status === 'active' && (
                    <span className="text-xs text-gray-500">
                      {Math.round(step.progress)}%
                    </span>
                  )}
                </div>
                {step.status === 'error' && step.error && (
                  <div className="text-xs text-red-500 mt-1">
                    {step.error}
                  </div>
                )}
                {step.status === 'active' && step.progress !== undefined && (
                  <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default linear variant
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className={cn(
            "w-5 h-5",
            isPaused ? "text-yellow-500" : "text-blue-500",
            !isPaused && "animate-pulse"
          )} />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {taskName}
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          {showEstimatedTime && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>
                {isPaused ? 'Paused' : `${formatTime(Math.floor(elapsedTime / 1000))} elapsed`}
              </span>
              {estimatedTimeRemaining > 0 && !isPaused && (
                <span>
                  • ~{formatTime(estimatedTimeRemaining)} remaining
                </span>
              )}
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            {onPause && onResume && (
              <button
                onClick={isPaused ? onResume : onPause}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? (
                  <Play className="w-3 h-3 text-green-500" />
                ) : (
                  <Pause className="w-3 h-3 text-blue-500" />
                )}
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Cancel"
              >
                <Square className="w-3 h-3 text-red-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className={cn(
              "h-full bg-gradient-to-r transition-all duration-500 ease-out",
              getProgressColor(progress),
              isPaused && "opacity-50"
            )}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        
        {/* Progress percentage */}
        <div className="absolute right-0 -top-6 text-xs font-medium text-gray-600 dark:text-gray-400">
          {Math.round(progress)}%
        </div>
      </div>

      {/* Additional info */}
      {isPaused && (
        <div className="flex items-center justify-center text-xs text-yellow-600 dark:text-yellow-400">
          <Pause className="w-3 h-3 mr-1" />
          Task execution paused
        </div>
      )}
    </div>
  );
};