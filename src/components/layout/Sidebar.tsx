import { cn } from '@/utils/cn';
import { Cpu, Zap, Box, History, BarChart3, FileCode, Terminal } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const menuItems = [
  { id: 'orchestration', label: 'Orchestration', icon: Cpu },
  { id: 'execution', label: 'Execution', icon: Zap },
  { id: 'sandbox', label: 'Sandboxes', icon: Box },
  { id: 'history', label: 'History', icon: History },
  { id: 'monitoring', label: 'Monitoring', icon: BarChart3 },
  { id: 'files', label: 'Files', icon: FileCode },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
      <nav className="p-4 space-y-2">
        {menuItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                activeView === item.id
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
