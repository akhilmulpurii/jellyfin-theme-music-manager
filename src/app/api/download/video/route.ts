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
  cookiesFilePath?: string
  useCookiesFromBrowser?: boolean
  browser?: string
  postProcessCrop?: boolean
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
    const cookiesFromBody = body.cookiesFilePath ? String(body.cookiesFilePath) : ''
    const cookiesEnv = process.env.YTDLP_COOKIES_FILE || ''
    const useCookiesFromBrowser = Boolean(body.useCookiesFromBrowser)
    const browser = (body.browser || '').toString().trim().toLowerCase() || process.env.YTDLP_BROWSER || ''
    const postProcessCrop = Boolean(body.postProcessCrop)

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

    // Resolve cookies via file first: request overrides env. Must be absolute and readable.
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

    // Or use cookies-from-browser if requested and no file was used
    if (!cookiesFile && useCookiesFromBrowser) {
      const allowed = new Set(['chrome', 'chromium', 'brave', 'edge', 'firefox', 'safari'])
      const chosen = browser && allowed.has(browser) ? browser : 'chrome'
      args.splice(args.length - 1, 0, '--cookies-from-browser', chosen)
    }

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
    let finalPath = full
    let cropValue: string | undefined

    if (postProcessCrop) {
      // Run ffmpeg cropdetect for ~4s to get crop value
      // ffmpeg -t 4 -i input -vf cropdetect -f null -
      const { spawn } = await import('node:child_process')
      const detectArgs = ['-t', '4', '-i', full, '-vf', 'cropdetect=24:16:0', '-f', 'null', '-']
      const detect = spawn('ffmpeg', detectArgs)
      let stderr = ''
      detect.stderr.on('data', (d) => (stderr += d.toString()))
      await new Promise<void>((resolve) => detect.on('close', () => resolve()))

      const matches = [...stderr.matchAll(/crop=([0-9:]+\:[0-9:]+)/g)].map((m) => m[0].replace('crop=', ''))
      // Fallback regex if above grouping fails
      const altMatches = [...stderr.matchAll(/crop=\d+:\d+:\d+:\d+/g)].map((m) => m[0].replace('crop=', ''))
      const all = matches.length ? matches : altMatches
      if (all.length) {
        // Choose the last detected crop as representative
        cropValue = all[all.length - 1]
        if (cropValue && !/^iw:ih:0:0$/.test(cropValue)) {
          const tmpOut = path.join(backdropsPath, 'theme._cropped.mp4')
          const cropArgs = ['-y', '-i', full, '-vf', `crop=${cropValue}`, '-c:a', 'copy', tmpOut]
          const crop = spawn('ffmpeg', cropArgs)
          await new Promise<void>((resolve) => crop.on('close', () => resolve()))
          try {
            await fs.rename(tmpOut, full)
            finalPath = full
          } catch {
            // ignore if rename fails; keep original
          }
        }
      }
    }

    const stat = await fs.stat(finalPath)

    return NextResponse.json({
      success: true,
      itemId,
      createdBackdrops: created,
      postProcessed: postProcessCrop || false,
      crop: cropValue,
      file: {
        path: finalPath,
        format: path.extname(finalPath).slice(1),
        size: stat.size,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return jsonError(message, 500)
  }
}
