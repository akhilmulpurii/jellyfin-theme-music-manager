"use client"

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { MediaItemList } from './MediaItemList'
import { getMovies, getSeries } from '@/lib/api'
import type { MovieItem } from '@/types/media'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function Dashboard({ onEditPaths }: { onEditPaths?: () => void }) {
  const [tab, setTab] = useState<'movies' | 'series'>('movies')
  const [movies, setMovies] = useState<MovieItem[] | null>(null)
  const [series, setSeries] = useState<MovieItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [cookiesPath, setCookiesPath] = useState<string>("")

  async function loadMovies() {
    setLoading(true)
    try {
      const items = await getMovies()
      setMovies(items)
    } finally {
      setLoading(false)
    }
  }

  async function loadSeries() {
    setLoading(true)
    try {
      const items = await getSeries()
      setSeries(items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // load initial
    void loadMovies()
  }, [])

  useEffect(() => {
    if (tab === 'movies' && movies == null) void loadMovies()
    if (tab === 'series' && series == null) void loadSeries()
  }, [tab, movies, series])

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Jellyfin Theme Manager</h1>
        <Button variant="outline" onClick={onEditPaths}>Edit Paths</Button>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'movies' | 'series')}>
        <TabsList>
          <TabsTrigger value="movies">Movies</TabsTrigger>
          <TabsTrigger value="series">TV Shows</TabsTrigger>
        </TabsList>
        <Separator className="my-4" />
        <div className="mb-4 flex items-center gap-2">
          <Input
            placeholder="Optional cookies.txt absolute path (used for all downloads)"
            value={cookiesPath}
            onChange={(e) => setCookiesPath(e.target.value)}
          />
        </div>
        <TabsContent value="movies">
          {loading && movies == null ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <MediaItemList items={movies || []} cookiesPath={cookiesPath || undefined} />
          )}
        </TabsContent>
        <TabsContent value="series">
          {loading && series == null ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <MediaItemList items={series || []} cookiesPath={cookiesPath || undefined} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
