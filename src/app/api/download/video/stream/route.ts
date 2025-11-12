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
    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const url = String(body.url || '')
    const itemId = String(body.itemId || '')
    const targetPath = String(body.targetPath || '')
    const cookiesFilePath = body.cookiesFilePath ? String(body.cookiesFilePath) : ''
    const useCookiesFromBrowser = Boolean(body.useCookiesFromBrowser)
    const browser = (body.browser || '').toString().trim().toLowerCase() || process.env.YTDLP_BROWSER || ''
    const postProcessCrop = Boolean(body.postProcessCrop)

    if (!url || !isValidHttpUrl(url)) return new NextResponse('Invalid url', { status: 400 })
    if (!targetPath || !isAbsolutePath(targetPath)) return new NextResponse('Invalid targetPath', { status: 400 })
    if (!itemId) return new NextResponse('Missing itemId', { status: 400 })

    const { backdropsPath } = await ensureBackdrops(targetPath)
    const outputTemplate = path.join(backdropsPath, 'theme.%(ext)s')

    const args = [
      '--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '--output', outputTemplate,
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
      async start(controller) {
        const enc = new TextEncoder()
        function write(ev: string, d: string) {
          controller.enqueue(enc.encode(sseLine(ev, d)))
        }

        write('stage', 'yt-dlp')
        write('log', `Starting yt-dlp for item ${itemId}`)
        const ytdlp = (await import('node:child_process')).spawn('yt-dlp', args)
        ytdlp.stdout.on('data', (d) => write('log', d.toString()))
        ytdlp.stderr.on('data', (d) => write('log', d.toString()))
        ytdlp.on('close', async (code) => {
          if (code !== 0) {
            write('error', `yt-dlp failed with code ${code}`)
            controller.close()
            return
          }
          // find theme.* in backdrops
          const entries = await fs.readdir(backdropsPath).catch(() => [])
          const candidate = entries.find((f) => f.startsWith('theme.') && f !== 'theme._cropped.mp4')
          if (!candidate) {
            write('error', 'theme video not found after download')
            controller.close()
            return
          }
          const full = path.join(backdropsPath, candidate)
          let finalPath = full
          let cropValue: string | undefined

          if (postProcessCrop) {
            write('stage', 'ffmpeg-detect')
            const detectArgs = ['-t', '4', '-i', full, '-vf', 'cropdetect=24:16:0', '-f', 'null', '-']
            const detect = (await import('node:child_process')).spawn('ffmpeg', detectArgs)
            let stderr = ''
            detect.stdout.on('data', (d) => write('log', d.toString()))
            detect.stderr.on('data', (d) => { const s = d.toString(); stderr += s; write('log', s) })
            detect.on('close', async () => {
              const matches = [...stderr.matchAll(/crop=\d+:\d+:\d+:\d+/g)].map((m) => m[0].replace('crop=', ''))
              if (matches.length) {
                cropValue = matches[matches.length - 1]
                if (cropValue && !/^iw:ih:0:0$/.test(cropValue)) {
                  write('stage', 'ffmpeg-crop')
                  const tmpOut = path.join(backdropsPath, 'theme._cropped.mp4')
                  const cropArgs = ['-y', '-i', full, '-vf', `crop=${cropValue}`, '-c:a', 'copy', tmpOut]
                  const crop = (await import('node:child_process')).spawn('ffmpeg', cropArgs)
                  crop.stdout.on('data', (d) => write('log', d.toString()))
                  crop.stderr.on('data', (d) => write('log', d.toString()))
                  crop.on('close', async () => {
                    try {
                      await fs.rename(tmpOut, full)
                      finalPath = full
                    } catch {}
                    const st = await fs.stat(finalPath)
                    write('done', JSON.stringify({ success: true, itemId, postProcessed: true, crop: cropValue, file: { path: finalPath, format: path.extname(finalPath).slice(1), size: st.size } }))
                    controller.close()
                  })
                  return
                }
              }
              // no crop or identity crop
              const st = await fs.stat(finalPath)
              write('done', JSON.stringify({ success: true, itemId, postProcessed: true, crop: cropValue, file: { path: finalPath, format: path.extname(finalPath).slice(1), size: st.size } }))
              controller.close()
            })
            return
          }

          // no post-process
          const st = await fs.stat(finalPath)
          write('done', JSON.stringify({ success: true, itemId, postProcessed: false, file: { path: finalPath, format: path.extname(finalPath).slice(1), size: st.size } }))
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
