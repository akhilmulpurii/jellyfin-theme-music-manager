import { NextResponse } from 'next/server'
import { ensureDataDir, getDataDir } from '@/lib/config'
import fs from 'node:fs/promises'
import path from 'node:path'

export async function POST(req: Request) {
  try {
    const ct = req.headers.get('content-type') || ''
    if (!ct.includes('multipart/form-data')) {
      return NextResponse.json({ success: false, error: 'Content-Type must be multipart/form-data' }, { status: 400 })
    }

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Missing file field' }, { status: 400 })
    }

    await ensureDataDir()
    const dataDir = getDataDir()
    const dest = path.join(dataDir, 'cookies.txt')

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.writeFile(dest, buffer)

    return NextResponse.json({ success: true, path: dest })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
