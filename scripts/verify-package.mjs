import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const packagePath = 'dist.zip'
const filesToVerify = ['manifest.json', 'content.js', 'index.html']

function hash(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

const mismatches = filesToVerify.filter((filePath) => {
  const distHash = hash(readFileSync(`dist/${filePath}`))
  const zipHash = hash(execFileSync('unzip', ['-p', packagePath, filePath]))

  return distHash !== zipHash
})

if (mismatches.length > 0) {
  console.error(`Package mismatch: ${mismatches.join(', ')} differ between dist/ and ${packagePath}.`)
  process.exit(1)
}

console.log('Package verified: dist.zip matches dist for release-critical files.')
