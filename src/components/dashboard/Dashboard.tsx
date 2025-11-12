"use client"

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { MediaItemList } from './MediaItemList'
import { getMovies, getSeries } from '@/lib/api'
import type { MovieItem } from '@/types/media'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { uploadCookies, uploadCookiesText } from '@/lib/api'

export function Dashboard({ onEditPaths }: { onEditPaths?: () => void }) {
  const [tab, setTab] = useState<'movies' | 'series'>('movies')
  const [movies, setMovies] = useState<MovieItem[] | null>(null)
  const [series, setSeries] = useState<MovieItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [cookiesMethod, setCookiesMethod] = useState<'none' | 'path' | 'upload' | 'paste' | 'browser'>('none')
  const [cookiesPath, setCookiesPath] = useState<string>("")
  const [useCookiesFromBrowser, setUseCookiesFromBrowser] = useState<boolean>(false)
  const [browser, setBrowser] = useState<string>('chrome')
  const [uploading, setUploading] = useState(false)
  const [cookiesFile, setCookiesFile] = useState<File | null>(null)
  const [cookiesText, setCookiesText] = useState<string>("")
  const [filter, setFilter] = useState<'all' | 'missing-audio' | 'missing-video' | 'missing-any'>('all')

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

  function applyFilter(items: MovieItem[] | null): MovieItem[] {
    if (!items) return []
    switch (filter) {
      case 'missing-audio':
        return items.filter((i) => !i.themeAudio.exists)
      case 'missing-video':
        return items.filter((i) => !i.themeVideo.exists)
      case 'missing-any':
        return items.filter((i) => !i.themeAudio.exists || !i.themeVideo.exists)
      case 'all':
      default:
        return items
    }
  }

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
            <label className="text-sm">Filter</label>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All items</SelectItem>
                <SelectItem value="missing-any">Missing audio or video</SelectItem>
                <SelectItem value="missing-audio">Missing theme audio</SelectItem>
                <SelectItem value="missing-video">Missing theme video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Cookies method</label>
            <Select
              value={cookiesMethod}
              onValueChange={(v) =>
                setCookiesMethod(
                  (v as 'none' | 'path' | 'upload' | 'paste' | 'browser')
                )
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="path">Absolute path</SelectItem>
                <SelectItem value="upload">Upload file</SelectItem>
                <SelectItem value="paste">Paste contents</SelectItem>
                <SelectItem value="browser">From browser</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {cookiesMethod === 'path' && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="cookies.txt absolute path"
                value={cookiesPath}
                onChange={(e) => setCookiesPath(e.target.value)}
              />
            </div>
          )}

          {cookiesMethod === 'upload' && (
            <div className="flex items-center gap-2">
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
          )}

          {cookiesMethod === 'paste' && (
            <div className="flex flex-col gap-2">
              <Textarea
                placeholder="Paste cookies.txt contents (Netscape format)"
                value={cookiesText}
                onChange={(e) => setCookiesText(e.target.value)}
              />
              <div>
                <Button
                  variant="outline"
                  disabled={!cookiesText.trim()}
                  onClick={async () => {
                    try {
                      const savedPath = await uploadCookiesText(cookiesText)
                      setCookiesPath(savedPath)
                      toast.success('Cookies saved')
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : 'Save failed'
                      toast.error(msg)
                    }
                  }}
                >
                  Save cookies text
                </Button>
              </div>
            </div>
          )}

          {cookiesMethod === 'browser' && (
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
          )}
        </div>
        <TabsContent value="movies">
          {loading && movies == null ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <MediaItemList
              items={applyFilter(movies)}
              cookiesPath={cookiesMethod === 'path' || cookiesMethod === 'upload' || cookiesMethod === 'paste' ? (cookiesPath || undefined) : undefined}
              useCookiesFromBrowser={cookiesMethod === 'browser' ? useCookiesFromBrowser : false}
              browser={cookiesMethod === 'browser' ? browser : undefined}
              onRefresh={loadMovies}
            />
          )}
        </TabsContent>
        <TabsContent value="series">
          {loading && series == null ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <MediaItemList
              items={applyFilter(series)}
              cookiesPath={cookiesMethod === 'path' || cookiesMethod === 'upload' || cookiesMethod === 'paste' ? (cookiesPath || undefined) : undefined}
              useCookiesFromBrowser={cookiesMethod === 'browser' ? useCookiesFromBrowser : false}
              browser={cookiesMethod === 'browser' ? browser : undefined}
              onRefresh={loadSeries}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
