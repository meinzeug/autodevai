// Tauri API Type Declarations
declare module '@tauri-apps/api/core' {
  export function invoke(command: string, args?: any): Promise<any>;
}

declare module '@tauri-apps/api/event' {
  export interface Event<T> {
    event: string;
    payload: T;
    windowLabel: string;
    id: number;
  }

  export function listen<T>(
    event: string,
    handler: (event: Event<T>) => void
  ): Promise<() => void>;

  export function once<T>(
    event: string,
    handler: (event: Event<T>) => void
  ): Promise<() => void>;

  export function emit(event: string, payload?: unknown): Promise<void>;
}

declare module '@tauri-apps/api/shell' {
  export interface ChildProcess {
    code: number | null;
    signal: number | null;
    stdout: string;
    stderr: string;
  }

  export class Command {
    constructor(program: string, args?: string[] | string, options?: any);
    execute(): Promise<ChildProcess>;
    spawn(): Promise<any>;
    stdout(callback: (line: string) => void): Command;
    stderr(callback: (line: string) => void): Command;
  }

  export function open(path: string, openWith?: string): Promise<void>;
}

declare module '@tauri-apps/api/window' {
  export class WebviewWindow {
    constructor(label: string, options?: any);
  }
  
  export function getCurrent(): WebviewWindow;
  export function getAll(): WebviewWindow[];
}

declare module '@tauri-apps/api/fs' {
  export interface FileEntry {
    path: string;
    name?: string;
    children?: FileEntry[];
  }

  export function readTextFile(path: string): Promise<string>;
  export function writeTextFile(path: string, data: string): Promise<void>;
  export function readDir(path: string): Promise<FileEntry[]>;
  export function createDir(path: string): Promise<void>;
  export function removeFile(path: string): Promise<void>;
  export function removeDir(path: string): Promise<void>;
}

declare module '@tauri-apps/api/path' {
  export function appDir(): Promise<string>;
  export function appConfigDir(): Promise<string>;
  export function appDataDir(): Promise<string>;
  export function appLocalDataDir(): Promise<string>;
  export function appCacheDir(): Promise<string>;
  export function appLogDir(): Promise<string>;
  export function audioDir(): Promise<string>;
  export function cacheDir(): Promise<string>;
  export function configDir(): Promise<string>;
  export function dataDir(): Promise<string>;
  export function desktopDir(): Promise<string>;
  export function documentDir(): Promise<string>;
  export function downloadDir(): Promise<string>;
  export function executableDir(): Promise<string>;
  export function fontDir(): Promise<string>;
  export function homeDir(): Promise<string>;
  export function localDataDir(): Promise<string>;
  export function pictureDir(): Promise<string>;
  export function publicDir(): Promise<string>;
  export function resourceDir(): Promise<string>;
  export function runtimeDir(): Promise<string>;
  export function templateDir(): Promise<string>;
  export function videoDir(): Promise<string>;
}