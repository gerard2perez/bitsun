import type { Subprocess } from 'bun'
import { startProcesses } from './start-process'

type CB = () => PromiseLike<any>

export function useApplication(applications: ParsedService[]) {
  const processes = new Set<Subprocess>()
  const appProcess: Promise<void>[] = []

  let SIGINTCallback: CB | undefined
  let shutdownPromise: Promise<void> | undefined

  async function shutdown() {
    if (shutdownPromise) return shutdownPromise

    shutdownPromise = (async () => {
      console.log('Preparing to close')
      // Signal every child, not just the first one.
      for (const proc of processes) {
        try {
          proc.kill('SIGINT')
        } catch {
          // The process may already have exited.
        }
      }

      await Promise.allSettled([...processes].map(proc => proc.exited))

      await SIGINTCallback?.()
    })()

    return shutdownPromise
  }

  process.on('SIGINT', () => {
    void shutdown().catch(console.error)
  })

  for (const app of applications) {
    appProcess.push(startProcesses(app, proc => processes.add(proc)))
  }

  const untilApps = async (callback: CB) => {
    SIGINTCallback = callback

    await Promise.race(appProcess).catch(console.error)
    await shutdown()
  }

  return { untilApps }
}
