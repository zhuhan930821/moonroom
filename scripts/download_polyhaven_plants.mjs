// Fetch official Poly Haven 1K glTF packages with checksum verification.
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

for (const id of ['potted_plant_01', 'potted_plant_04']) {
  const response = await fetch(`https://api.polyhaven.com/files/${id}`, { headers: { 'User-Agent': 'MoonroomAssetPipeline/1.0' } })
  if (!response.ok) throw new Error(`Poly Haven metadata ${id}: ${response.status}`)
  const variant = (await response.json()).gltf['1k'].gltf
  const files = [[`${id}_1k.gltf`, variant], ...Object.entries(variant.include)]
  const root = join('assets-source', 'third-party', `polyhaven-${id}`)
  for (const [name, file] of files) {
    const download = await fetch(file.url)
    if (!download.ok) throw new Error(`${name}: ${download.status}`)
    const bytes = Buffer.from(await download.arrayBuffer())
    if (bytes.length !== file.size || createHash('md5').update(bytes).digest('hex') !== file.md5) throw new Error(`Checksum mismatch: ${name}`)
    const destination = join(root, name)
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, bytes)
    process.stdout.write(`${destination} (${bytes.length} bytes)\n`)
  }
}
