import { isRelease, isStage } from './parse-args'
import { createTraefikConfig } from './infra/traefik'
import InfraService from './infra/infra-service'
import { getFilePath } from './get-filename'

declare global {
  interface TraefikService {
    loadBalancer: {
      passHostHeader: boolean
      servers: { url: string }[]
    }
  }
  type TraefikRouter = ReturnType<typeof useTraefikRouter>
}

export function useTraefikRouter(localServices: string[] | true, parameters: AppParameters) {
  const isReleaseEnv = isRelease(parameters)
  const stage = isStage(parameters)
  const traefik = new InfraService(createTraefikConfig(parameters))
  let isEmpty = true
  const providerFile: {
    tls: {
      certificates: { certFile: string; keyFile: string }[]
    }
    http: {
      middlewares: {
        compression: { compress: Record<string, never> }
      }
      routers?: Record<string, Router>
      services?: Record<string, TraefikService>
    }
  } = {
    tls: {
      certificates: [
        {
          certFile: '/etc/certs/bakery.local.pem',
          keyFile: '/etc/certs/bakery.local-key.pem',
        },
      ],
    },
    http: {
      middlewares: {
        compression: {
          compress: {},
        },
      },
      routers: {},
      services: {},
    },
  }
  const isLocal = (service: string) => localServices === true || localServices.includes(service)

  function addService(uid: string, dockerService: Service, parsedService: ParsedService): Service | undefined {
    if (!['stage', 'prod', 'local'].includes(parameters.env)) {
      isEmpty = false
      delete providerFile.http.services
    }
    if (parameters.env === 'e2e') {
      isEmpty = false
      delete providerFile.http.routers
    }
    if (parameters.env === 'local') {
      isEmpty = false
      // We need to create the service as provider file
      const serveLocally = isLocal(parsedService.name)
      providerFile.http.routers![parsedService.name] = {
        rule: parsedService.rules.join(' && '),
        priority: parsedService.priority,
        entryPoints: ['websecure'],
        service: parsedService.name,
        tls: {},
        middlewares: ['compression'],
      }

      providerFile.http.services![parsedService.name] = {
        loadBalancer: {
          passHostHeader: serveLocally,
          servers: [
            {
              url: serveLocally
                ? `http://host.docker.internal:${parsedService.PORT}`
                : `https://${parameters.remoteDomain}`,
            },
          ],
        },
      }
    } else {
      const baseLabels = [
        'traefik.enable=true',
        `traefik.http.routers.${uid}.rule=${parsedService.rules.join(' && ')}`,
        `traefik.http.routers.${uid}.priority=${parsedService.priority}`,
        `traefik.http.routers.${uid}.entrypoints=websecure`,
        `traefik.http.services.${uid}.loadbalancer.server.port=3000`,
      ]
      const nonRelease = [
        `traefik.http.routers.${uid}.service=${uid}`,
        `traefik.http.routers.${uid}.tls=true`,
        `traefik.http.routers.${uid}.middlewares=compression@file`,
      ]
      const releaseLabels = [
        'com.centurylinklabs.watchtower.enable=true',
        `traefik.http.routers.${uid}.tls.certresolver=letsencryptResolver`,
        stage
          ? `traefik.http.routers.${uid}.middlewares=compression,netbird`
          : `traefik.http.routers.${uid}.middlewares=compression`,
      ]
      // Enhance labels
      return {
        ...dockerService,
        labels: [
          ...baseLabels,
          ...(isReleaseEnv ? releaseLabels : nonRelease),
          // `traefik.http.services.${uid}.loadbalancer.server.port=3000`,
        ].sort(),
      }
    }
  }

  return {
    getService(uid: string) {
      if (['stage', 'prod'].includes(parameters.env)) return {}

      const traefikService = traefik._render(parameters.env, uid)
      traefikService.networks = {
        [uid]: {
          aliases: [parameters.localDomain],
        },
      }
      return { traefik: traefikService }
    },
    ENV: traefik.ENV,
    addService,
    render() {
      if (!isEmpty) {
        return {
          [getFilePath('traefik-providers.yaml', parameters)]: providerFile,
        }
      }
    },
  }
}
