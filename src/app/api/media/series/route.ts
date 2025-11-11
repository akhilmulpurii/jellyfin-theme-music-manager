import { NextResponse } from 'next/server'
import { readPaths } from '@/lib/config'
import { scanSeries } from '@/lib/scan'

export async function GET() {
  try {
    const paths = await readPaths()
    const seriesRoots = paths.filter((p) => p.type === 'Series').map((p) => p.path)
    const items = await scanSeries(seriesRoots)
    return NextResponse.json({ success: true, items })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
