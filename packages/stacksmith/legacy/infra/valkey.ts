export const docker = {
  base: {
    container_name: 'valkey',
    image: 'valkey/valkey:latest',
    restart: 'unless-stopped',
    volumes: ['valkey-data:/data'],
    ports: ['6379:6379'],
    networks: [],
  },
  local: {
    uses: ['base'],
  },
  stage: {
    // uses: ['base'],
    // networks: ['shared-network'],
  },
  prod: {
    uses: ['stage'],
  },
  e2e: {
    uses: ['local'],
  },
}

export const _volumes = ['valkey-data']

export const env = {
  REDIS_HOST: 'valkey',
  REDIS_PORT: '6379',
}
