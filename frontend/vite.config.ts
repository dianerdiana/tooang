import path from 'node:path';

import { defineConfig } from 'vite';

import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';

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
      '@/*': path.resolve(import.meta.dirname, './src'),
      '@/components': path.resolve(import.meta.dirname, './src/components'),
      '@/configs': path.resolve(import.meta.dirname, './src/configs'),
      '@/schemas': path.resolve(import.meta.dirname, './src/schemas'),
      '@/layouts': path.resolve(import.meta.dirname, './src/layouts'),
      '@/assets': path.resolve(import.meta.dirname, './src/assets'),
      '@/utils': path.resolve(import.meta.dirname, './src/utils'),
      '@/lib': path.resolve(import.meta.dirname, './src/lib'),
      '@/types': path.resolve(import.meta.dirname, './src/types'),
      '@/services': path.resolve(import.meta.dirname, './src/services'),
      '@/features': path.resolve(import.meta.dirname, './src/features'),
      '@/hooks': path.resolve(import.meta.dirname, './src/utils/hooks'),
      '@/context': path.resolve(import.meta.dirname, './src/utils/context'),
      '@/navigation': path.resolve(import.meta.dirname, './src/utils/navigation'),
      '@/integrations': path.resolve(import.meta.dirname, './src/integrations'),
      '@/queries': path.resolve(import.meta.dirname, './src/queries'),
    },
  },
});
