/// <reference types="vite/client" />

interface Window {
  __MOTION_RENDER__?: {
    ready: boolean;
    getDurationMs: () => number;
    seek: (seconds: number) => Promise<void>;
    play: () => void;
  };
}
