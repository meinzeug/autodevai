import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Terminal, X, Plus, Settings, Download, Upload, Maximize2 } from 'lucide-react';
import { Card, Button, Tabs, TabsContent, TabsList, TabsTrigger, Badge } from '../../components/ui';
import { TerminalOutput } from '../../components/ui';
import { cn } from '../../utils/cn';

interface TerminalSession {
  id: string;
  name: string;
  cwd: string;
  history: TerminalEntry[];
  isActive: boolean;
  pid?: number;
  startTime: string;
}

interface TerminalEntry {
  id: string;
  timestamp: string;
  type: 'command' | 'output' | 'error';
  content: string;
  exitCode?: number;
  duration?: number;
}

interface TerminalViewProps {
  className?: string;
  onExecute?: (command: string, sessionId: string) => Promise<string>;
}

const mockSessions: TerminalSession[] = [
  {
    id: 'session-1',
    name: 'Main Terminal',
    cwd: '/home/dennis/autodevai',
    isActive: true,
    pid: 12345,
    startTime: new Date().toISOString(),
    history: [
      {
        id: 'entry-1',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        type: 'command',
        content: 'ls -la'
      },
      {
        id: 'entry-2',
        timestamp: new Date(Date.now() - 59000).toISOString(),
        type: 'output',
        content: `total 48
drwxr-xr-x  12 dennis dennis  4096 Sep 11 10:30 .
drwxr-xr-x  18 dennis dennis  4096 Sep 10 15:20 ..
-rw-r--r--   1 dennis dennis   220 Sep  8 10:15 .bashrc
drwxr-xr-x   8 dennis dennis  4096 Sep 11 10:29 .git
-rw-r--r--   1 dennis dennis  1654 Sep 11 09:45 package.json
drwxr-xr-x   4 dennis dennis  4096 Sep 11 10:30 src
drwxr-xr-x   2 dennis dennis  4096 Sep 10 16:20 tests`,
        exitCode: 0,
        duration: 120
      },
      {
        id: 'entry-3',
        timestamp: new Date(Date.now() - 30000).toISOString(),
        type: 'command',
        content: 'npm run dev'
      },
      {
        id: 'entry-4',
        timestamp: new Date(Date.now() - 29000).toISOString(),
        type: 'output',
        content: `> autodevai-neural-bridge-platform@1.0.0 dev
> vite --port 50010

  VITE v6.0.1  ready in 1847 ms

  ➜  Local:   http://localhost:50010/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help`,
        exitCode: 0,
        duration: 1847
      }
    ]
  },
  {
    id: 'session-2',
    name: 'Docker Terminal',
    cwd: '/var/lib/docker',
    isActive: false,
    pid: 23456,
    startTime: new Date(Date.now() - 3600000).toISOString(),
    history: [
      {
        id: 'entry-5',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        type: 'command',
        content: 'docker ps'
      },
      {
        id: 'entry-6',
        timestamp: new Date(Date.now() - 1799000).toISOString(),
        type: 'output',
        content: `CONTAINER ID   IMAGE     COMMAND                  CREATED        STATUS        PORTS     NAMES
7a8b9c1d2e3f   node:18   "docker-entrypoint.s…"   2 hours ago    Up 2 hours    3000/tcp  autodevai_app
4f5g6h7i8j9k   redis:7   "docker-entrypoint.s…"   3 hours ago    Up 3 hours    6379/tcp  redis_cache`,
        exitCode: 0,
        duration: 89
      }
    ]
  }
];

