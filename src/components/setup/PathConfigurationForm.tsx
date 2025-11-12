"use client"

import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { savePaths } from '@/lib/api'
import type { PathConfig } from '@/types/media'

const PathSchema = z.object({
  path: z
    .string()
    .min(1, 'Path is required')
    .refine((v) => v.startsWith('/'), 'Path must be absolute'),
  type: z.enum(['Movie', 'Series']),
})

const PathsSchema = z
  .object({
    paths: z.array(PathSchema).min(1, 'At least one path is required'),
  })
  .refine((data) => {
    const seen = new Set<string>()
    for (const p of data.paths) {
      if (seen.has(p.path)) return false
      seen.add(p.path)
    }
    return true
  }, 'Duplicate paths are not allowed')

type PathsFormValues = z.infer<typeof PathsSchema>

export function PathConfigurationForm({ onComplete, initialPaths }: { onComplete?: () => void; initialPaths?: PathConfig[] }) {
  const form = useForm<PathsFormValues>({
    resolver: zodResolver(PathsSchema),
    defaultValues: { paths: initialPaths && initialPaths.length ? initialPaths : [{ path: '', type: 'Movie' }] },
    mode: 'onChange',
  })

  useEffect(() => {
    if (initialPaths && initialPaths.length) {
      form.reset({ paths: initialPaths })
    }
  }, [initialPaths, form])

  const { fields, append, remove } = useFieldArray({ name: 'paths', control: form.control })
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(values: PathsFormValues) {
    setSubmitting(true)
    try {
      const payload: PathConfig[] = values.paths
      await savePaths(payload)
      toast.success('Paths saved')
      onComplete?.()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save paths'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Setup</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your media library paths</p>
      </div>
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Media Paths</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Add absolute paths to your Movies and TV Shows directories</p>
        </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-12">
                  <FormField
                    control={form.control}
                    name={`paths.${index}.path`}
                    render={({ field }) => (
                      <FormItem className="sm:col-span-8">
                        <FormLabel className="text-sm font-medium">Absolute Path</FormLabel>
                        <FormControl>
                          <Input placeholder="/absolute/path/to/Movies" {...field} className="text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`paths.${index}.type`}
                    render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                        <FormLabel className="text-sm font-medium">Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Movie">Movie</SelectItem>
                            <SelectItem value="Series">Series</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="sm:col-span-1 flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="text-destructive hover:text-destructive"
                      title="Remove path"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center pt-2">
              <Button type="button" variant="outline" onClick={() => append({ path: '', type: 'Movie' })}>
                + Add Another Path
              </Button>
              <Button type="submit" disabled={!form.formState.isValid || submitting} size="lg">
                {submitting ? 'Saving...' : 'Save & Continue'}
              </Button>
            </div>
          </form>
        </Form>
        </CardContent>
      </Card>
    </div>
  )
}
