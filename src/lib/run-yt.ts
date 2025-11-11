import { spawn } from 'node:child_process'

export interface RunResult {
  code: number | null
  stdout: string
  stderr: string
}

export async function runYtDlp(args: string[], opts?: { bin?: string; cwd?: string; env?: NodeJS.ProcessEnv }): Promise<RunResult> {
  const bin = opts?.bin || process.env.YTDLP_PATH || 'yt-dlp'
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      shell: false,
      cwd: opts?.cwd,
      env: { ...process.env, ...(opts?.env || {}) },
    })

    let stdout = ''
    let stderr = ''

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')

    child.stdout.on('data', (d) => {
      stdout += d
    })
    child.stderr.on('data', (d) => {
      stderr += d
    })

    child.on('error', (err) => reject(err))
    child.on('close', (code) => resolve({ code, stdout, stderr }))
  })
}
