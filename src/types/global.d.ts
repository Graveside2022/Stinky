// Global type definitions

// Extend Node.js global namespace if needed
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      // Add other environment variables here
    }
  }
}

// Ensure this file is treated as a module
export {};
