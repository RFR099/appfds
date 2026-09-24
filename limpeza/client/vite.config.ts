import fs from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * `virtual:demo-snapshot`: respostas da API gravadas (demo/snapshot.json, gerado por
 * `npm --prefix ../server run record-demo`). Só é usado no build de demonstração.
 */
function demoSnapshot(): Plugin {
  const id = 'virtual:demo-snapshot'
  return {
    name: 'demo-snapshot',
    resolveId: (s) => (s === id ? `\0${id}` : null),
    load(s) {
      if (s !== `\0${id}`) return null
      const file = new URL('./demo/snapshot.json', import.meta.url)
      return `export default ${fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '{}'}`
    },
  }
}

export default defineConfig(({ mode }) => {
  const demo = mode === 'demo'
  return {
    plugins: [react(), tailwindcss(), demoSnapshot(), ...(demo ? [viteSingleFile()] : [])],
    define: demo ? { 'import.meta.env.VITE_DEMO': JSON.stringify('1') } : {},
    build: demo ? { outDir: 'dist-demo' } : {},
    server: {
      port: 5173,
      proxy: { '/api': 'http://localhost:3000' },
    },
  }
})
