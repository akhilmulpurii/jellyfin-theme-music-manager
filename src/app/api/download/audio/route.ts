import { NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs/promises'
import { isAbsolutePath, isValidHttpUrl } from '@/lib/validate'
import { runYtDlp } from '@/lib/run-yt'

const AUDIO_EXTS_SET = new Set(['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.wma', '.opus'])

interface DownloadAudioRequest {
  url: string
  itemId: string
  targetPath: string
  cookiesFilePath?: string
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function POST(req: Request) {
  try {
    const body: Partial<DownloadAudioRequest> = await req
      .json()
      .catch((): Partial<DownloadAudioRequest> => ({}))
    const url = String(body.url || '')
    const itemId = String(body.itemId || '')
    const targetPath = String(body.targetPath || '')
    const cookiesFromBody = body.cookiesFilePath ? String(body.cookiesFilePath) : ''
    const cookiesEnv = process.env.YTDLP_COOKIES_FILE || ''

    if (!url || !isValidHttpUrl(url)) return jsonError('Invalid url provided')
    if (!targetPath || !isAbsolutePath(targetPath)) return jsonError('Invalid targetPath provided; must be absolute')
    if (!itemId) return jsonError('Missing itemId')

    // Ensure target directory exists and is writable
    try {
      await fs.mkdir(targetPath, { recursive: true })
      const testFile = path.join(targetPath, '.write_test')
      await fs.writeFile(testFile, '')
      await fs.unlink(testFile)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No write permission in target folder'
      return jsonError(message, 500)
    }

    const outputTemplate = path.join(targetPath, 'theme.%(ext)s')

    const args = [
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--output', outputTemplate,
      '--no-playlist',
      url,
    ]

    // Resolve cookies file: request overrides env. Must be absolute and readable.
    const cookiesFile = cookiesFromBody || cookiesEnv
    if (cookiesFile) {
      try {
        const stat = await fs.stat(cookiesFile)
        if (!stat.isFile()) {
          return jsonError(`Cookies file is not a file: ${cookiesFile}`)
        }
        args.splice(args.length - 1, 0, '--cookies', cookiesFile)
      } catch {
        return jsonError(`Cookies file not readable: ${cookiesFile}`)
      }
    }

    const result = await runYtDlp(args)

    if (result.code !== 0) {
      return jsonError(`yt-dlp failed: ${result.stderr || result.stdout || 'unknown error'}`, 500)
    }

    // Find the downloaded file: theme.<ext> where ext is in AUDIO_EXTS
    const entries = await fs.readdir(targetPath)
    const candidate = entries.find((f) => f.startsWith('theme.') && AUDIO_EXTS_SET.has(path.extname(f).toLowerCase()))
    if (!candidate) {
      return jsonError('Download completed but theme audio file not found', 500)
    }

    const full = path.join(targetPath, candidate)
    const stat = await fs.stat(full)

    return NextResponse.json({
      success: true,
      itemId,
      file: {
        path: full,
        format: path.extname(full).slice(1),
        size: stat.size,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return jsonError(message, 500)
  }
}
