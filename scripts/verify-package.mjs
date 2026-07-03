import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const packagePath = 'dist.zip'
const filesToVerify = ['manifest.json', 'content.js', 'index.html']

function listDistFiles(root = 'dist', prefix = '') {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(root, entry.name)
    const archivePath = prefix ? `${prefix}/${entry.name}` : entry.name

    if (entry.name === '.DS_Store') {
      return []
    }

    if (entry.isDirectory()) {
      return listDistFiles(entryPath, archivePath)
    }

    return archivePath
  })
}

function hash(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

const mismatches = filesToVerify.filter((filePath) => {
  const distHash = hash(readFileSync(`dist/${filePath}`))
  const zipHash = hash(execFileSync('unzip', ['-p', packagePath, filePath]))

  return distHash !== zipHash
})

const distFiles = listDistFiles().sort()
const zipFiles = execFileSync('unzip', ['-Z1', packagePath], { encoding: 'utf8' })
  .split('\n')
  .filter((entry) => entry && !entry.endsWith('/') && !entry.endsWith('.DS_Store'))
  .sort()

const missingFiles = distFiles.filter((filePath) => !zipFiles.includes(filePath))
const staleFiles = zipFiles.filter((filePath) => !distFiles.includes(filePath))

if (mismatches.length > 0) {
  console.error(`Package mismatch: ${mismatches.join(', ')} differ between dist/ and ${packagePath}.`)
  process.exit(1)
}

if (missingFiles.length > 0 || staleFiles.length > 0) {
  if (missingFiles.length > 0) {
    console.error(`Package missing files: ${missingFiles.join(', ')}`)
  }

  if (staleFiles.length > 0) {
    console.error(`Package has stale files: ${staleFiles.join(', ')}`)
  }

  process.exit(1)
}

console.log('Package verified: dist.zip matches dist.')
