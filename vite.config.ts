import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { apiMiddlewarePlugin } from './server/index'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    apiMiddlewarePlugin(),
  ],
  server: {
    port: 5173,
    open: true,
  },
})
