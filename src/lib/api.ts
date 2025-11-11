import { MovieItem, PathConfig } from '@/types/media'

export async function getPaths(): Promise<PathConfig[]> {
  const res = await fetch('/api/setup/paths', { cache: 'no-store' })
  const data = await res.json()
  return data.paths || []
}

export async function savePaths(paths: PathConfig[]): Promise<void> {
  const res = await fetch('/api/setup/paths', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paths),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.errors?.join?.('\n') || data.error || 'Failed to save paths')
  }
}

export async function getMovies(): Promise<MovieItem[]> {
  const res = await fetch('/api/media/movies', { cache: 'no-store' })
  const data = await res.json()
  return data.items || []
}

export async function getSeries(): Promise<MovieItem[]> {
  const res = await fetch('/api/media/series', { cache: 'no-store' })
  const data = await res.json()
  return data.items || []
}

export async function downloadVideo(url: string, itemId: string, targetPath: string) {
  const res = await fetch('/api/download/video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, itemId, targetPath }),
  })
  const data = await res.json()
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Video download failed')
  }
  return data
}
