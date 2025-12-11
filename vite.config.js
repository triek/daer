import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/daer/',
  server: {
    proxy: {
      '/items': 'http://localhost:3000',
    },
  },
})
