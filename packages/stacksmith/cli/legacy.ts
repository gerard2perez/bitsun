import { tag } from '@g2p/cmder'
import type { AppParameters } from '../legacy/parse-args'
import runLegacy from '../legacy/index'

const name: string = tag('name', 'n', 'Compose project name') ?? ''
const dryRun: string = tag('dryRun', 'd', 'Skip Docker Compose; pass true or false') ?? ''
const env: string = tag('env', 'e', 'Environment: local, stage, prod, or e2e') ?? 'local'
const remoteDomain: string = tag('remoteDomain', 'r', 'Remote service domain') ?? '${STAGE_DOMAIN}'
const localDomain: string = tag('localDomain', 'l', 'Local service domain') ?? '${DOMAIN}'
const output: string = tag('output', 'o', 'Set the directory for generated files') ?? './bin'
const app: string[] = tag('app', 'a', 'App services to run locally (repeatable)') ?? []

function isEnvironment(value: string): value is AppParameters['env'] {
  return ['local', 'stage', 'prod', 'e2e'].includes(value)
}

export default async function legacyCommand() {
  if (!isEnvironment(env)) {
    throw new Error(`Invalid environment "${env}". Expected local, stage, prod, or e2e.`)
  }

  const parameters: AppParameters = {
    name: name || undefined,
    dryRun:
      dryRun.toLowerCase() === 'true' ||
      dryRun === '1' ||
      process.argv.slice(2).some(argument => argument === '-d' || argument === '--dryRun'),
    env,
    remoteDomain,
    localDomain,
    output,
  }

  await runLegacy(parameters, app)
}
