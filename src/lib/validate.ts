import path from 'node:path'

export function isAbsolutePath(p: string): boolean {
  try {
    return path.isAbsolute(p)
  } catch {
    return false
  }
}

export function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function joinSafe(base: string, seg: string): string {
  const joined = path.join(base, seg)
  // Prevent escaping the base via .. by checking that joined starts with base when both are resolved
  const resolvedBase = path.resolve(base)
  const resolvedJoined = path.resolve(joined)
  if (!resolvedJoined.startsWith(resolvedBase)) {
    throw new Error('Path traversal detected')
  }
  return joined
}
