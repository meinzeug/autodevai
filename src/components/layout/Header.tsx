import React from 'react';
import { Brain, Moon, Sun, Settings, Github } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../Button';
import { cn } from '../../utils/cn';

interface HeaderProps {
  className?: string;
  onSettingsClick?: () => void;
}

export function Header({ className, onSettingsClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={cn(
      'flex items-center justify-between px-4 py-3 border-b border-border bg-background',
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Brain className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-bold text-foreground">
            AutoDev-AI Neural Bridge
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="small"
          onClick={toggleTheme}
          className="p-2"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="small"
          onClick={onSettingsClick}
          className="p-2"
        >
          <Settings className="w-5 h-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="small"
          className="p-2"
        >
          <Github className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}