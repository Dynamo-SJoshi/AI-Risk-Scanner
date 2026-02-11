import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: This must be '/' for Render. 
  // If it was set to '/AI-Risk-Scanner/', change it back to '/'
  base: '/', 
})
