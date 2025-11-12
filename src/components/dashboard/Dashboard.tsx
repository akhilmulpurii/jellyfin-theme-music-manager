"use client"

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { MediaItemList } from './MediaItemList'
import { getMovies, getSeries } from '@/lib/api'
import type { MovieItem } from '@/types/media'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { uploadCookies } from '@/lib/api'

export function Dashboard({ onEditPaths }: { onEditPaths?: () => void }) {
  const [tab, setTab] = useState<'movies' | 'series'>('movies')
  const [movies, setMovies] = useState<MovieItem[] | null>(null)
  const [series, setSeries] = useState<MovieItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [cookiesPath, setCookiesPath] = useState<string>("")
  const [useCookiesFromBrowser, setUseCookiesFromBrowser] = useState<boolean>(false)
  const [browser, setBrowser] = useState<string>('chrome')
  const [uploading, setUploading] = useState(false)
  const [cookiesFile, setCookiesFile] = useState<File | null>(null)

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
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Optional cookies.txt absolute path (used for all downloads)"
              value={cookiesPath}
              onChange={(e) => setCookiesPath(e.target.value)}
            />
            <input
              type="file"
              accept=".txt"
              onChange={(e) => setCookiesFile(e.target.files?.[0] || null)}
            />
            <Button
              variant="outline"
              disabled={!cookiesFile || uploading}
              onClick={async () => {
                if (!cookiesFile) return
                setUploading(true)
                try {
                  const savedPath = await uploadCookies(cookiesFile)
                  setCookiesPath(savedPath)
                  toast.success('Cookies uploaded')
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Upload failed'
                  toast.error(msg)
                } finally {
                  setUploading(false)
                }
              }}
            >
              {uploading ? 'Uploading...' : 'Upload cookies.txt'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Use cookies from browser</label>
            <Select value={useCookiesFromBrowser ? 'yes' : 'no'} onValueChange={(v) => setUseCookiesFromBrowser(v === 'yes')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={browser} onValueChange={(v) => setBrowser(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Browser" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chrome">Chrome</SelectItem>
                <SelectItem value="chromium">Chromium</SelectItem>
                <SelectItem value="brave">Brave</SelectItem>
                <SelectItem value="edge">Edge</SelectItem>
                <SelectItem value="firefox">Firefox</SelectItem>
                <SelectItem value="safari">Safari</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <TabsContent value="movies">
          {loading && movies == null ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <MediaItemList
              items={movies || []}
              cookiesPath={cookiesPath || undefined}
              useCookiesFromBrowser={useCookiesFromBrowser}
              browser={browser}
            />
          )}
        </TabsContent>
        <TabsContent value="series">
          {loading && series == null ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <MediaItemList
              items={series || []}
              cookiesPath={cookiesPath || undefined}
              useCookiesFromBrowser={useCookiesFromBrowser}
              browser={browser}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
