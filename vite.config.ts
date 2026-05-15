import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist/main',
            lib: {
              entry: 'src/main/index.ts',
              formats: ['cjs']
            },
            rollupOptions: {
              external: ['sql.js', 'electron']
            }
          }
        }
      },
      {
        entry: 'src/main/preload.ts',
        onstart(args) {
          args.reload()
        },
        vite: {
          build: {
            outDir: 'dist/main'
          }
        }
      }
    ]),
    renderer({
      resolve: {
        'sql.js': { type: 'cjs' }
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
