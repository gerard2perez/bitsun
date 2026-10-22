import { basename } from 'node:path'
import type { Subprocess } from 'bun'
import { getColor } from './terminal-color'

export async function prefixLines(_prefix: string, stream: ReadableStream<Uint8Array>) {
  const color = getColor()
  const prefix = color(_prefix)
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buf += decoder.decode(value, { stream: true })

    const lines = buf.split('\n')
    buf = lines.pop()!

    for (const line of lines) {
      process.stdout.write(`${prefix}${line}\n`)
    }
  }

  buf += decoder.decode()
  if (buf) process.stdout.write(`${prefix}${buf}\n`)
}
export async function startProcesses(app: ParsedService, register: (proc: Subprocess) => void) {
  const proc = Bun.spawn(['bun', '--env-file=.env', '--env-file=.env.local', 'run', 'dev'], {
    cwd: app.path,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      PORT: `${app.PORT}`,
      NODE_OPTIONS: '--use-system-ca --max-old-space-size=4096',
      BK_SERVICE: app.name,
    },
  })

  register(proc)

  const prefix = `[${basename(app.path)}] `

  await Promise.all([prefixLines(prefix, proc.stdout), prefixLines(prefix, proc.stderr), proc.exited])
}
