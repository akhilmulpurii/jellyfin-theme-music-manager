import { NextResponse } from 'next/server'
import { readPaths, writePaths, validatePathsInput } from '@/lib/config'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => [])
    const result = validatePathsInput(body)
    if (!result.ok || !result.value) {
      return NextResponse.json({ success: false, errors: result.errors || ['Invalid input'] }, { status: 400 })
    }
    await writePaths(result.value)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const paths = await readPaths()
    return NextResponse.json({ success: true, paths })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
