import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/wind-validation-dashboard/',
  server: {
    port: 3001,
  },
})
