import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { ClaudeFlowCommandType } from '../../types';
import { Network, Code, Brain, Database } from 'lucide-react';
import { cn } from '../../utils/cn';

interface CommandSelectorProps {
  value?: string;
  onValueChange?: ((value: string) => void) | undefined;
  disabled?: boolean;
  className?: string;
}

const commands = [
  {
    value: 'swarm' as ClaudeFlowCommandType,
    label: 'Swarm Intelligence',
    description: 'Coordinate multiple AI agents for complex tasks',
    icon: Network,
    category: 'orchestration',
  },
  {
    value: 'sparc' as ClaudeFlowCommandType,
    label: 'SPARC Methodology',
    description: 'Systematic development with specification-driven approach',
    icon: Code,
    category: 'development',
  },
  {
    value: 'hive-mind' as ClaudeFlowCommandType,
    label: 'Hive Mind',
    description: 'Collective intelligence processing',
    icon: Brain,
    category: 'intelligence',
  },
  {
    value: 'memory' as ClaudeFlowCommandType,
    label: 'Memory Management',
    description: 'Persistent context and knowledge storage',
    icon: Database,
    category: 'storage',
  },
] as const;

export function CommandSelector({
  value,
  onValueChange,
  disabled = false,
  className,
}: CommandSelectorProps) {
  const handleValueChange = onValueChange || (() => {});
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-foreground">Command Type</label>
      <Select value={value || ''} onValueChange={handleValueChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select command type..." />
        </SelectTrigger>
        <SelectContent>
          {commands.map(command => {
            const IconComponent = command.icon;
            return (
              <SelectItem key={command.value} value={command.value}>
                <div className="flex items-center space-x-3">
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{command.label}</span>
                      <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                        {command.category}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{command.description}</span>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
