import { NextResponse } from 'next/server'
import { ensureDataDir, getDataDir } from '@/lib/config'
import fs from 'node:fs/promises'
import path from 'node:path'

interface Body {
  text: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Body>
    const text = (body.text || '').toString()
    if (!text.trim()) {
      return NextResponse.json({ success: false, error: 'cookies text is required' }, { status: 400 })
    }

    await ensureDataDir()
    const dest = path.join(getDataDir(), 'cookies.txt')
    await fs.writeFile(dest, text, 'utf8')

    return NextResponse.json({ success: true, path: dest })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
