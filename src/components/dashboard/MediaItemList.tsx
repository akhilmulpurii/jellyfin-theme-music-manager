"use client"

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import type { MovieItem } from '@/types/media'
import { downloadVideo } from '@/lib/api'

export function MediaItemList({ items }: { items: MovieItem[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [progress, setProgress] = useState<Record<string, number>>({})

  async function handleDownloadVideo(item: MovieItem) {
    const url = urls[item.id]
    if (!url) return toast.error('Enter a URL')
    try {
      setLoading((s) => ({ ...s, [item.id]: true }))
      // For MVP, we do not stream progress yet. Just call endpoint.
      const res = await downloadVideo(url, item.id, item.path)
      toast.success(res.createdBackdrops ? 'Backdrops folder created and video downloaded' : 'Video downloaded')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Download failed'
      toast.error(message)
    } finally {
      setLoading((s) => ({ ...s, [item.id]: false }))
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
            <TableHead className="w-[28%]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>
                {item.themeAudio.exists ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.themeAudio.format?.toUpperCase()}</Badge>
                    <span className="text-xs text-muted-foreground">theme.{item.themeAudio.format}</span>
                  </div>
                ) : (
                  <Badge variant="outline">Missing</Badge>
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
                    <Badge variant="outline">Missing</Badge>
                  )}
                  {!item.themeVideo.backdropsFolderExists && (
                    <Badge variant="secondary">Folder will be created</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Paste video URL"
                    value={urls[item.id] || ''}
                    onChange={(e) => setUrls((s) => ({ ...s, [item.id]: e.target.value }))}
                  />
                  <Button disabled={loading[item.id]} onClick={() => handleDownloadVideo(item)}>
                    {loading[item.id] ? 'Downloading...' : 'Download Video'}
                  </Button>
                </div>
                {loading[item.id] && (
                  <div className="mt-2">
                    <Progress value={progress[item.id] || 0} />
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
