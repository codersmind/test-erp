import { defineConfig } from 'vite'
import { builtinModules } from 'node:module'
import path from 'node:path'

export default defineConfig({
  build: {
    outDir: '.vite/build/main',
    target: 'node18',
    sourcemap: true,
    ssr: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'electron/main.ts'),
      output: {
        format: 'cjs',
        entryFileNames: 'index.cjs',
      },
      external: [...builtinModules, ...builtinModules.map((moduleName) => `node:${moduleName}`), 'electron', 'keytar', 'electron-updater'],
    },
    emptyOutDir: false,
  },
})

