import { defineConfig } from 'vite';

import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: {
    alias: {
      '@/*': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/configs': path.resolve(__dirname, './src/configs'),
      '@/schemas': path.resolve(__dirname, './src/schemas'),
      '@/layouts': path.resolve(__dirname, './src/layouts'),
      '@/assets': path.resolve(__dirname, './src/assets'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/hooks': path.resolve(__dirname, './src/utils/hooks'),
      '@/context': path.resolve(__dirname, './src/utils/context'),
      '@/navigation': path.resolve(__dirname, './src/utils/navigation'),
      '@/integrations': path.resolve(__dirname, './src/integrations'),
      '@/queries': path.resolve(__dirname, './src/queries'),
    },
  },
});
