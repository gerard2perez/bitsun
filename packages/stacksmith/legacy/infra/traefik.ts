import { getFilePath } from '../get-filename'

export function createTraefikConfig(parameters: AppParameters) {
  const docker = {
    base: {
      container_name: 'traefik',
      image: 'traefik:v3.7.15',
      restart: 'always',
      command: [
        '--api.insecure=true',
        '--providers.docker=true',
        '--providers.docker.exposedbydefault=false',
        '--log.level=INFO',
        '--accesslog=true',
        '--accesslog.format=common',

        // 1. Standard HTTP port 80 Entrypoint
        '--entrypoints.web.address=:80',
        // Note: We redirect HTTP to websecure by default.
        // Because private subdomains don't resolve publicly, users will access them via HTTPS directly.
        '--entrypoints.web.http.redirections.entrypoint.to=websecure',
        '--entrypoints.web.http.redirections.entrypoint.scheme=https',

        // 2. Public HTTPS Entrypoint (Listens on all interfaces)
        '--entrypoints.websecure.address=:443',
        // 'traefik.http.middlewares.compress.compress=true',
      ],
      ports: ['80:80', '443:443'],
      volumes: ['/var/run/docker.sock:/var/run/docker.sock:ro'],
    },

    local: {
      uses: ['base'],
      command: [`--providers.file.filename=/etc/traefik/${getFilePath('traefik-providers.yaml', parameters)}`],
      volumes: [
        `./${getFilePath('traefik-providers.yaml', parameters)}:/etc/traefik/${getFilePath('traefik-providers.yaml', parameters)}`,
        './certs:/etc/certs:ro',
      ],
    },

    stage: {
      // uses: ['base'],
      command: ['traefik.http.middlewares.netbird.ipallowlist.rejectstatuscode=404'],
      labels: ['traefik.http.middlewares.netbird.ipallowlist.sourcerange=${NETBIRD_RANGE}'],
    },

    prod: {
      uses: ['stage'],
    },

    e2e: {
      uses: ['local'],
    },
  }
  const _files = {
    [getFilePath('traefik-providers.yaml', parameters)]: {
      http: {
        middlewares: {
          compress: {
            compress: {},
          },
        },
      },
      tls: {
        certificates: [
          {
            certFile: '/etc/certs/bakery.local.pem',
            keyFile: '/etc/certs/bakery.local-key.pem',
          },
        ],
      },
    },
  }

  const env = {
    NETBIRD_RANGE: '100.112.0.0/16',
  }

  const _volumes = ['pg-data']

  return { docker, _files, env, _volumes }
}