export function TerminalView({ className, onExecute }: TerminalViewProps) {
  const [sessions, setSessions] = useState<TerminalSession[]>(mockSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>('session-1');
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [theme, setTheme] = useState<'dark' | 'light' | 'matrix'>('dark');
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // Focus input when session changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeSessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [activeSession.history]);

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentCommand.trim() && !isExecuting) {
      e.preventDefault();
      await executeCommand(currentCommand.trim());
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentCommand('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Tab completion could be implemented here
    } else if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      // Cancel current command
      setCurrentCommand('');
      setIsExecuting(false);
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      // Clear terminal
      handleClearSession(activeSessionId);
    }
  }, [currentCommand, commandHistory, historyIndex, isExecuting, activeSessionId]);

  const executeCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;

    setIsExecuting(true);
    setHistoryIndex(-1);
    
    // Add command to history
    setCommandHistory(prev => [command, ...prev.slice(0, 99)]);
    
    // Add command entry to session
    const commandEntry: TerminalEntry = {
      id: `entry-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'command',
      content: command
    };

    setSessions(prev => prev.map(session => 
      session.id === activeSessionId
        ? { ...session, history: [...session.history, commandEntry] }
        : session
    ));

    setCurrentCommand('');

    try {
      let output: string;
      const exitCode = 0;
      const startTime = Date.now();

      if (onExecute) {
        output = await onExecute(command, activeSessionId);
      } else {
        // Mock command execution
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
        output = await mockCommandExecution(command, activeSession.cwd);
      }

      const duration = Date.now() - startTime;

      // Add output entry
      const outputEntry: TerminalEntry = {
        id: `entry-${Date.now()}-output`,
        timestamp: new Date().toISOString(),
        type: output.includes('Error:') || output.includes('command not found') ? 'error' : 'output',
        content: output,
        exitCode,
        duration
      };

      setSessions(prev => prev.map(session => 
        session.id === activeSessionId
          ? { ...session, history: [...session.history, outputEntry] }
          : session
      ));

      // Update CWD if cd command
      if (command.startsWith('cd ')) {
        const newPath = command.split(' ')[1] || '~';
        setSessions(prev => prev.map(session => 
          session.id === activeSessionId
            ? { ...session, cwd: newPath === '~' ? '/home/dennis' : newPath }
            : session
        ));
      }

    } catch (error) {
      const errorEntry: TerminalEntry = {
        id: `entry-${Date.now()}-error`,
        timestamp: new Date().toISOString(),
        type: 'error',
        content: `Error: ${error}`,
        exitCode: 1
      };

      setSessions(prev => prev.map(session => 
        session.id === activeSessionId
          ? { ...session, history: [...session.history, errorEntry] }
          : session
      ));
    } finally {
      setIsExecuting(false);
    }
  }, [activeSessionId, activeSession.cwd, onExecute]);

  const mockCommandExecution = async (command: string, cwd: string): Promise<string> => {
    const [cmd, ...args] = command.split(' ');
    
    switch (cmd) {
      case 'ls':
        return 'README.md\npackage.json\nsrc/\ntests/\n.git/';
      case 'pwd':
        return cwd;
      case 'whoami':
        return 'dennis';
      case 'date':
        return new Date().toString();
      case 'echo':
        return args.join(' ');
      case 'ps':
        return 'PID  TTY      TIME CMD\n1234 pts/0    00:00:01 bash\n5678 pts/0    00:00:00 ps';
      case 'df':
        return 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1       20971520 8388608  12582912  40% /';
      case 'free':
        return 'total        used        free      shared  buff/cache   available\nMem:    8192000     3276800     2867200       81920     2048000     4734720';
      case 'uname':
        return 'Linux';
      case 'cat':
        if (args[0] === '/etc/os-release') {
          return 'NAME="Ubuntu"\nVERSION="22.04.3 LTS (Jammy Jellyfish)"\nID=ubuntu';
        }
        return `cat: ${args[0]}: No such file or directory`;
      case 'npm':
        if (args[0] === 'run' && args[1] === 'build') {
          return 'Building application...\n> vite build\n\n✓ built in 2.34s';
        }
        if (args[0] === '--version') {
          return '10.2.4';
        }
        return `npm ${args.join(' ')} completed successfully`;
      case 'docker':
        if (args[0] === 'ps') {
          return 'CONTAINER ID   IMAGE     COMMAND      CREATED       STATUS       PORTS     NAMES\n7a8b9c1d2e3f   node:18   "npm start"  2 hours ago   Up 2 hours   3000/tcp  app';
        }
        return `docker ${args.join(' ')} completed`;
      case 'git':
        if (args[0] === 'status') {
          return 'On branch main\nYour branch is up to date with \'origin/main\'.\n\nnothing to commit, working tree clean';
        }
        return `git ${args.join(' ')} completed`;
      case 'clear':
        return ''; // Will be handled separately
      default:
        if (Math.random() < 0.1) {
          return `Error: command not found: ${cmd}`;
        }
        return `Executed: ${command}\nOutput would appear here in a real terminal.`;
    }
  };

  const handleNewSession = useCallback(() => {
    const newSession: TerminalSession = {
      id: `session-${Date.now()}`,
      name: `Terminal ${sessions.length + 1}`,
      cwd: '/home/dennis/autodevai',
      isActive: true,
      startTime: new Date().toISOString(),
      history: [
        {
          id: `entry-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'output',
          content: 'Welcome to AutoDev-AI Terminal\nType \'help\' for available commands.'
        }
      ]
    };

    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  }, [sessions.length]);

  const handleCloseSession = useCallback((sessionId: string) => {
    if (sessions.length === 1) return; // Don't close last session

    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (sessionId === activeSessionId) {
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      setActiveSessionId(remainingSessions[0]?.id || '');
    }
  }, [sessions, activeSessionId]);

  const handleClearSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId
        ? { ...session, history: [] }
        : session
    ));
  }, []);

  const handleExportHistory = useCallback(() => {
    const exportData = {
      session: activeSession,
      exportDate: new Date().toISOString(),
      totalEntries: activeSession.history.length
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `terminal-session-${activeSession.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [activeSession]);

  const getThemeStyles = () => {
    switch (theme) {
      case 'light':
        return 'bg-white text-black';
      case 'matrix':
        return 'bg-black text-green-400';
      default:
        return 'bg-gray-900 text-white';
    }
  };

  const getPrompt = () => {
    return `dennis@autodevai:${activeSession.cwd}$ `;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Terminal className="w-7 h-7" />
            Terminal Sessions
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Interactive terminal with command execution
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
            className="border rounded px-2 py-1 text-sm bg-background"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="matrix">Matrix</option>
          </select>
          <Button variant="outline" size="sm" onClick={handleExportHistory}>
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Terminal Sessions */}
      <Card className="p-0 overflow-hidden">
        {/* Session Tabs */}
        <div className="flex items-center border-b bg-gray-100 dark:bg-gray-800">
          <div className="flex items-center overflow-x-auto">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 border-r cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
                  session.id === activeSessionId && 'bg-white dark:bg-gray-900'
                )}
                onClick={() => setActiveSessionId(session.id)}
              >
                <Terminal className="w-4 h-4" />
                <span className="text-sm whitespace-nowrap">{session.name}</span>
                {sessions.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-4 h-4 p-0 hover:bg-red-100 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseSession(session.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleNewSession}
            className="ml-auto mr-2"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Terminal Content */}
        <div className={cn('h-96 overflow-hidden', getThemeStyles())} style={{ fontSize: `${fontSize}px` }}>
          {/* Output Area */}
          <div ref={outputRef} className="h-full overflow-y-auto p-4 font-mono">
            <div className="space-y-1">
              {activeSession.history.map((entry) => (
                <div key={entry.id} className="whitespace-pre-wrap">
                  {entry.type === 'command' ? (
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 shrink-0">{getPrompt()}</span>
                      <span>{entry.content}</span>
                    </div>
                  ) : (
                    <div className={cn(
                      entry.type === 'error' ? 'text-red-400' : 'text-current',
                      'ml-2'
                    )}>
                      {entry.content}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Current Command Line */}
              <div className="flex items-start gap-2">
                <span className="text-green-400 shrink-0">{getPrompt()}</span>
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={currentCommand}
                    onChange={(e) => setCurrentCommand(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isExecuting}
                    className={cn(
                      'w-full bg-transparent border-none outline-none font-mono',
                      getThemeStyles().split(' ')[1] // Get text color
                    )}
                    style={{ fontSize: `${fontSize}px` }}
                    placeholder={isExecuting ? 'Executing...' : 'Enter command'}
                  />
                  {isExecuting && (
                    <div className="absolute right-0 top-0 text-yellow-400 animate-pulse">⏳</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-t bg-gray-50 dark:bg-gray-800 text-sm">
          <div className="flex items-center gap-4">
            <Badge variant="outline">PID: {activeSession.pid || 'N/A'}</Badge>
            <Badge variant="outline">CWD: {activeSession.cwd}</Badge>
            <Badge variant={isExecuting ? 'default' : 'secondary'}>
              {isExecuting ? 'Executing' : 'Ready'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span>History: {commandHistory.length}</span>
            <span>•</span>
            <span>Entries: {activeSession.history.length}</span>
            <span>•</span>
            <span>Font: {fontSize}px</span>
            <div className="flex items-center gap-1 ml-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFontSize(prev => Math.max(10, prev - 1))}
                className="w-6 h-6 p-0"
              >
                -
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFontSize(prev => Math.min(20, prev + 1))}
                className="w-6 h-6 p-0"
              >
                +
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default TerminalView;