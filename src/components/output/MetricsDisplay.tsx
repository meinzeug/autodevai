import React from 'react';
import { Task } from '../../types';
import { Activity, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { Card } from '../common/Card';
import { cn } from '../../utils/cn';

interface MetricsDisplayProps {
  tasks: Task[];
  className?: string;
}

export const MetricsDisplay: React.FC<MetricsDisplayProps> = ({
  tasks,
  className,
}) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const failedTasks = tasks.filter(t => t.status === 'failed').length;
  
  const successRate = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;
    
  const avgDuration = tasks
    .filter(t => t.completedAt && t.createdAt)
    .reduce((acc, task) => {
      const duration = new Date(task.completedAt!).getTime() - new Date(task.createdAt).getTime();
      return acc + duration;
    }, 0) / (completedTasks || 1);

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-5 gap-4', className)}>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-500" />
          <div>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-green-500" />
          <div>
            <div className="text-2xl font-bold">{completedTasks}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <XCircle className="w-8 h-8 text-red-500" />
          <div>
            <div className="text-2xl font-bold">{failedTasks}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-purple-500" />
          <div>
            <div className="text-2xl font-bold">{successRate}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Clock className="w-8 h-8 text-orange-500" />
          <div>
            <div className="text-2xl font-bold">
              {avgDuration > 0 ? `${(avgDuration / 1000).toFixed(1)}s` : 'N/A'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Duration</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MetricsDisplay;