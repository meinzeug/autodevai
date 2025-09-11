import { useEffect } from 'react';
import { TauriService } from '@/services/tauri';
import { useStore } from '@/store';
import toast from 'react-hot-toast';

export function useSystemCheck() {
  const { setPrerequisites, setSystemInfo } = useStore();

  useEffect(() => {
    const checkSystem = async () => {
      try {
        const [prerequisites, systemInfo] = await Promise.all([
          TauriService.checkPrerequisites(),
          TauriService.getSystemInfo(),
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
      }
    };

    checkSystem();
  }, [setPrerequisites, setSystemInfo]);
}