import fs from 'node:fs/promises'
import path from 'node:path'

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true })
}

export async function verifyWritableDir(p: string): Promise<void> {
  const testFile = path.join(p, '.write_test')
  await fs.writeFile(testFile, '')
  await fs.unlink(testFile)
}

export async function ensureBackdrops(itemPath: string): Promise<{ backdropsPath: string; created: boolean }> {
  const backdropsPath = path.join(itemPath, 'backdrops')
  let created = false

  try {
    await fs.access(backdropsPath)
  } catch {
    try {
      await fs.mkdir(backdropsPath, { recursive: true })
      created = true
    } catch (error: any) {
      if (error?.code === 'EACCES') {
        throw new Error(`Permission denied: Cannot create backdrops folder at ${backdropsPath}`)
      }
      if (error?.code === 'ENOSPC') {
        throw new Error('Insufficient disk space to create backdrops folder')
      }
      throw new Error(`Failed to create backdrops folder: ${error?.message || String(error)}`)
    }
  }

  try {
    await verifyWritableDir(backdropsPath)
  } catch (error: any) {
    if (error?.code === 'EACCES') {
      throw new Error(`Permission denied: Cannot write to backdrops folder at ${backdropsPath}`)
    }
    if (error?.code === 'ENOSPC') {
      throw new Error('Insufficient disk space to write in backdrops folder')
    }
    throw new Error(`No write permission in backdrops folder: ${error?.message || String(error)}`)
  }

  return { backdropsPath, created }
}
