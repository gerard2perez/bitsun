export type AppParameters = {
  name?: string
  dryRun: boolean
  env: 'stage' | 'local' | 'e2e' | 'prod'
  remoteDomain: string
  localDomain: string
  output: string
}

declare global {
  type AppParameters = import('./parse-args').AppParameters
}

export function isRelease(parameters: AppParameters) {
  return ['stage', 'prod'].includes(parameters.env)
}

export function isStage(parameters: AppParameters) {
  return parameters.env === 'stage'
}
