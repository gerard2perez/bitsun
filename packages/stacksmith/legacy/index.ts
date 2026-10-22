import { useApplication } from './application'
import './terminal-color'
import { serviceExplorer } from './service-explorer'
import type { AppParameters } from './parse-args'
import { useDockerComposeFile } from './docker-compose'
import { useTraefikRouter } from './use-traefik-router'
import * as postgresConf from './infra/postgres'
import * as valkeyConf from './infra/valkey'
import * as reportsConf from './infra/reports'
import InfraService from './infra/infra-service'

export default async function runLegacy(parameters: AppParameters, apps: string[]) {
  const applications: ParsedService[] = []
  const traefikRouter = useTraefikRouter(apps.length === 0 || apps, parameters)
  const dockerComposeFile = useDockerComposeFile(traefikRouter, parameters)

  const postgres = new InfraService(postgresConf)
  const valkey = new InfraService(valkeyConf)
  const reports = new InfraService(reportsConf)

  dockerComposeFile.addInfra('postgres', postgres)
  dockerComposeFile.addInfra('valkey', valkey)

  dockerComposeFile.addInfra('reports', reports)

  for await (const service of serviceExplorer(parameters)) {
    const isLocal = apps.length === 0 || apps.includes(service.name)
    if (isLocal) {
      applications.push(service)
    }
    dockerComposeFile.addService(service)
  }

  const composerDown = await dockerComposeFile.composerUp(parameters.dryRun)

  if (!parameters.dryRun) {
    const { untilApps } = useApplication(applications)
    await untilApps(composerDown)
  }
}
