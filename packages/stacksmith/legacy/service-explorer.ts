import { Glob } from 'bun'
import { dirname, resolve, join } from 'path'
import { loadFile } from './loadFile'

const glob = new Glob(`./packages/**/service.yaml`)
export const resolvePath = (file: string) => resolve(process.cwd(), file)
declare global {
  interface ParsedService {
    name: string
    priority: number
    rules: string[]
    PORT: number
    dockerCompose?: any
    dockerFile?: string
    envConfig?: Record<string, string>
    path: string
    _self_prod?: any
    _self_stage?: any
  }
  interface Router {
    rule: string | string[]
    entryPoints: string[]
    middlewares: string[]
    priority?: number
    tls?: object
    service: string
  }
}

export async function* serviceExplorer(parameters: AppParameters) {
  let CURRENT_PORT = 4000
  for await (const file of glob.scan('.')) {
    const { name: serviceName, proxy = [], priority = 10, disable } = await loadFile(file)
    if (disable) continue

    const rules: string[] =
      proxy?.map((rPath: string) =>
        !rPath.includes('^') ? `PathPrefix(\`${rPath}\`)` : `!PathPrefix(\`${rPath.substring(1)}\`)`
      ) ?? []
    rules.unshift('Host(`' + parameters.localDomain + '`)')
    const dockerComposeFile = resolve(dirname(file), 'docker-compose.yaml')
    const dockerCompose = await loadFile(dockerComposeFile).catch(() => null)
    const packagePath = (filename: string) => resolve(dirname(file), filename)
    const baseEnv = await loadFile(packagePath('.env'))
    const envEnv = await loadFile(packagePath(`.env.${parameters.env}`))
    const envConfig: Record<string, string> = Object.assign(baseEnv, envEnv)
    const { _self_prod, _self_stage, ...services } = dockerCompose?.services ?? {}
    const PORT = Number(envConfig.PORT) || CURRENT_PORT++
    delete envConfig.PORT
    yield {
      name: serviceName,
      priority,
      rules,
      PORT,
      _self_prod,
      _self_stage,
      dockerCompose: {
        ...dockerCompose,
        services,
      },
      envConfig,
      dockerFile: dockerCompose ? join(dirname(file), 'docker-compose.yaml') : undefined,
      path: resolve(dirname(file)),
    } as ParsedService
  }
}
