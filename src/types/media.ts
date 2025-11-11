export type LibraryType = 'Movie' | 'Series'

export interface PathConfig {
  path: string
  type: LibraryType
}

export interface ThemeStatus {
  exists: boolean
  path?: string
  format?: string
}

export interface MovieItem {
  id: string
  name: string
  path: string
  themeAudio: ThemeStatus
  themeVideo: ThemeStatus & { backdropsFolderExists: boolean }
}
