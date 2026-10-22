import * as Bun from 'bun'
import { resolvePath } from './service-explorer'
import { resolve } from 'node:path'

export const loadFile = async (file: string) => {
  try {
    if (file.includes('.env')) {
      return Object.fromEntries(
        (await Bun.file(resolve(import.meta.dir, file)).text())
          .split(/\r?\n/)
          .filter(line => line.trim() && !line.trim().startsWith('#'))
          .map(line => {
            const index = line.indexOf('=')

            return [line.slice(0, index).trim(), line.slice(index + 1).trim()]
          })
          .filter(([key]) => key)
      )
    } else if (file.includes('yaml')) {
      return import.meta.require(resolvePath(file))
    } else if (file.includes('.json')) {
      return import(resolvePath(file))
    }
    const content = await Bun.file(resolvePath(file)).text()
    const env = Object.fromEntries(
      content
        .split(/\r?\n/)
        .filter(line => line.trim() && !line.trim().startsWith('#'))
        .map(line => {
          const index = line.indexOf('=')
          const key = line.slice(0, index).trim()
          let value = line.slice(index + 1).trim()

          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }

          return [key, value]
        })
    )
    return env
  } catch (error) {
    // console.log({ error })
    return {}
  }
}
