// Fetch the licensed Grab3D GLBs used by the room. Run from the repository root.
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

for (const slug of ['monstera-plant', 'orchid', 'flower-pot', 'disco-ball']) {
  const metadata = await fetch(`https://grab3d.com/api/v1/models/${slug}.json`).then(r => r.json())
  if (metadata.license !== 'CC0-1.0') throw new Error(`${slug}: unexpected license ${metadata.license}`)
  const file = metadata.files.find(item => item.format === 'glb' && item.variant === 'full')
  if (!file) throw new Error(`${slug}: no full GLB`)
  const response = await fetch(file.url)
  if (!response.ok) throw new Error(`${slug}: ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length !== file.bytes) throw new Error(`${slug}: download size mismatch`)
  const target = join('assets-source', 'third-party', 'grab3d', slug)
  await mkdir(target, { recursive: true })
  await writeFile(join(target, file.file), bytes)
  await writeFile(join(target, 'manifest.json'), JSON.stringify(metadata, null, 2))
  await writeFile(join(target, 'LICENSE.txt'), 'CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/\nSource: ' + file.url + '\n')
  process.stdout.write(`${slug}: ${bytes.length} bytes\n`)
}
