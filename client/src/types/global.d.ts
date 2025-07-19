// Global type definitions for performance optimizations
declare global {
  interface Window {
    gc?: () => void; // Optional garbage collection for performance
  }
}

export {};