import React from 'react';
import { Task } from '../../types';
import { Clock, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

interface TaskListProps {
  tasks: Task[];
  onViewTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  className?: string;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onViewTask,
  onDeleteTask,
  className,
}) => {
  if (tasks.length === 0) {
    return (
      <div className={cn('text-center py-12 text-gray-500 dark:text-gray-400', className)}>
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No tasks executed yet</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {tasks.map((task) => (
        <div
          key={task.id}
          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {task.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : task.status === 'failed' ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <Clock className="w-5 h-5 text-yellow-500" />
                )}
                <span className="font-medium">{task.description}</span>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div>Mode: {task.mode} {task.tool && `• Tool: ${task.tool}`}</div>
                <div>Created: {new Date(task.createdAt).toLocaleString()}</div>
                {task.completedAt && (
                  <div>Duration: {((new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime()) / 1000).toFixed(1)}s</div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => onViewTask(task)}
                variant="ghost"
                size="sm"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => onDeleteTask(task.id)}
                variant="ghost"
                size="sm"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskList;