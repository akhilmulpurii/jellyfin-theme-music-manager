import { NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs/promises'
import { ensureBackdrops } from '@/lib/fs-utils'
import { isAbsolutePath, isValidHttpUrl } from '@/lib/validate'
import { runYtDlp } from '@/lib/run-yt'

const VIDEO_EXTS_SET = new Set(['.mp4', '.mkv', '.webm', '.avi', '.mov', '.wmv'])

interface DownloadVideoRequest {
  url: string
  itemId: string
  targetPath: string
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function POST(req: Request) {
  try {
    const body: Partial<DownloadVideoRequest> = await req
      .json()
      .catch((): Partial<DownloadVideoRequest> => ({}))
    const url = String(body.url || '')
    const itemId = String(body.itemId || '')
    const targetPath = String(body.targetPath || '')

    if (!url || !isValidHttpUrl(url)) return jsonError('Invalid url provided')
    if (!targetPath || !isAbsolutePath(targetPath)) return jsonError('Invalid targetPath provided; must be absolute')
    if (!itemId) return jsonError('Missing itemId')

    const { backdropsPath, created } = await ensureBackdrops(targetPath)

    const outputTemplate = path.join(backdropsPath, 'theme.%(ext)s')

    const args = [
      '--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '--output', outputTemplate,
      '--no-playlist',
      url,
    ]

    const result = await runYtDlp(args)

    if (result.code !== 0) {
      return jsonError(`yt-dlp failed: ${result.stderr || result.stdout || 'unknown error'}`, 500)
    }

    // Find the downloaded file: theme.<ext> where ext is in VIDEO_EXTS
    const entries = await fs.readdir(backdropsPath)
    const candidate = entries.find((f) => f.startsWith('theme.') && VIDEO_EXTS_SET.has(path.extname(f).toLowerCase()))
    if (!candidate) {
      return jsonError('Download completed but theme video file not found', 500)
    }

    const full = path.join(backdropsPath, candidate)
    const stat = await fs.stat(full)

    return NextResponse.json({
      success: true,
      itemId,
      createdBackdrops: created,
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
