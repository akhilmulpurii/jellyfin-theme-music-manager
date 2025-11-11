import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { MovieItem } from '@/types/media'

const AUDIO_EXTS = new Set(['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.wma', '.opus'])
const VIDEO_EXTS = new Set(['.mp4', '.mkv', '.webm', '.avi', '.mov', '.wmv'])

async function dirExists(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p)
    return st.isDirectory()
  } catch {
    return false
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p)
    return st.isFile()
  } catch {
    return false
  }
}

function makeId(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 16)
}

function extractNameFromDir(dirPath: string): string {
  return path.basename(dirPath)
}

async function detectThemeAudio(dirPath: string): Promise<{ exists: boolean; p?: string; format?: string }> {
  const entries = await fs.readdir(dirPath).catch(() => [])
  for (const f of entries) {
    const lower = f.toLowerCase()
    if (!lower.startsWith('theme.')) continue
    const ext = path.extname(lower)
    if (!AUDIO_EXTS.has(ext)) continue
    const full = path.join(dirPath, f)
    if (await fileExists(full)) return { exists: true, p: full, format: ext.slice(1) }
  }
  return { exists: false }
}

async function detectThemeVideo(backdropsPath: string): Promise<{ exists: boolean; p?: string; format?: string }> {
  const entries = await fs.readdir(backdropsPath).catch(() => [])
  for (const f of entries) {
    const lower = f.toLowerCase()
    if (!lower.startsWith('theme.')) continue
    const ext = path.extname(lower)
    if (!VIDEO_EXTS.has(ext)) continue
    const full = path.join(backdropsPath, f)
    if (await fileExists(full)) return { exists: true, p: full, format: ext.slice(1) }
  }
  return { exists: false }
}

export async function scanMovies(paths: string[]): Promise<MovieItem[]> {
  const items: MovieItem[] = []
  for (const root of paths) {
    if (!(await dirExists(root))) continue
    const dirs = await fs.readdir(root, { withFileTypes: true }).catch(() => [])
    for (const d of dirs) {
      if (!d.isDirectory()) continue
      const movieDir = path.join(root, d.name)
      const id = makeId(movieDir)
      const name = extractNameFromDir(movieDir)
      const audio = await detectThemeAudio(movieDir)

      const backdrops = path.join(movieDir, 'backdrops')
      const backdropsExists = await dirExists(backdrops)
      let video = { exists: false, p: undefined as string | undefined, format: undefined as string | undefined }
      if (backdropsExists) {
        const vd = await detectThemeVideo(backdrops)
        video = { exists: vd.exists, p: vd.p, format: vd.format }
      }

      items.push({
        id,
        name,
        path: movieDir,
        themeAudio: { exists: audio.exists, path: audio.p, format: audio.format },
        themeVideo: { exists: video.exists, path: video.p, format: video.format, backdropsFolderExists: backdropsExists },
      })
    }
  }
  return items
}

export async function scanSeries(paths: string[]): Promise<MovieItem[]> {
  // Same item shape as movies; applied at series root folder
  return scanMovies(paths)
}
