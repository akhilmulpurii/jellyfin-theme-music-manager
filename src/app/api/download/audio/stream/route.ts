import { NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs/promises'
import { ensureBackdrops } from '@/lib/fs-utils'
import { isAbsolutePath, isValidHttpUrl } from '@/lib/validate'

export const runtime = 'nodejs'

function sseLine(event: string, data: string) {
  return `event: ${event}\n` + `data: ${data.replace(/\n/g, '\\n')}\n\n`
}

export async function POST(req: Request) {
  try {
    const { spawn } = await import('node:child_process')
    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const url = String(body.url || '')
    const itemId = String(body.itemId || '')
    const targetPath = String(body.targetPath || '')
    const cookiesFilePath = body.cookiesFilePath ? String(body.cookiesFilePath) : ''
    const useCookiesFromBrowser = Boolean(body.useCookiesFromBrowser)
    const browser = (body.browser || '').toString().trim().toLowerCase() || process.env.YTDLP_BROWSER || ''

    if (!url || !isValidHttpUrl(url)) return new NextResponse('Invalid url', { status: 400 })
    if (!targetPath || !isAbsolutePath(targetPath)) return new NextResponse('Invalid targetPath', { status: 400 })
    if (!itemId) return new NextResponse('Missing itemId', { status: 400 })

    await ensureBackdrops(targetPath)

    const args = [
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--output', path.join(targetPath, 'theme.%(ext)s'),
      '--no-playlist',
      url,
    ]

    // Cookies handling
    const cookiesEnv = process.env.YTDLP_COOKIES_FILE || ''
    const cookiesFile = cookiesFilePath || cookiesEnv
    if (cookiesFile) {
      try {
        const st = await fs.stat(cookiesFile)
        if (!st.isFile()) {
          return new NextResponse('Cookies file is not a file', { status: 400 })
        }
        args.splice(args.length - 1, 0, '--cookies', cookiesFile)
      } catch {
        return new NextResponse('Cookies file not readable', { status: 400 })
      }
    } else if (useCookiesFromBrowser) {
      const allowed = new Set(['chrome', 'chromium', 'brave', 'edge', 'firefox', 'safari'])
      const chosen = browser && allowed.has(browser) ? browser : 'chrome'
      args.splice(args.length - 1, 0, '--cookies-from-browser', chosen)
    }

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const enc = new TextEncoder()
        function write(ev: string, d: string) {
          controller.enqueue(enc.encode(sseLine(ev, d)))
        }
        write('stage', 'yt-dlp')
        write('log', `Starting yt-dlp for item ${itemId}`)
        const proc = spawn('yt-dlp', args)
        proc.stdout.on('data', (d) => write('log', d.toString()))
        proc.stderr.on('data', (d) => write('log', d.toString()))
        proc.on('close', async (code) => {
          if (code !== 0) {
            write('error', `yt-dlp failed with code ${code}`)
            controller.close()
            return
          }
          // Find resulting file
          const entries = await fs.readdir(targetPath).catch(() => [])
          const candidate = entries.find((f) => f.startsWith('theme.') && f !== 'theme._cropped.mp4')
          if (!candidate) {
            write('error', 'Audio file not found after download')
            controller.close()
            return
          }
          const full = path.join(targetPath, candidate)
          const st = await fs.stat(full)
          write('done', JSON.stringify({ success: true, itemId, file: { path: full, format: path.extname(full).slice(1), size: st.size } }))
          controller.close()
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch {
    return new NextResponse('Unexpected error', { status: 500 })
  }
}
