import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = new URL('..', import.meta.url)
const featuresDir = fileURLToPath(new URL('src/features', root))

const forbiddenTopLevelImports = [
  'drizzle-orm',
  '../../db/client',
  '../../db/schema',
  '../db/client',
  '../db/schema',
  'node:',
  'cloudinary',
]

function collectServerActionFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...collectServerActionFiles(fullPath))
      continue
    }

    if (entry.name === 'server.ts') {
      files.push(fullPath)
    }
  }

  return files
}

function getImportBlock(source) {
  const lines = source.split(/\r?\n/)
  const importLines = []
  let isMultilineImport = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === '') {
      if (isMultilineImport) {
        importLines.push(line)
        continue
      }

      break
    }

    if (trimmed.startsWith('import ')) {
      importLines.push(line)
      isMultilineImport = !trimmed.includes(' from ') && !trimmed.endsWith(';')
      continue
    }

    if (isMultilineImport) {
      importLines.push(line)
      isMultilineImport = !trimmed.endsWith(';') && !trimmed.includes(' from ')
      continue
    }

    break
  }

  return importLines.join('\n')
}

const violations = []

for (const file of collectServerActionFiles(featuresDir)) {
  const source = readFileSync(file, 'utf8')
  const importBlock = getImportBlock(source)

  for (const forbiddenImport of forbiddenTopLevelImports) {
    if (importBlock.includes(`'${forbiddenImport}'`) || importBlock.includes(`"${forbiddenImport}"`)) {
      violations.push({ file, forbiddenImport })
    }
  }
}

if (violations.length > 0) {
  console.error('Server boundary check failed.')
  console.error('Do not import DB, Node-only, or third-party server SDK modules at top level in src/features/*/server.ts.')
  console.error('Use lazy imports inside createServerFn handlers or move implementation into *.server.ts.')

  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.forbiddenImport}`)
  }

  process.exit(1)
}

console.log('Server boundary check passed.')
