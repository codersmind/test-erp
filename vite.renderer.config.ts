import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    // Plugin to handle whatsapp-web.js dynamic requires
    {
      name: 'whatsapp-web-js-external',
      resolveId(id) {
        // Mark whatsapp-web.js and its dynamic requires as external
        if (id === 'whatsapp-web.js' || id === 'qrcode-terminal') {
          return { id, external: true }
        }
        // Handle dynamic requires that whatsapp-web.js uses
        if (id.startsWith('WAWeb') || id.startsWith('@wppconnect')) {
          return { id, external: true }
        }
        return null
      },
      // Prevent Vite from analyzing whatsapp-web.js during optimization
      load(id) {
        // Return empty module for whatsapp-web.js to prevent Vite from analyzing it
        if (id.includes('whatsapp-web.js') || id.includes('qrcode-terminal')) {
          return { code: 'module.exports = {}', map: null }
        }
        // Handle dynamic requires that whatsapp-web.js uses
        if (id.startsWith('WAWeb') || id.startsWith('@wppconnect')) {
          return { code: 'module.exports = {}', map: null }
        }
        return null
      },
      // Intercept and handle dynamic requires during optimization
      transform(code, id) {
        // Replace dynamic requires in whatsapp-web.js with empty objects
        if (id.includes('whatsapp-web.js')) {
          // Replace all problematic require calls with empty objects
          let transformedCode = code
          // Replace WAWeb* requires
          transformedCode = transformedCode.replace(/require\(['"]WAWeb[^'"]*['"]\)/g, '{}')
          // Replace @wppconnect requires
          transformedCode = transformedCode.replace(/require\(['"]@wppconnect[^'"]*['"]\)/g, '{}')
          if (transformedCode !== code) {
            return {
              code: transformedCode,
              map: null,
            }
          }
        }
        return null
      },
    },
  ],
  build: {
    outDir: '.vite/build/renderer/main_window',
    rollupOptions: {
      external: (id) => {
        // Exclude whatsapp-web.js and its dynamic requires from bundling
        if (id === 'whatsapp-web.js' || id === 'qrcode-terminal') {
          return true
        }
        // Exclude dynamic requires that whatsapp-web.js uses internally
        if (id.startsWith('WAWeb') || id.startsWith('@wppconnect')) {
          return true
        }
        return false
      },
    },
  },
  optimizeDeps: {
    exclude: [
      'whatsapp-web.js',
      'qrcode-terminal',
    ],
    // Disable dependency scanning for whatsapp-web.js
    include: [],
  },
})

