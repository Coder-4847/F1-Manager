import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this as a project site at /F1-Manager/, so the
  // production build needs that base path baked into asset URLs. The dev
  // server keeps serving from the root.
  base: command === 'build' ? '/F1-Manager/' : '/',
  plugins: [react()],
}))
