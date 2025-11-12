"use client"

import { useEffect, useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  const [executing, setExecuting] = useState(false)
  const [cookiesMethod, setCookiesMethod] = useState<'none' | 'path' | 'upload' | 'paste' | 'browser'>('none')
  const [cookiesPath, setCookiesPath] = useState<string>("")
  const [useCookiesFromBrowser, setUseCookiesFromBrowser] = useState<boolean>(false)
  const [browser, setBrowser] = useState<string>('chrome')
  const [uploading, setUploading] = useState(false)
  const [cookiesFile, setCookiesFile] = useState<File | null>(null)
  const [cookiesText, setCookiesText] = useState<string>("")
  const [filter, setFilter] = useState<'all' | 'missing-audio' | 'missing-video' | 'missing-any'>('all')
  const [queue, setQueue] = useState<Array<{ type: 'audio' | 'video'; item: MovieItem; url: string }>>([])
  const [removeBlackBars, setRemoveBlackBars] = useState<boolean>(false)
  const [executingLabel, setExecutingLabel] = useState<string>('')
  const [showConsole, setShowConsole] = useState(false)
  const [consoleLines, setConsoleLines] = useState<string[]>([])

  const loadMovies = useCallback(async () => {
    setLoading(true)
    try {
      const items = await getMovies()
      setMovies(items)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSeries = useCallback(async () => {
    setLoading(true)
    try {
      const items = await getSeries()
      setSeries(items)
    } finally {
      setLoading(false)
    }
  }, [])

  function enqueue(task: { type: 'audio' | 'video'; item: MovieItem; url: string }) {
    setQueue((q) => [...q, task])
  }

  function clearQueue() {
    if (executing) return
    setQueue([])
  }

  async function executeQueue() {
    if (!queue.length) return toast.info('Queue is empty')
    if (executing) return
    setExecuting(true)
    setShowConsole(true)
    setConsoleLines([])
    try {
      const useBrowser = cookiesMethod === 'browser' ? useCookiesFromBrowser : false
      const cookiesFilePath = (cookiesMethod === 'path' || cookiesMethod === 'upload' || cookiesMethod === 'paste') && cookiesPath ? cookiesPath : undefined
      for (let i = 0; i < queue.length; i++) {
        const t = queue[i]
        try {
          setExecutingLabel(
            t.type === 'video'
              ? removeBlackBars
                ? `Running YTDLP/FFMPEG on ${t.item.name}`
                : `Running YTDLP on ${t.item.name}`
              : `Running YTDLP on ${t.item.name}`
          )
          if (t.type === 'audio') {
            await streamTask('/api/download/audio/stream', {
              url: t.url,
              itemId: t.item.id,
              targetPath: t.item.path,
              cookiesFilePath,
              useCookiesFromBrowser: useBrowser,
              browser: cookiesMethod === 'browser' ? browser : undefined,
            })
            toast.success(`Audio downloaded: ${t.item.name}`)
          } else {
            await streamTask('/api/download/video/stream', {
              url: t.url,
              itemId: t.item.id,
              targetPath: t.item.path,
              cookiesFilePath,
              useCookiesFromBrowser: useBrowser,
              browser: cookiesMethod === 'browser' ? browser : undefined,
              postProcessCrop: removeBlackBars,
            })
            toast.success(`Video downloaded: ${t.item.name}`)
          }
          // Refresh current tab after each success
          if (tab === 'movies') await loadMovies()
          else await loadSeries()
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Download failed'
          toast.error(`${t.type === 'audio' ? 'Audio' : 'Video'} failed for ${t.item.name}: ${msg}`)
        }
      }
    } finally {
      setExecuting(false)
      setQueue([])
      setExecutingLabel('')
      setShowConsole(false)
      setConsoleLines([])
    }
  }

  async function streamTask(endpoint: string, payload: Record<string, unknown>): Promise<void> {
    // Consume simple SSE (text/event-stream) via fetch and a line parser.
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok || !res.body) {
      throw new Error('Failed to start streaming task')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const packet = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        // Parse event and data lines
        const lines = packet.split('\n')
        let event: string | undefined
        let data = ''
        for (const line of lines) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          else if (line.startsWith('data:')) data += (data ? '\n' : '') + line.slice(5).trim()
        }
        if (event) {
          if (event === 'log') {
            setConsoleLines((prev) => [...prev, data])
          } else if (event === 'stage') {
            setConsoleLines((prev) => [...prev, `-- ${data} --`])
          } else if (event === 'error') {
            setConsoleLines((prev) => [...prev, `ERROR: ${data}`])
          } else if (event === 'done') {
            // finalize
            try {
              const obj = JSON.parse(data)
              setConsoleLines((prev) => [...prev, `DONE: ${obj?.file?.path || ''}`])
            } catch {
              setConsoleLines((prev) => [...prev, 'DONE'])
            }
          }
        }
      }
    }
  }

  useEffect(() => {
    // load initial
    void loadMovies()
  }, [loadMovies])

  useEffect(() => {
    if (tab === 'movies' && movies == null) void loadMovies()
    if (tab === 'series' && series == null) void loadSeries()
  }, [tab, movies, series, loadMovies, loadSeries])

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
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jellyfin Theme Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage theme audio and video for your media library</p>
        </div>
        <Button variant="outline" onClick={onEditPaths}>Edit Paths</Button>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'movies' | 'series')} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="movies">Movies</TabsTrigger>
          <TabsTrigger value="series">TV Shows</TabsTrigger>
        </TabsList>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filter & Queue</CardTitle>
              <CardDescription>Filter items and manage download queue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Filter Items</label>
                <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                  <SelectTrigger>
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

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Download Queue</label>
                  <Badge variant="secondary">{queue.length} {queue.length === 1 ? 'item' : 'items'}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    variant="default" 
                    onClick={executeQueue} 
                    disabled={!queue.length || executing}
                  >
                    {executing ? 'Executing…' : 'Execute Queue'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={clearQueue} 
                    disabled={!queue.length || executing}
                  >
                    Clear
                  </Button>
                </div>
                {executingLabel && (
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md">{executingLabel}</div>
                )}
              </div>

              <Separator />

              <div className="flex items-center space-x-2">
                <input
                  id="toggle-crop"
                  type="checkbox"
                  checked={removeBlackBars}
                  onChange={(e) => setRemoveBlackBars(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="toggle-crop" className="text-sm font-medium cursor-pointer select-none">
                  Remove black bars (ffmpeg crop)
                </label>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Authentication</CardTitle>
              <CardDescription>Configure cookies for downloads requiring authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cookies Method</label>
                <Select
                  value={cookiesMethod}
                  onValueChange={(v) =>
                    setCookiesMethod(
                      (v as 'none' | 'path' | 'upload' | 'paste' | 'browser')
                    )
                  }
                >
                  <SelectTrigger>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">File Path</label>
                  <Input
                    placeholder="/path/to/cookies.txt"
                    value={cookiesPath}
                    onChange={(e) => setCookiesPath(e.target.value)}
                  />
                </div>
              )}

              {cookiesMethod === 'upload' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Upload File</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".txt"
                      onChange={(e) => setCookiesFile(e.target.files?.[0] || null)}
                      className="flex-1 text-sm"
                    />
                    <Button
                      size="sm"
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
                      {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </div>
              )}

              {cookiesMethod === 'paste' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Paste Contents</label>
                  <Textarea
                    placeholder="Paste cookies.txt contents (Netscape format)"
                    value={cookiesText}
                    onChange={(e) => setCookiesText(e.target.value)}
                    rows={4}
                  />
                  <Button
                    size="sm"
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
                    Save Cookies
                  </Button>
                </div>
              )}

              {cookiesMethod === 'browser' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Enable Browser Cookies</label>
                    <Select value={useCookiesFromBrowser ? 'yes' : 'no'} onValueChange={(v) => setUseCookiesFromBrowser(v === 'yes')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {useCookiesFromBrowser && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Browser</label>
                      <Select value={browser} onValueChange={(v) => setBrowser(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select browser" />
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
              )}
            </CardContent>
          </Card>
        </div>
        <TabsContent value="movies" className="space-y-4">
          {loading && movies == null ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">Loading movies...</div>
                </div>
              </CardContent>
            </Card>
          ) : applyFilter(movies).length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">No movies found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your filter or add media paths</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <MediaItemList
              items={applyFilter(movies)}
              onQueue={enqueue}
            />
          )}
        </TabsContent>
        <TabsContent value="series" className="space-y-4">
          {loading && series == null ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">Loading TV shows...</div>
                </div>
              </CardContent>
            </Card>
          ) : applyFilter(series).length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">No TV shows found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your filter or add media paths</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <MediaItemList
              items={applyFilter(series)}
              onQueue={enqueue}
            />
          )}
        </TabsContent>
      </Tabs>
      {showConsole && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">Download Queue Execution</CardTitle>
                  <CardDescription>
                    {executingLabel || 'Processing queue...'}
                  </CardDescription>
                </div>
                <Badge variant={executing ? 'default' : 'secondary'} className="ml-4">
                  {executing ? 'Running' : 'Complete'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col pb-4">
              <div 
                className="flex-1 overflow-auto rounded-md bg-slate-950 dark:bg-slate-900 p-4 font-mono text-xs text-slate-50 space-y-0.5"
                style={{ scrollBehavior: 'smooth' }}
                ref={(el) => {
                  if (el && consoleLines.length > 0) {
                    el.scrollTop = el.scrollHeight
                  }
                }}
              >
                {consoleLines.length === 0 ? (
                  <div className="text-slate-400">Waiting for output...</div>
                ) : (
                  consoleLines.map((l, i) => (
                    <div 
                      key={i} 
                      className={l.startsWith('ERROR:') ? 'text-red-400' : l.startsWith('--') ? 'text-cyan-400 font-semibold' : l.startsWith('DONE:') ? 'text-green-400' : 'text-slate-300'}
                    >
                      {l}
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{queue.length} {queue.length === 1 ? 'item' : 'items'} in queue</span>
                <span>This window will close automatically when finished</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
