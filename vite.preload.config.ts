import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  build: {
    outDir: '.vite/build/preload',
    target: 'node18',
    sourcemap: true,
    ssr: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'electron/preload.ts'),
      output: {
        format: 'cjs',
        entryFileNames: 'index.cjs',
      },
      external: ['electron'],
    },
    emptyOutDir: false,
  },
})

