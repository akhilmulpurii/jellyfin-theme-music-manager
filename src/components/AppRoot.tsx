"use client"

import { useEffect, useState } from 'react'
import { getPaths } from '@/lib/api'
import { PathConfigurationForm } from '@/components/setup/PathConfigurationForm'
import { Dashboard } from '@/components/dashboard/Dashboard'
import type { PathConfig } from '@/types/media'

export function AppRoot() {
  const [paths, setPaths] = useState<PathConfig[] | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const p = await getPaths()
        if (!cancelled) setPaths(p)
      } catch {
        if (!cancelled) setPaths([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (paths == null) {
    return <div className="text-sm text-muted-foreground">Loading...</div>
  }

  if (!paths.length || editing) {
    // Reload paths after successful save, and exit edit mode
    return (
      <PathConfigurationForm
        initialPaths={paths.length ? paths : undefined}
        onComplete={async () => {
          try {
            const p = await getPaths()
            setPaths(p)
            setEditing(false)
          } catch {
            setPaths([])
            setEditing(false)
          }
        }}
      />
    )
  }

  return <Dashboard onEditPaths={() => setEditing(true)} />
}
