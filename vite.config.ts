import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three-core'
          if (id.includes('@react-three')) return 'r3f'
          if (id.includes('gsap') || id.includes('framer-motion')) return 'motion'
        },
      },
    },
  },
})
