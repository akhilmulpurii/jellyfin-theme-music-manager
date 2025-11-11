import fs from 'node:fs/promises'
import path from 'node:path'
import { PathConfig, LibraryType } from '@/types/media'
import { isAbsolutePath } from './validate'

const DEFAULT_DATA_DIR = path.join(process.cwd(), 'config')

export function getDataDir(): string {
  return process.env.DATA_DIR || DEFAULT_DATA_DIR
}

function getPathsFile(): string {
  return path.join(getDataDir(), 'paths.json')
}

export async function ensureDataDir(): Promise<void> {
  await fs.mkdir(getDataDir(), { recursive: true })
}

export async function readPaths(): Promise<PathConfig[]> {
  try {
    const buf = await fs.readFile(getPathsFile(), 'utf8')
    const parsed = JSON.parse(buf)
    if (!Array.isArray(parsed)) return []
    // best-effort shape check
    return parsed.filter((p) => typeof p?.path === 'string' && (p?.type === 'Movie' || p?.type === 'Series'))
  } catch {
    return []
  }
}

export async function writePaths(paths: PathConfig[]): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(getPathsFile(), JSON.stringify(paths, null, 2), 'utf8')
}

export function validatePathsInput(input: unknown): { ok: boolean; errors?: string[]; value?: PathConfig[] } {
  const errors: string[] = []
  if (!Array.isArray(input)) {
    return { ok: false, errors: ['Body must be an array of { path, type }'] }
  }
  const seen = new Set<string>()
  const out: PathConfig[] = []
  for (const item of input) {
    const p = String(item?.path || '')
    const t = String(item?.type || '') as LibraryType
    if (!p) errors.push('path is required')
    if (!isAbsolutePath(p)) errors.push(`path must be absolute: ${p}`)
    if (t !== 'Movie' && t !== 'Series') errors.push(`invalid type for ${p}: ${t}`)
    if (seen.has(p)) errors.push(`duplicate path: ${p}`)
    seen.add(p)
    if (p && isAbsolutePath(p) && (t === 'Movie' || t === 'Series')) out.push({ path: p, type: t })
  }
  if (out.length === 0) errors.push('at least one valid path is required')
  return { ok: errors.length === 0, errors: errors.length ? errors : undefined, value: out }
}
