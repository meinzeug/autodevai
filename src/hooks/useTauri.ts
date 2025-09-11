import { useState } from 'react';
import { TauriService } from '@/services/tauri';
import { useStore } from '@/store';
import toast from 'react-hot-toast';

export function useTauri() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const store = useStore();

  const executeCommand = async (
    command: string,
    _args?: any
  ): Promise<any> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await TauriService.executeClaudeFlow(command);
      store.appendOutput(result.output);
      toast.success('Command executed successfully');
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { executeCommand, isLoading, error };
}