import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // Setting base to './' ensures assets are loaded via relative paths.
    // This is required for GitHub Pages deployments in subdirectories.
    base: './',
    define: {
      // Shims process.env.API_KEY so it's available in the built browser app.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});