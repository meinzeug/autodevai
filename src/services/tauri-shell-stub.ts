// Temporary stub for @tauri-apps/plugin-shell - replace when dependency is fixed
export const Command = {
  create: (_cmd: string, _args?: string[]) => ({
    execute: async () => ({ success: true, stdout: '', stderr: '', code: 0 })
  })
};

export default { Command };