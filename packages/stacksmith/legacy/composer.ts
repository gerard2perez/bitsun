import type { Subprocess } from 'bun'
import { spinner } from '@g2p/cmder'
import { renderYaml } from './render-files'
import { prefixLines } from './start-process'

type Files = Record<string, object | string>

// Command	Containers	Networks	Volumes	Images
// docker compose down	✅	✅	❌	❌
// docker compose down -v	✅	✅	✅	❌
// docker compose down --rmi all	✅	✅	❌	✅
// docker compose down -v --rmi all

const start = (proc: Subprocess<'ignore', 'pipe', 'pipe'>) => {
  return Promise.all([prefixLines('[docker-compose]', proc.stdout), prefixLines('[docker-compose]', proc.stderr)]).then(
    async () => {
      const exitCode = await proc.exited
      if (exitCode !== 0) {
        throw new Error(`docker compose exited with code ${exitCode}`)
      }
    }
  )
}
const teardownDocker = () =>
  start(Bun.spawn(`docker compose -f compose.local.yaml down -v`.split(' '), { stdout: 'pipe', stderr: 'pipe' }))
const setupDocker = () =>
  start(
    Bun.spawn(`docker compose -f compose.local.yaml up -d --remove-orphans --force-recreate`.split(' '), {
      stdout: 'pipe',
      stderr: 'pipe',
    })
  )

const saveYml = (file: string, config: any) => {
  return typeof config === 'string' ? Bun.write(file, config) : Bun.write(file, renderYaml(config))
}

export function composerFactory(data: Files) {
  const files = Object.entries(data)
  return async function composerUp(dryRun: boolean) {
    await Promise.all(files.map(([filePath, content]) => saveYml(filePath, content)))

    if (!dryRun) {
      const status = spinner({}, '{{frame}|cyan} Starting Docker Compose')
      try {
        await setupDocker()
        status.done('Docker Compose started')
      } catch (error) {
        status.done('Docker Compose failed to start')
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
      for (const [filePath] of files) {
        await Bun.file(filePath).unlink().catch()
      }
    }
    return async function composerDown() {
      if (!dryRun) {
        await Promise.all(files.map(([filePath, content]) => saveYml(filePath, content)))

        const status = spinner({}, '{{frame}|cyan} Stopping Docker Compose')
        try {
          await teardownDocker()
          status.done('Docker Compose stopped')
        } catch (error) {
          status.done('Docker Compose failed to stop')
          throw error
        }

        await Promise.all(files.map(([filePath]) => Bun.file(filePath).unlink()))
      }
    }
  }
}
