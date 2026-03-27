export {};

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      checkForUpdates: () => Promise<{ ok: boolean }>;
      onWindowStateChange: (callback: (maximized: boolean) => void) => () => void;
    };
  }
}
