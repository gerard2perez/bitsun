import { deepMerge } from '../deep-merge'
import { join } from 'path'

type DockerConfigKey = string

type Configuration = {
  docker: Record<
    DockerConfigKey,
    {
      uses?: string[]
    } & Record<string, any>
  >
  _files?: Record<string, object>
  _volumes?: string[]
  env?: Record<string, string>
}

export default class InfraService {
  constructor(private configuration: Configuration) {}

  get ENV() {
    return this.configuration.env
  }

  h(segment: keyof Configuration['docker']) {
    let result = {}
    if (!this.configuration.docker[segment]) return {}
    for (const extend of this.configuration.docker[segment]!.uses ?? []) {
      const tmpConfig = this.h(extend)
      delete tmpConfig.uses
      result = deepMerge(result, tmpConfig)
    }
    const base = structuredClone(this.configuration.docker[segment]!)
    delete base.uses
    return deepMerge(result, base)
  }
  _render(segment: string, env: string) {
    const config = this.h(segment)
    if (Object.keys(config).length === 0) return undefined
    if (env) {
      config.container_name = `${config.container_name}-${env}`
    }
    return config as Service
  }
  local(env: string) {
    return this._render('local', env)
  }
  test(env: string) {
    return this._render('e2e', env)
  }
  stage(env: string) {
    return this._render('stage', env)
  }
  prod(env: string) {
    return this._render('prod', env)
  }
  files(output: string) {
    const files = Object.entries(this.configuration._files ?? {}).map(([filename, config]) => {
      return [join(output, filename), config]
    })

    return Object.fromEntries(files)
  }
  volumes() {
    return (this.configuration._volumes ?? []).map(v => [v, null])
  }
}

export class TreafikRouter extends InfraService {
  constructor(configuration: Configuration) {
    super(configuration)
  }
}
