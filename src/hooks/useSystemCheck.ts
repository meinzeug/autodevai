import { useEffect } from 'react';
import { TauriService } from '../services/tauri';
import { useStore } from '../store';
import toast from 'react-hot-toast';

export function useSystemCheck() {
  const { setPrerequisites, setSystemInfo } = useStore();

  useEffect(() => {
    const checkSystem = async () => {
      try {
        const service = TauriService.getInstance();
        const [prerequisites, systemInfo] = await Promise.all([
          service.checkPrerequisites(),
          service.getSystemInfo(),
        ]);

        setPrerequisites(prerequisites);
        setSystemInfo(systemInfo);

        const missing = [];
        if (!prerequisites.claude_flow_ready) missing.push('Claude-Flow');
        if (!prerequisites.codex_ready) missing.push('OpenAI Codex');
        if (!prerequisites.docker_ready) missing.push('Docker (optional)');

        if (missing.length > 0) {
          toast.error(`Missing: ${missing.join(', ')}`);
        }
      } catch (error) {
        console.error('System check failed:', error);
        toast.error('System check failed. Some features may not work properly.');
      }
    };

    checkSystem();
  }, [setPrerequisites, setSystemInfo]);
}