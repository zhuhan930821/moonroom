import { defineConfig, loadEnv } from 'vite'
import { worldGenPlugin } from './server/worldGen.js'
import react from '@vitejs/plugin-react'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const projectRoot = dirname(fileURLToPath(import.meta.url))

function localCapture() {
  return {
    name: 'moonroom-local-capture',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__capture', async (req, res) => {
        const name = new URL(req.url, 'http://localhost').searchParams.get('name')
        const allowedCaptures = ['bed', 'deskView', 'lounge', 'drums', 'sofa', 'drumFront', 'drumSide', 'drumCorner', 'drumHardware', 'candidateDrums', 'candidateDrumFront', 'candidateDrumSide', 'candidateDrumCorner']
        if (req.method !== 'POST' || !allowedCaptures.includes(name)) { res.statusCode = 400; res.end('Invalid capture'); return }
        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        const buffer = Buffer.concat(chunks)
        if (buffer.length < 1000 || buffer.length > 12_000_000) { res.statusCode = 413; res.end('Invalid PNG size'); return }
        const directory = join(projectRoot, 'screenshots')
        await mkdir(directory, { recursive: true })
        await writeFile(join(directory, `moonroom-${name}.png`), buffer)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ saved: `screenshots/moonroom-${name}.png`, bytes: buffer.length }))
      })
    },
  }
}

export default defineConfig(({ mode }) => ({ plugins: [react(), localCapture(), worldGenPlugin(loadEnv(mode, projectRoot, ''))] }))
