"use client"

import { useState } from 'react'
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

export function PathConfigurationForm({ onComplete }: { onComplete?: () => void }) {
  const form = useForm<PathsFormValues>({
    resolver: zodResolver(PathsSchema),
    defaultValues: { paths: [{ path: '', type: 'Movie' }] },
    mode: 'onChange',
  })

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
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Configure Media Paths</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-md border p-4">
                <div className="grid gap-4 sm:grid-cols-12">
                  <FormField
                    control={form.control}
                    name={`paths.${index}.path`}
                    render={({ field }) => (
                      <FormItem className="sm:col-span-8">
                        <FormLabel>Absolute Path</FormLabel>
                        <FormControl>
                          <Input placeholder="/path/to/Movies" {...field} />
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
                        <FormLabel>Type</FormLabel>
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
                      variant="destructive"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="w-full"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center">
              <Button type="button" variant="outline" onClick={() => append({ path: '', type: 'Movie' })}>
                Add Path
              </Button>
              <Button type="submit" disabled={!form.formState.isValid || submitting}>
                {submitting ? 'Saving...' : 'Next'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
