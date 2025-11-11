import { NextResponse } from 'next/server'
import { readPaths } from '@/lib/config'
import { scanMovies } from '@/lib/scan'

export async function GET() {
  try {
    const paths = await readPaths()
    const movieRoots = paths.filter((p) => p.type === 'Movie').map((p) => p.path)
    const items = await scanMovies(movieRoots)
    return NextResponse.json({ success: true, items })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
