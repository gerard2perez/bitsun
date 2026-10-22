import { composerFactory } from './composer'
import { dockerCommons } from './docker'
import type InfraService from './infra/infra-service'
import { isRelease } from './parse-args'

const secrets = (parameters: AppParameters) =>
  ({
    prod: {
      [`db-${parameters.env}-password`]: {
        file: `/srv/secrets/bakery-${parameters.env}-secret.txt`,
      },
    },
    stage: {
      [`db-${parameters.env}-password`]: {
        file: `/srv/secrets/bakery-${parameters.env}-secret.txt`,
      },
    },
    e2e: undefined,
    local: undefined,
  })[parameters.env]

export function useDockerComposeFile(router: TraefikRouter, parameters: AppParameters) {
  const release = isRelease(parameters)
  const isProd = parameters.env === 'prod'
  const { uid, composeFile, envFilePath, composeFilePath, envFileName } = dockerCommons(parameters)
  const envVariables = router.ENV ?? {}
  Object.assign(envVariables, {
    NODE_TLS_REJECT_UNAUTHORIZED: '0',
  })
  const dockerComposeFile = composeFile({
    services: {
      ...router.getService(uid),
    },
    volumes: {},
    secrets: secrets(parameters),
    networks: {
      [uid]: {
        driver: 'bridge',
      },
    },
  })
  function addService(parsedService: ParsedService) {
    const serviceUid = `${parsedService.name}-${parameters.env}`
    const image =
      {
        prod: `ghcr.io/gerard2perez/yesjo-bakery/${parsedService.name}:latest`,
        stage: `ghcr.io/gerard2perez/yesjo-bakery/${parsedService.name}:latest`,
        e2e: undefined,
        local: undefined,
      }[parameters.env] ?? `\${${parsedService.name.toUpperCase().replaceAll('-', '_')}_IMAGE}`
    const depends_on: any = !release
      ? {
          postgres: {
            condition: 'service_healthy',
          },
          valkey: {
            condition: 'service_started',
          },
        }
      : undefined

    const env_file = release ? [envFileName, `.env.${parameters.env}`] : [envFileName]
    if (isProd) {
      env_file.unshift('.env.stage-compose')
      env_file.unshift('.env.stage')
    }

    const dockerService: Service = {
      container_name: serviceUid,
      image,
      env_file: depends_on,
      networks: [uid],
      restart: 'always',
      secrets: release ? [`db-${parameters.env}-password`] : undefined,
    }
    const service = router.addService(serviceUid, dockerService, parsedService)
    Object.assign(envVariables, parsedService.envConfig)
    if (service) {
      dockerComposeFile.services[parsedService.name] = Object.fromEntries(Object.entries(service).sort())
    }
  }
  function addInfra(name: string, infraService: InfraService) {
    // if (parameters.env !== 'e2e') return
    const service = infraService._render(parameters.env, uid)
    if (!service) return
    service.networks = [...(service.networks ?? []), uid]
    service.env_file = [envFileName]
    dockerComposeFile.services[name] = service
    Object.assign(dockerComposeFile.volumes, Object.fromEntries(infraService.volumes()))
    Object.assign(envVariables, infraService.ENV)
  }
  return {
    addService,
    addInfra,
    composerUp(dryRun: boolean) {
      const envFile = Object.entries(envVariables)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n')

      const files = {
        ...router.render(),
        [envFilePath]: envFile,
        [composeFilePath]: dockerComposeFile,
      }

      return composerFactory(files)(dryRun)
    },
  }
}
