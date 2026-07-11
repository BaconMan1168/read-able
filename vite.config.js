import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { build as buildWithEsbuild } from 'esbuild'
import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

const REQUIRED_FONT_FILES = new Set([
  'OpenDyslexic-Regular.woff2',
  'OpenDyslexic-Bold.woff2',
  'OpenDyslexic-Italic.woff2',
  'OpenDyslexic-Bold-Italic.woff2',
])

function cleanExtensionBuild() {
  return {
    name: 'clean-extension-build',
    closeBundle: async () => {
      const distRoot = 'dist'
      const fontRoot = join(distRoot, 'fonts', 'OpenDyslexic')
      const compiledFontRoot = join(fontRoot, 'compiled')

      await removeByName(distRoot, '.DS_Store')
      await removeByName(distRoot, '.gitignore')
      await rm(join(fontRoot, 'sources'), { recursive: true, force: true })
      await rm(join(fontRoot, '.github'), { recursive: true, force: true })
      await rm(join(fontRoot, 'README.md'), { force: true })
      await rm(join(fontRoot, 'FONTLOG.txt'), { force: true })
      await rm(join(fontRoot, 'OFL-FAQ.txt'), { force: true })

      const compiledFiles = await readdir(compiledFontRoot)
      await Promise.all(
        compiledFiles
          .filter((fileName) => !REQUIRED_FONT_FILES.has(fileName))
          .map((fileName) => rm(join(compiledFontRoot, fileName), { force: true }))
      )

      await buildContentScript(distRoot)
    },
  }
}

async function buildContentScript(distRoot) {
  await buildWithEsbuild({
    entryPoints: ['src/content.js'],
    outfile: join(distRoot, 'content.js'),
    bundle: true,
    format: 'iife',
    target: 'chrome102',
    legalComments: 'eof',
  })

  await buildWithEsbuild({
    entryPoints: ['src/reader-extract.js'],
    outfile: join(distRoot, 'reader-extract.js'),
    bundle: true,
    format: 'iife',
    target: 'chrome102',
    legalComments: 'eof',
  })
}

async function removeByName(root, fileNameToRemove) {
  let entries = []

  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch {
    return
  }

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(root, entry.name)

      if (entry.name === fileNameToRemove) {
        await rm(entryPath, { recursive: true, force: true })
        return
      }

      if (entry.isDirectory()) {
        await removeByName(entryPath, fileNameToRemove)
      }
    })
  )
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cleanExtensionBuild()],
  build: {
    rollupOptions: {
      input: {
        popup: 'index.html',
        reader: 'reader.html',
      },
    },
  },
})
