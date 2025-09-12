import React, { useState, useEffect } from 'react';
import { TauriService } from '../../services/tauri';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Plus, Play, Square, Trash2, RefreshCw, Server } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

interface Sandbox {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'creating';
  port: number;
  createdAt: string;
}

export const SandboxManager: React.FC = () => {
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newSandboxName, setNewSandboxName] = useState('');

  useEffect(() => {
    loadSandboxes();
  }, []);

  const loadSandboxes = async () => {
    try {
      const result = await TauriService.listSandboxes();
      setSandboxes(result);
    } catch (error) {
      console.error('Failed to load sandboxes:', error);
    }
  };

  const createSandbox = async () => {
    if (!newSandboxName.trim()) {
      toast.error('Please enter a sandbox name');
      return;
    }

    setIsCreating(true);
    try {
      const projectId = `sandbox-${Date.now()}`;
      await TauriService.createSandbox(projectId);
      
      const newSandbox: Sandbox = {
        id: projectId,
        name: newSandboxName,
        status: 'running',
        port: 50010 + sandboxes.length * 10,
        createdAt: new Date().toISOString(),
      };
      
      setSandboxes([...sandboxes, newSandbox]);
      setNewSandboxName('');
      toast.success('Sandbox created successfully');
    } catch (error) {
      toast.error('Failed to create sandbox');
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteSandbox = async (id: string) => {
    try {
      await TauriService.deleteSandbox(id);
      setSandboxes(sandboxes.filter(s => s.id !== id));
      toast.success('Sandbox deleted');
    } catch (error) {
      toast.error('Failed to delete sandbox');
      console.error(error);
    }
  };

  const toggleSandbox = async (sandbox: Sandbox) => {
    try {
      if (sandbox.status === 'running') {
        await TauriService.stopSandbox(sandbox.id);
        setSandboxes(sandboxes.map(s => 
          s.id === sandbox.id ? { ...s, status: 'stopped' } : s
        ));
        toast.success('Sandbox stopped');
      } else {
        await TauriService.startSandbox(sandbox.id);
        setSandboxes(sandboxes.map(s => 
          s.id === sandbox.id ? { ...s, status: 'running' } : s
        ));
        toast.success('Sandbox started');
      }
    } catch (error) {
      toast.error('Failed to toggle sandbox');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create New Sandbox */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Create New Sandbox</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newSandboxName}
            onChange={(e) => setNewSandboxName(e.target.value)}
            placeholder="Enter sandbox name..."
            className={cn(
              'flex-1 px-3 py-2 rounded-lg border',
              'border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
            disabled={isCreating}
          />
          <Button
            onClick={createSandbox}
            disabled={isCreating || !newSandboxName.trim()}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Sandbox
          </Button>
        </div>
      </Card>

      {/* Sandboxes List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Active Sandboxes</h3>
          <Button
            onClick={loadSandboxes}
            variant="ghost"
            size="sm"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {sandboxes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No sandboxes created yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sandboxes.map((sandbox) => (
              <div
                key={sandbox.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      sandbox.status === 'running' ? 'bg-green-500' : 'bg-gray-400'
                    )} />
                    <div>
                      <div className="font-medium">{sandbox.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Port: {sandbox.port} • Status: {sandbox.status}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => toggleSandbox(sandbox)}
                      variant="ghost"
                      size="sm"
                    >
                      {sandbox.status === 'running' ? (
                        <Square className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      onClick={() => deleteSandbox(sandbox.id)}
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
        )}
      </Card>
    </div>
  );
};

export default SandboxManager;