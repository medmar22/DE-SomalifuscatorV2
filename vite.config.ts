import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ensure 'base' is not set to something unexpected,
  // default is '/' which is correct for accessing at root.
  // base: '/',
  server: {
    port: 5173 // Ensure port is 5173 if you rely on it
    // You might need proxy settings if your API was on a different domain,
    // but not needed when both run on localhost with CORS enabled on backend.
  }
})