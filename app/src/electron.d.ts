export {};

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      onWindowStateChange: (callback: (maximized: boolean) => void) => () => void;
    };
  }
}
