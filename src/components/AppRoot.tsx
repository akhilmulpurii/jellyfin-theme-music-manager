"use client"

import { useEffect, useState } from 'react'
import { getPaths } from '@/lib/api'
import { PathConfigurationForm } from '@/components/setup/PathConfigurationForm'
import { Dashboard } from '@/components/dashboard/Dashboard'
import type { PathConfig } from '@/types/media'

export function AppRoot() {
  const [paths, setPaths] = useState<PathConfig[] | null>(null)

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

  if (!paths.length) {
    // Reload paths after successful save
    return (
      <PathConfigurationForm
        onComplete={async () => {
          try {
            const p = await getPaths()
            setPaths(p)
          } catch {
            setPaths([])
          }
        }}
      />
    )
  }

  return <Dashboard />
}
