"use client"

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import type { MovieItem } from '@/types/media'
import { downloadAudio, downloadVideo } from '@/lib/api'

export function MediaItemList({ items }: { items: MovieItem[] }) {
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({})
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({})
  const [loadingAudio, setLoadingAudio] = useState<Record<string, boolean>>({})
  const [loadingVideo, setLoadingVideo] = useState<Record<string, boolean>>({})
  const [progress, setProgress] = useState<Record<string, number>>({})

  async function handleDownloadVideo(item: MovieItem) {
    const url = videoUrls[item.id]
    if (!url) return toast.error('Enter a URL')
    try {
      setLoadingVideo((s) => ({ ...s, [item.id]: true }))
      // For MVP, we do not stream progress yet. Just call endpoint.
      const res = await downloadVideo(url, item.id, item.path)
      toast.success(res.createdBackdrops ? 'Backdrops folder created and video downloaded' : 'Video downloaded')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Download failed'
      toast.error(message)
    } finally {
      setLoadingVideo((s) => ({ ...s, [item.id]: false }))
      setProgress((s) => ({ ...s, [item.id]: 0 }))
    }
  }

  async function handleDownloadAudio(item: MovieItem) {
    const url = audioUrls[item.id]
    if (!url) return toast.error('Enter a URL')
    try {
      setLoadingAudio((s) => ({ ...s, [item.id]: true }))
      await downloadAudio(url, item.id, item.path)
      toast.success('Audio downloaded')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Download failed'
      toast.error(message)
    } finally {
      setLoadingAudio((s) => ({ ...s, [item.id]: false }))
      setProgress((s) => ({ ...s, [item.id]: 0 }))
    }
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Name</TableHead>
            <TableHead>Theme Audio</TableHead>
            <TableHead>Theme Video</TableHead>
            <TableHead className="w-[36%]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const missingAudio = !item.themeAudio.exists
            const missingVideo = !item.themeVideo.exists
            const rowMissing = missingAudio || missingVideo
            return (
              <TableRow key={item.id} className={rowMissing ? 'bg-red-50/40 dark:bg-red-950/20' : undefined}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                {item.themeAudio.exists ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.themeAudio.format?.toUpperCase()}</Badge>
                    <span className="text-xs text-muted-foreground">theme.{item.themeAudio.format}</span>
                  </div>
                ) : (
                  <Badge variant="destructive">Missing</Badge>
                )}
                </TableCell>
                <TableCell>
                <div className="flex items-center gap-2">
                  {item.themeVideo.exists ? (
                    <>
                      <Badge variant="secondary">{item.themeVideo.format?.toUpperCase()}</Badge>
                      <span className="text-xs text-muted-foreground">backdrops/theme.{item.themeVideo.format}</span>
                    </>
                  ) : (
                    <Badge variant="destructive">Missing</Badge>
                  )}
                  {!item.themeVideo.backdropsFolderExists && (
                    <Badge variant="secondary">Folder will be created</Badge>
                  )}
                </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Paste audio URL (mp3)"
                        value={audioUrls[item.id] || ''}
                        onChange={(e) => setAudioUrls((s) => ({ ...s, [item.id]: e.target.value }))}
                      />
                      <Button disabled={loadingAudio[item.id]} onClick={() => handleDownloadAudio(item)}>
                        {loadingAudio[item.id] ? 'Downloading...' : 'Download Audio'}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Paste video URL (mp4)"
                        value={videoUrls[item.id] || ''}
                        onChange={(e) => setVideoUrls((s) => ({ ...s, [item.id]: e.target.value }))}
                      />
                      <Button disabled={loadingVideo[item.id]} onClick={() => handleDownloadVideo(item)}>
                        {loadingVideo[item.id] ? 'Downloading...' : 'Download Video'}
                      </Button>
                    </div>
                    {(loadingAudio[item.id] || loadingVideo[item.id]) && (
                      <div className="mt-2">
                        <Progress value={progress[item.id] || 0} />
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
