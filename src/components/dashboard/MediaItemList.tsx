"use client"

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { MovieItem } from '@/types/media'

export function MediaItemList({ items, onQueue }: { items: MovieItem[]; onQueue?: (task: { type: 'audio' | 'video'; item: MovieItem; url: string }) => void }) {
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({})
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({})
  function handleQueueVideo(item: MovieItem) {
    const url = videoUrls[item.id]
    if (!url) return toast.error('Enter a URL')
    onQueue?.({ type: 'video', item, url })
    toast.success('Queued video download')
  }

  function handleQueueAudio(item: MovieItem) {
    const url = audioUrls[item.id]
    if (!url) return toast.error('Enter a URL')
    onQueue?.({ type: 'audio', item, url })
    toast.success('Queued audio download')
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
                      <Button onClick={() => handleQueueAudio(item)}>Queue Audio</Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Paste video URL (mp4)"
                        value={videoUrls[item.id] || ''}
                        onChange={(e) => setVideoUrls((s) => ({ ...s, [item.id]: e.target.value }))}
                      />
                      <Button onClick={() => handleQueueVideo(item)}>Queue Video</Button>
                    </div>
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
